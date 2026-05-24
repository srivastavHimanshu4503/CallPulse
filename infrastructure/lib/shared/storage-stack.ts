import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { BaseStackProps, Stage } from "../common-constructs/types";

export class StorageStack extends cdk.Stack {
  public readonly recordingsBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: BaseStackProps) {
    super(scope, id, props);

    const env = props.deployEnv;
    const isProd = env === Stage.prod;

    const allowedOrigins = isProd
      ? ["https://app.indiai.in"]
      : ["http://localhost:5173", "http://127.0.0.1:5173"];

    this.recordingsBucket = new s3.Bucket(this, "RecordingsBucket", {
      bucketName: `indiai-${env}-recordings-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: isProd,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProd,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET],
          allowedOrigins,
          allowedHeaders: ["*"],
          maxAge: 3000,
        },
      ],
      lifecycleRules: [
        {
          id: "ArchiveRecordingLifecycle",
          enabled: true,
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30),
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90),
            },
          ],
          expiration: cdk.Duration.days(365),
        },
      ],
    });

    new cdk.CfnOutput(this, "RecordingsBucketArnOutput", {
      value: this.recordingsBucket.bucketArn,
      exportName: `indiai-${env}-RecordingsBucketArn`,
      description: "ARN of the S3 Recordings Bucket",
    });

    new cdk.CfnOutput(this, "RecordingsBucketNameOutput", {
      value: this.recordingsBucket.bucketName,
      exportName: `indiai-${env}-RecordingsBucketName`,
      description: "Name of the S3 Recordings Bucket",
    });
  }
}
