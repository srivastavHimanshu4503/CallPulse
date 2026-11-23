#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { AntigravityPipelineStack } from "../stacks/pipeline/pipeline-stack";
import { DeploymentStage } from "../stacks/pipeline/deployment-stage";
import { Stage } from "../lib/common-constructs/types";

const app = new cdk.App();

// 1. Central GitOps CodePipeline Stack (Orchestrates and deploys Dev and Prod)
new AntigravityPipelineStack(app, "IndiAiPipelineStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "us-east-1",
  },
  githubOwner: process.env.GITHUB_OWNER ?? "srivastavHimanshu4503",
  githubRepo: process.env.GITHUB_REPO ?? "CallPulse",
  githubBranch: process.env.GITHUB_BRANCH ?? "main",
});

// 2. Dev Deployment Stage (Enables direct npx cdk commands like deploy/diff for Dev environment)
new DeploymentStage(app, "Dev", {
  deployEnv: Stage.dev,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "ap-south-1", // Primary target region in Mumbai
  },
});

// 3. Prod Deployment Stage (Enables direct npx cdk commands like deploy/diff for Prod environment)
new DeploymentStage(app, "Prod", {
  deployEnv: Stage.prod,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "ap-south-1", // Primary target region in Mumbai
  },
});

app.synth();
