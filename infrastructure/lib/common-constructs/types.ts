import * as cdk from "aws-cdk-lib";

export enum Stage {
  dev = "dev",
  prod = "prod",
}

export enum AWSRegion {
  ap_south_1 = "ap-south-1",
  us_east_1 = "us-east-1",
}

export interface BaseStackProps extends cdk.StackProps {
  deployEnv: Stage;
  region: AWSRegion;
}
