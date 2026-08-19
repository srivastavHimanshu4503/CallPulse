import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import { Construct } from "constructs";
import { BaseStackProps } from "../common-constructs/types";

export interface ComputeStackProps extends BaseStackProps {
  vpc: ec2.IVpc;
  securityGroup: ec2.ISecurityGroup;
  recordingsBucketArn: string;
  queueUrls: {
    callProcessing: string;
    workflowJobs: string;
    typesenseSync: string;
  };
}

export class ComputeStack extends cdk.Stack {
  public readonly instance: ec2.Instance;

  constructor(scope: Construct, id: string, props: ComputeStackProps) {
    super(scope, id, props);

    const env = props.deployEnv;

    const role = new iam.Role(this, "InstanceRole", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      description: "IAM Role for Antigravity EC2 instance",
    });

    role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"),
    );

    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ["s3:PutObject", "s3:GetObject"],
        resources: [props.recordingsBucketArn, `${props.recordingsBucketArn}/*`],
      }),
    );

    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:SendMessage"],
        resources: [`arn:aws:sqs:${this.region}:${this.account}:indiai-${env}-*`],
      }),
    );

    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ["ssm:GetParameter"],
        resources: [`arn:aws:ssm:${this.region}:${this.account}:parameter/indiai/*`],
      }),
    );

    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ["secretsmanager:GetSecretValue"],
        resources: [
          // Any region: env secrets live in ap-south-1, github-token in us-east-1
          `arn:aws:secretsmanager:*:${this.account}:secret:indiai/*`,
        ],
      }),
    );

    // Deploys pull prebuilt images from ECR instead of building on the box
    // (t3.small cannot build these images).
    role.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "ecr:GetAuthorizationToken",
          "ecr:BatchGetImage",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchCheckLayerAvailability",
        ],
        resources: ["*"],
      }),
    );

    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ["cloudwatch:PutMetricData", "logs:PutLogEvents", "logs:CreateLogStream"],
        resources: ["*"],
      }),
    );

    const instanceType = ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL);

    this.instance = new ec2.Instance(this, "ServerInstance", {
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroup: props.securityGroup,
      instanceType,
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      role,
      blockDevices: [
        {
          deviceName: "/dev/xvda",
          volume: ec2.BlockDeviceVolume.ebs(30, {
            encrypted: true,
            volumeType: ec2.EbsDeviceVolumeType.GP3,
          }),
        },
      ],
    });

    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      "dnf update -y",
      "dnf install -y git",
      "dnf install -y docker",
      "systemctl enable --now docker",
      "usermod -aG docker ec2-user",
      "mkdir -p /usr/local/lib/docker/cli-plugins",
      "curl -SL https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-linux-x86_64 -o /usr/local/lib/docker/cli-plugins/docker-compose",
      "chmod +x /usr/local/lib/docker/cli-plugins/docker-compose",
      "fnm_installed=$(which fnm 2>/dev/null)",
      "curl -fsSL https://fnm.vercel.app/install | bash",
      'export PATH="/root/.local/share/fnm:$PATH"',
      'eval "$(fnm env --use-on-cd)"',
      "fnm install 20",
      "npm install -g pnpm",
      "mkdir -p /app",
      "cd /app",
      // Private repo: authenticate via a credential helper that fetches the
      // token from Secrets Manager at pull time (never persisted to disk).
      `git config --global credential.helper '!f() { echo "username=x-access-token"; echo "password=$(aws secretsmanager get-secret-value --secret-id indiai/github-token --region us-east-1 --query SecretString --output text)"; }; f'`,
      "git clone https://github.com/yogendraft21/IndiAi.git indiAi || true",
      "cd indiAi",
      "echo 'UserData initial setup done! Ready for pipeline commands.' > /var/log/userdata_antigravity.log",
    );
    this.instance.addUserData(userData.render());

    // Per-env name: dev and prod stacks live in the same account/region, so a
    // shared name would collide on the second deploy.
    new ssm.StringParameter(this, "Ec2InstanceIdParameter", {
      parameterName: `/indiai/${env}/ec2-instance-id`,
      stringValue: this.instance.instanceId,
      description: "Instance ID of the active Antigravity EC2 application node",
    });

    new cloudwatch.Alarm(this, "CpuUtilizationAlarm", {
      alarmName: `indiai-${env}-ec2-cpu-alarm`,
      alarmDescription: "Alerts when CPU utilization exceeds 80% for 5 consecutive minutes",
      metric: new cloudwatch.Metric({
        namespace: "AWS/EC2",
        metricName: "CPUUtilization",
        dimensionsMap: { InstanceId: this.instance.instanceId },
        period: cdk.Duration.minutes(5),
        statistic: "Average",
      }),
      threshold: 80,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    new cdk.CfnOutput(this, "InstanceIdOutput", {
      value: this.instance.instanceId,
      exportName: `indiai-${env}-InstanceId`,
      description: "Physical ID of the EC2 instance node",
    });

    new cdk.CfnOutput(this, "PublicIpOutput", {
      value: this.instance.instancePublicIp,
      exportName: `indiai-${env}-PublicIp`,
      description: "Public IP address of the EC2 instance node",
    });

    new cdk.CfnOutput(this, "SSMConnectCommandOutput", {
      value: `aws ssm start-session --target ${this.instance.instanceId}`,
      exportName: `indiai-${env}-SSMConnectCommand`,
      description: "SSM Connect CLI Command for command-line access",
    });
  }
}
