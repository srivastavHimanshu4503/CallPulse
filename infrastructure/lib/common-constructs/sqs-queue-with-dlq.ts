import * as cdk from "aws-cdk-lib";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";

export interface SqsQueueWithDLQProps {
  queueName: string;
  visibilityTimeout: cdk.Duration;
  maxReceiveCount?: number;
  dlqRetentionPeriod?: cdk.Duration;
}

/**
 * Reusable Construct creating an SQS queue linked to a Dead Letter Queue (DLQ).
 * Enforces standard DLQ constraints across all domains to prevent message losses.
 */
export class SqsQueueWithDLQ extends Construct {
  public readonly queue: sqs.Queue;
  public readonly dlq: sqs.Queue;

  constructor(scope: Construct, id: string, props: SqsQueueWithDLQProps) {
    super(scope, id);

    const maxReceiveCount = props.maxReceiveCount ?? 3;
    const dlqRetentionPeriod = props.dlqRetentionPeriod ?? cdk.Duration.days(14);

    // 1. Create Dead Letter Queue
    this.dlq = new sqs.Queue(this, "DLQ", {
      queueName: `${props.queueName}-dlq`,
      retentionPeriod: dlqRetentionPeriod,
      enforceSSL: true, // Security best practice
    });

    // 2. Create Main Queue with DLQ Redrive Policy
    this.queue = new sqs.Queue(this, "Queue", {
      queueName: props.queueName,
      visibilityTimeout: props.visibilityTimeout,
      enforceSSL: true, // Security best practice
      deadLetterQueue: {
        maxReceiveCount,
        queue: this.dlq,
      },
    });
  }
}
