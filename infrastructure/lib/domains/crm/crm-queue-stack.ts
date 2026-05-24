import * as cdk from "aws-cdk-lib";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import { BaseStackProps } from "../../common-constructs/types";
import { SqsQueueWithDLQ } from "../../common-constructs/sqs-queue-with-dlq";

export class CrmQueueStack extends cdk.Stack {
  public readonly typesenseSyncQueue: sqs.Queue;
  public readonly typesenseSyncDLQ: sqs.Queue;
  public readonly notificationsQueue: sqs.Queue;
  public readonly notificationsDLQ: sqs.Queue;

  constructor(scope: Construct, id: string, props: BaseStackProps) {
    super(scope, id, props);

    const env = props.deployEnv;

    const typesenseSyncStack = new SqsQueueWithDLQ(this, "TypesenseSync", {
      queueName: `indiai-${env}-crm-typesense-sync`,
      visibilityTimeout: cdk.Duration.seconds(30),
      maxReceiveCount: 5,
    });

    this.typesenseSyncQueue = typesenseSyncStack.queue;
    this.typesenseSyncDLQ = typesenseSyncStack.dlq;

    const notificationsStack = new SqsQueueWithDLQ(this, "CrmNotifications", {
      queueName: `indiai-${env}-crm-notifications`,
      visibilityTimeout: cdk.Duration.seconds(30),
      maxReceiveCount: 3,
    });

    this.notificationsQueue = notificationsStack.queue;
    this.notificationsDLQ = notificationsStack.dlq;

    new cdk.CfnOutput(this, "TypesenseSyncQueueUrlOutput", {
      value: this.typesenseSyncQueue.queueUrl,
      exportName: `indiai-${env}-TypesenseSyncQueueUrl`,
      description: "URL of CRM Typesense Sync SQS Queue",
    });

    new cdk.CfnOutput(this, "CrmNotificationsQueueUrlOutput", {
      value: this.notificationsQueue.queueUrl,
      exportName: `indiai-${env}-CrmNotificationsQueueUrl`,
      description: "URL of CRM Notifications SQS Queue",
    });
  }
}
