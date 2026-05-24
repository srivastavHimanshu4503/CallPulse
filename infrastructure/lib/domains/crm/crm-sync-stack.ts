import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { BaseStackProps } from "../../common-constructs/types";

export interface CrmSyncStackProps extends BaseStackProps {
  typesenseSyncQueueArn: string;
}

export class CrmSyncStack extends cdk.Stack {
  public readonly syncWorkerRole: iam.Role;

  constructor(scope: Construct, id: string, props: CrmSyncStackProps) {
    super(scope, id, props);

    const env = props.deployEnv;

    this.syncWorkerRole = new iam.Role(this, "CrmSyncWorkerRole", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      roleName: `indiai-${env}-crm-sync-worker-role`,
      description: "IAM Role granting minimal permissions to Typesense syncing workers",
    });

    this.syncWorkerRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:SendMessage"],
        resources: [props.typesenseSyncQueueArn],
      })
    );

    this.syncWorkerRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["ssm:GetParameter"],
        resources: [
          `arn:aws:ssm:${this.region}:${this.account}:parameter/indiai/*`,
        ],
      })
    );

    new cdk.CfnOutput(this, "SyncWorkerRoleArnOutput", {
      value: this.syncWorkerRole.roleArn,
      exportName: `indiai-${env}-SyncWorkerRoleArn`,
      description: "ARN of the Typesense Sync Worker IAM Role",
    });
  }
}
