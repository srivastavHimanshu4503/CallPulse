import * as cdk from "aws-cdk-lib";
import * as codepipeline from "aws-cdk-lib/aws-codepipeline";
import * as codepipeline_actions from "aws-cdk-lib/aws-codepipeline-actions";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export interface PipelineStackProps extends cdk.StackProps {
  githubOwner: string;
  githubRepo: string;
  githubBranch: string;
}

export class AntigravityPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    const githubToken = cdk.SecretValue.secretsManager(
      "indiai/github-token"
    );

    const sourceArtifact = new codepipeline.Artifact("SourceArtifact");
    const buildArtifact = new codepipeline.Artifact("BuildArtifact");

    const buildProject = new codebuild.PipelineProject(this, "BuildProject", {
      projectName: "indiai-pipeline-build",
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        computeType: codebuild.ComputeType.SMALL,
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: "0.2",
        phases: {
          install: {
            "runtime-versions": {
              nodejs: "20",
            },
            commands: [
              "npm install -g pnpm",
            ],
          },
          pre_build: {
            commands: [
              "pnpm install --frozen-lockfile",
            ],
          },
          build: {
            commands: [
              "pnpm --filter api build || true",
              "cd infrastructure && npx cdk synth -o ../cdk.out",
            ],
          },
        },
        artifacts: {
          "base-directory": "cdk.out",
          files: ["**/*"],
        },
      }),
    });

    const deployRole = new iam.Role(this, "PipelineDeployRole", {
      assumedBy: new iam.ServicePrincipal("codebuild.amazonaws.com"),
    });

    deployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "ssm:SendCommand",
          "ssm:GetCommandInvocation",
          "ssm:GetParameter",
        ],
        resources: ["*"],
      })
    );

    const createDeployProject = (env: string) => {
      return new codebuild.PipelineProject(this, `DeployProject-${env}`, {
        projectName: `indiai-pipeline-deploy-${env}`,
        role: deployRole,
        environment: {
          buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        },
        buildSpec: codebuild.BuildSpec.fromObject({
          version: "0.2",
          phases: {
            build: {
              commands: [
                "INSTANCE_ID=$(aws ssm get-parameter --name /indiai/ec2-instance-id --region us-east-1 --query Parameter.Value --output text)",
                "COMMAND_ID=$(aws ssm send-command --region ap-south-1 --instance-ids $INSTANCE_ID --document-name AWS-RunShellScript --parameters commands=[\"cd /app/indiAi\",\"git pull origin main\",\"pnpm install --frozen-lockfile\",\"pnpm --filter api build\",\"docker compose up -d --build --remove-orphans\",\"echo Deploy complete\"] --query Command.CommandId --output text)",
                "aws ssm wait command-executed --command-id $COMMAND_ID --instance-id $INSTANCE_ID --region ap-south-1",
                "aws ssm get-command-invocation --command-id $COMMAND_ID --instance-id $INSTANCE_ID --region ap-south-1"
              ],
            },
          },
        }),
      });
    };

    const devDeployProject = createDeployProject("dev");
    const prodDeployProject = createDeployProject("prod");

    const pipeline = new codepipeline.Pipeline(this, "Pipeline", {
      pipelineName: "IndiAi-Deployment-Pipeline",
      restartExecutionOnUpdate: true,
    });

    pipeline.addStage({
      stageName: "Source",
      actions: [
        new codepipeline_actions.GitHubSourceAction({
          actionName: "GitHub_Source",
          owner: props.githubOwner,
          repo: props.githubRepo,
          branch: props.githubBranch,
          oauthToken: githubToken,
          output: sourceArtifact,
          trigger: codepipeline_actions.GitHubTrigger.WEBHOOK,
        }),
      ],
    });

    pipeline.addStage({
      stageName: "Build",
      actions: [
        new codepipeline_actions.CodeBuildAction({
          actionName: "CodeBuild_Build",
          project: buildProject,
          input: sourceArtifact,
          outputs: [buildArtifact],
        }),
      ],
    });

    pipeline.addStage({
      stageName: "DeployDev",
      actions: [
        new codepipeline_actions.CodeBuildAction({
          actionName: "SSM_Deploy_Dev",
          project: devDeployProject,
          input: buildArtifact,
        }),
      ],
    });

    const approvalAction = new codepipeline_actions.ManualApprovalAction({
      actionName: "Approve_Prod_Deployment",
      additionalInformation: "Verify Dev environment testing has passed successfully before approving.",
    });

    pipeline.addStage({
      stageName: "ManualApproval",
      actions: [approvalAction],
    });

    pipeline.addStage({
      stageName: "DeployProd",
      actions: [
        new codepipeline_actions.CodeBuildAction({
          actionName: "SSM_Deploy_Prod",
          project: prodDeployProject,
          input: buildArtifact,
        }),
      ],
    });

    new cdk.CfnOutput(this, "PipelineArnOutput", {
      value: pipeline.pipelineArn,
      exportName: "indiai-PipelineArn",
      description: "ARN of the GitOps deployment pipeline",
    });

    new cdk.CfnOutput(this, "PipelineConsoleUrlOutput", {
      value: `https://console.aws.amazon.com/codesuite/codepipeline/pipelines/${pipeline.pipelineName}/view`,
      exportName: "indiai-PipelineConsoleUrl",
      description: "AWS Management Console URL for pipeline tracking",
    });
  }
}
export default AntigravityPipelineStack;
