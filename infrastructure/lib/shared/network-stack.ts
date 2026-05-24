import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { BaseStackProps } from "../common-constructs/types";

export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly appSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: BaseStackProps) {
    super(scope, id, props);

    const env = props.deployEnv;

    this.vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "public",
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    this.appSecurityGroup = new ec2.SecurityGroup(this, "AppSecurityGroup", {
      vpc: this.vpc,
      securityGroupName: `indiai-${env}-app-sg`,
      description: "Allow inbound access to Antigravity apps",
      allowAllOutbound: true,
    });

    this.appSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      "Allow HTTP inbound web traffic"
    );

    this.appSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      "Allow HTTPS inbound web traffic"
    );

    this.appSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(3000),
      "Allow inbound web traffic to Express Backend API"
    );

    new cdk.CfnOutput(this, "VpcIdOutput", {
      value: this.vpc.vpcId,
      exportName: `indiai-${env}-VpcId`,
      description: "Primary application VPC identification",
    });

    new cdk.CfnOutput(this, "SecurityGroupIdOutput", {
      value: this.appSecurityGroup.securityGroupId,
      exportName: `indiai-${env}-SecurityGroupId`,
      description: "Primary application security group identification",
    });
  }
}
