import * as cdk from "aws-cdk-lib";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import { BaseStackProps } from "../../common-constructs/types";
import { SqsQueueWithDLQ } from "../../common-constructs/sqs-queue-with-dlq";

export class VoiceQueueStack extends cdk.Stack {
  public readonly callProcessingQueue: sqs.Queue;
  public readonly callProcessingDLQ: sqs.Queue;

  constructor(scope: Construct, id: string, props: BaseStackProps) {
    super(scope, id, props);

    const env = props.deployEnv;

    const callProcessingStack = new SqsQueueWithDLQ(this, "VoiceCallProcessing", {
      queueName: `indiai-${env}-voice-call-processing`,
      visibilityTimeout: cdk.Duration.seconds(300),
      maxReceiveCount: 3,
    });

    this.callProcessingQueue = callProcessingStack.queue;
    this.callProcessingDLQ = callProcessingStack.dlq;

    new cdk.CfnOutput(this, "CallProcessingQueueUrlOutput", {
      value: this.callProcessingQueue.queueUrl,
      exportName: `indiai-${env}-CallProcessingQueueUrl`,
      description: "URL of Voice Call Processing SQS Queue",
    });

    new cdk.CfnOutput(this, "CallProcessingDLQUrlOutput", {
      value: this.callProcessingDLQ.queueUrl,
      exportName: `indiai-${env}-CallProcessingDLQUrl`,
      description: "URL of Voice Call Processing SQS DLQ",
    });
  }
}
