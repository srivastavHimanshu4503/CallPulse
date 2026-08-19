import * as cdk from "aws-cdk-lib";
import * as logs from "aws-cdk-lib/aws-logs";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as sns from "aws-cdk-lib/aws-sns";
import { Construct } from "constructs";
import { BaseStackProps } from "../common-constructs/types";

export class MonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: BaseStackProps) {
    super(scope, id, props);

    const env = props.deployEnv;

    new logs.LogGroup(this, "ApiLogGroup", {
      logGroupName: `/indiai/${env}/api`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    new logs.LogGroup(this, "WorkerLogGroup", {
      logGroupName: `/indiai/${env}/worker`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const dlqNames = [
      `indiai-${env}-crm-typesense-sync-dlq`,
      `indiai-${env}-voice-call-processing-dlq`,
      `indiai-${env}-workflow-jobs-dlq`,
    ];

    dlqNames.forEach((dlqName) => {
      const metric = new cloudwatch.Metric({
        namespace: "AWS/SQS",
        metricName: "ApproximateNumberOfMessagesVisible",
        dimensionsMap: { QueueName: dlqName },
        period: cdk.Duration.minutes(1),
        statistic: "Sum",
      });

      new cloudwatch.Alarm(this, `Alarm-${dlqName}`, {
        alarmName: `indiai-${env}-${dlqName}-messages-alarm`,
        metric,
        threshold: 0,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
    });

    if (this.region === "us-east-1") {
      const billingTopic = new sns.Topic(this, "BillingAlertsTopic", {
        topicName: "indiai-billing-alerts",
      });

      const billingMetric = new cloudwatch.Metric({
        namespace: "AWS/Billing",
        metricName: "EstimatedCharges",
        dimensionsMap: { Currency: "USD" },
        period: cdk.Duration.hours(6),
        statistic: "Maximum",
      });

      new cloudwatch.Alarm(this, "BillingLimitAlarm", {
        alarmName: `indiai-billing-limit-alarm-50`,
        alarmDescription:
          "Alarms when estimated AWS monthly charges exceed $50. Set your email in SNS subscription after deploy.",
        metric: billingMetric,
        threshold: 50,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      });

      new cdk.CfnOutput(this, "BillingTopicArnOutput", {
        value: billingTopic.topicArn,
        exportName: "indiai-BillingTopicArn",
        description: "ARN of SNS Billing Alert Topic for email subscriptions",
      });
    }

    new cdk.CfnOutput(this, "MonitoringConfigStatusOutput", {
      value: "SUCCESS",
      exportName: `indiai-${env}-MonitoringConfigStatus`,
      description: "Status of Monitoring elements setup",
    });
  }
}
