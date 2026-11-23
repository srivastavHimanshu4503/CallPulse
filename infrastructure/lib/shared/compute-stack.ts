import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { BaseStackProps, Stage } from "../common-constructs/types";

export interface ComputeStackProps extends BaseStackProps {
  vpc: ec2.IVpc;
  securityGroup?: ec2.ISecurityGroup;
  recordingsBucketArn: string;
  queueUrls: {
    callProcessing: string;
    workflowJobs: string;
    typesenseSync: string;
  };
}

export class ComputeStack extends cdk.Stack {
  public readonly cluster: ecs.Cluster;
  public readonly fargateService: ecs_patterns.ApplicationLoadBalancedFargateService;

  constructor(scope: Construct, id: string, props: ComputeStackProps) {
    super(scope, id, props);

    const env = props.deployEnv;
    const isProd = env === Stage.prod;

    // 1. ECS Cluster
    this.cluster = new ecs.Cluster(this, "EcsCluster", {
      vpc: props.vpc,
      clusterName: `indiai-${env}-cluster`,
      containerInsightsV2: isProd ? ecs.ContainerInsights.ENABLED : ecs.ContainerInsights.DISABLED,
    });

    // 2. Intra-stack Security Groups (prevents cross-stack dependency cycles)
    const albSecurityGroup = new ec2.SecurityGroup(this, "AlbSecurityGroup", {
      vpc: props.vpc,
      description: "Security group for Antigravity Public Application Load Balancer",
      allowAllOutbound: true,
    });
    albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), "Allow HTTP");
    albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), "Allow HTTPS");

    const taskSecurityGroup = new ec2.SecurityGroup(this, "TaskSecurityGroup", {
      vpc: props.vpc,
      description: "Security group for Antigravity Fargate task instances",
      allowAllOutbound: true,
    });
    taskSecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.tcp(4000),
      "Allow inbound from Application Load Balancer only",
    );

    // 3. IAM Roles
    const executionRole = new iam.Role(this, "FargateExecutionRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      description: "Execution role for Fargate tasks pulling images and writing logs",
    });

    executionRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AmazonECSTaskExecutionRolePolicy"),
    );

    const taskRole = new iam.Role(this, "FargateTaskRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      description: "Task role granting runtime access to S3, SQS, SSM, and SecretsManager",
    });

    taskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["s3:PutObject", "s3:GetObject", "s3:ListBucket"],
        resources: [props.recordingsBucketArn, `${props.recordingsBucketArn}/*`],
      }),
    );

    taskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:SendMessage",
          "sqs:GetQueueAttributes",
        ],
        resources: [`arn:aws:sqs:${this.region}:${this.account}:indiai-${env}-*`],
      }),
    );

    taskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["ssm:GetParameter", "ssm:GetParameters", "ssm:GetParametersByPath"],
        resources: [`arn:aws:ssm:${this.region}:${this.account}:parameter/indiai/*`],
      }),
    );

    taskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["secretsmanager:GetSecretValue"],
        resources: [`arn:aws:secretsmanager:*:${this.account}:secret:indiai/*`],
      }),
    );

    taskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["cloudwatch:PutMetricData"],
        resources: ["*"],
      }),
    );

    // 4. CloudWatch Log Group
    const logGroup = new logs.LogGroup(this, "VoiceServiceLogs", {
      logGroupName: `/ecs/indiai-${env}-voice-service`,
      retention: isProd ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // 5. Application Load Balanced Fargate Service
    this.fargateService = new ecs_patterns.ApplicationLoadBalancedFargateService(
      this,
      "FargateService",
      {
        cluster: this.cluster,
        serviceName: `indiai-${env}-voice-api`,
        cpu: isProd ? 1024 : 512,
        memoryLimitMiB: isProd ? 2048 : 1024,
        desiredCount: isProd ? 2 : 1,
        assignPublicIp: true,
        taskSubnets: { subnetType: ec2.SubnetType.PUBLIC },
        securityGroups: [taskSecurityGroup],
        taskImageOptions: {
          image: ecs.ContainerImage.fromRegistry(
            "public.ecr.aws/ecs-sample-image/amazon-ecs-sample:latest",
          ),
          containerPort: 4000,
          executionRole,
          taskRole,
          logDriver: ecs.LogDrivers.awsLogs({
            logGroup,
            streamPrefix: "app",
          }),
          environment: {
            NODE_ENV: env,
            DEPLOY_ENV: env,
            AWS_REGION: this.region,
            CALL_PROCESSING_QUEUE_URL: props.queueUrls.callProcessing,
            WORKFLOW_JOBS_QUEUE_URL: props.queueUrls.workflowJobs,
            TYPESENSE_SYNC_QUEUE_URL: props.queueUrls.typesenseSync,
          },
        },
        publicLoadBalancer: true,
      },
    );

    // Health check on API
    this.fargateService.targetGroup.configureHealthCheck({
      path: "/api/v1/health",
      interval: cdk.Duration.seconds(30),
      timeout: cdk.Duration.seconds(5),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 3,
    });

    // 6. Horizontal Auto Scaling for Voice & API Traffic Spikes
    const scalableTarget = this.fargateService.service.autoScaleTaskCount({
      minCapacity: isProd ? 2 : 1,
      maxCapacity: isProd ? 20 : 5,
    });

    scalableTarget.scaleOnCpuUtilization("CpuAutoScaling", {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(120),
      scaleOutCooldown: cdk.Duration.seconds(30),
    });

    scalableTarget.scaleOnMemoryUtilization("MemoryAutoScaling", {
      targetUtilizationPercent: 80,
      scaleInCooldown: cdk.Duration.seconds(120),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    scalableTarget.scaleOnRequestCount("RequestCountAutoScaling", {
      requestsPerTarget: 500,
      targetGroup: this.fargateService.targetGroup,
      scaleInCooldown: cdk.Duration.seconds(120),
      scaleOutCooldown: cdk.Duration.seconds(30),
    });

    // 7. Alarms & Outputs
    new cloudwatch.Alarm(this, "ServiceCpuHighAlarm", {
      alarmName: `indiai-${env}-fargate-cpu-alarm`,
      alarmDescription: "Alerts when ECS Fargate CPU exceeds 85% for 3 evaluation periods",
      metric: this.fargateService.service.metricCpuUtilization({
        period: cdk.Duration.minutes(1),
        statistic: "Average",
      }),
      threshold: 85,
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    new ssm.StringParameter(this, "EcsClusterNameParameter", {
      parameterName: `/indiai/${env}/ecs-cluster-name`,
      stringValue: this.cluster.clusterName,
      description: "Name of the Antigravity ECS cluster",
    });

    new ssm.StringParameter(this, "EcsServiceNameParameter", {
      parameterName: `/indiai/${env}/ecs-service-name`,
      stringValue: this.fargateService.service.serviceName,
      description: "Name of the Antigravity ECS Fargate service",
    });

    new cdk.CfnOutput(this, "ClusterNameOutput", {
      value: this.cluster.clusterName,
      exportName: `indiai-${env}-ClusterName`,
      description: "Name of the ECS Cluster",
    });

    new cdk.CfnOutput(this, "ServiceNameOutput", {
      value: this.fargateService.service.serviceName,
      exportName: `indiai-${env}-ServiceName`,
      description: "Name of the ECS Fargate Service",
    });

    new cdk.CfnOutput(this, "LoadBalancerDnsOutput", {
      value: this.fargateService.loadBalancer.loadBalancerDnsName,
      exportName: `indiai-${env}-LoadBalancerDns`,
      description: "Public DNS name of the Application Load Balancer",
    });
  }
}
