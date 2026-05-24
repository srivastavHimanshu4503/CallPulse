import * as cdk from "aws-cdk-lib";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { BaseStackProps } from "../common-constructs/types";

export class DataStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: BaseStackProps) {
    super(scope, id, props);

    const env = props.deployEnv;

    const paramsList = [
      { name: `/indiai/${env}/database-url`, value: "CHANGE_ME" },
      { name: `/indiai/${env}/jwt-secret`, value: "CHANGE_ME" },
      { name: `/indiai/${env}/jwt-refresh-secret`, value: "CHANGE_ME" },
      { name: `/indiai/${env}/typesense-api-key`, value: "local-dev-key" },
      { name: `/indiai/${env}/exotel-api-key`, value: "CHANGE_ME" },
      { name: `/indiai/${env}/exotel-api-token`, value: "CHANGE_ME" },
      { name: `/indiai/${env}/ai-api-key`, value: "CHANGE_ME" },
    ];

    paramsList.forEach((param) => {
      new ssm.StringParameter(this, `Param-${param.name.replace(/\//g, "-")}`, {
        parameterName: param.name,
        stringValue: param.value,
        description: `Placeholder value for ${param.name}. Update post deployment.`,
      });
    });

    new ssm.StringParameter(this, "GlobalGitHubTokenParam", {
      parameterName: "/indiai/github-token",
      stringValue: "CHANGE_ME",
      description: "GitHub Webhook Token Placeholder for Pipeline orchestration. Update post deployment.",
    });

    new cdk.CfnOutput(this, "DataConfigStatusOutput", {
      value: "SUCCESS",
      exportName: `indiai-${env}-DataConfigStatus`,
      description: "Status of SSM placeholders injection",
    });
  }
}
