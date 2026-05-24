import * as cdk from "aws-cdk-lib";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import { BaseStackProps } from "../../common-constructs/types";
import { SqsQueueWithDLQ } from "../../common-constructs/sqs-queue-with-dlq";

export class WorkflowQueueStack extends cdk.Stack {
  public readonly workflowJobsQueue: sqs.Queue;
  public readonly workflowJobsDLQ: sqs.Queue;

  constructor(scope: Construct, id: string, props: BaseStackProps) {
    super(scope, id, props);

    const env = props.deployEnv;

    const workflowJobsStack = new SqsQueueWithDLQ(this, "WorkflowJobs", {
      queueName: `indiai-${env}-workflow-jobs`,
      visibilityTimeout: cdk.Duration.seconds(60),
      maxReceiveCount: 3,
    });

    this.workflowJobsQueue = workflowJobsStack.queue;
    this.workflowJobsDLQ = workflowJobsStack.dlq;

    new cdk.CfnOutput(this, "WorkflowJobsQueueUrlOutput", {
      value: this.workflowJobsQueue.queueUrl,
      exportName: `indiai-${env}-WorkflowJobsQueueUrl`,
      description: "URL of Workflow Jobs SQS Queue",
    });

    new cdk.CfnOutput(this, "WorkflowJobsDLQUrlOutput", {
      value: this.workflowJobsDLQ.queueUrl,
      exportName: `indiai-${env}-WorkflowJobsDLQUrl`,
      description: "URL of Workflow Jobs SQS DLQ",
    });
  }
}
