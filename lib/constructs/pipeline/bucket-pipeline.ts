import { BuildSpec, PipelineProject } from "@aws-cdk/aws-codebuild";
import { Repository } from "@aws-cdk/aws-codecommit";
import {
  Artifact,
  Pipeline,
  IAction,
  StageProps,
} from "@aws-cdk/aws-codepipeline";
import {
  CodeBuildAction,
  CodeCommitSourceAction,
  S3DeployAction,
} from "@aws-cdk/aws-codepipeline-actions";
import { Effect, PolicyStatement } from "@aws-cdk/aws-iam";
import { Bucket } from "@aws-cdk/aws-s3";
import { Construct } from "@aws-cdk/core";
import { WebsiteBucket } from "../static-hosting/hosting-bucket";

export type BucketPipelineProps = {
  devBucket: Bucket;
  prodBucket: Bucket;
  buildSpecFileLocation: string;
  devBranch?: string;
  prodBranch?: string;
};
export class BucketPipeline extends Construct {
  constructor(scope: Construct, id: string, props?: BucketPipelineProps) {
    super(scope, id);
    props = props || {
      buildSpecFileLocation: "buildspec.yaml",
      devBucket: new WebsiteBucket(scope, "dev-bucket").bucket,
      prodBucket: new WebsiteBucket(scope, "prod-bucket").bucket,
    };

    props.prodBranch = props.devBranch || "dev";
    props.prodBranch = props.prodBranch || "main";

    // REPO

    const repo = new Repository(this, `repo`, {
      repositoryName: `${id}-repo`,
    });

    // SOURCE

    const devSourceOutput = new Artifact(`dev-source-artifact`);
    const prodSourceOutput = new Artifact(`prod-source-artifact`);

    const devBuildOutput = new Artifact(`dev-build-output`);
    const prodBuildOutput = new Artifact(`prod-build-output`);

    const SourceAction: StageProps = {
      stageName: "Source",
      actions: [
        new CodeCommitSourceAction({
          branch: props.devBranch,
          actionName: "dev-source",
          repository: repo,
          output: devSourceOutput,
        }),
        new CodeCommitSourceAction({
          branch: props.prodBranch,
          actionName: "prod-source",
          repository: repo,
          output: prodSourceOutput,
        }),
      ],
    };

    // BUILD

    const buildFromSpec = new PipelineProject(this, `build-from-spec`, {
      buildSpec: BuildSpec.fromSourceFilename(props.buildSpecFileLocation),
    });

    const BuildAction: StageProps = {
      stageName: "Build",
      actions: [
        new CodeBuildAction({
          actionName: "dev-build",
          project: buildFromSpec,
          input: devSourceOutput,
          outputs: [devBuildOutput],
        }),
        new CodeBuildAction({
          actionName: "prod-build",
          project: buildFromSpec,
          input: prodSourceOutput,
          outputs: [prodSourceOutput],
        }),
      ],
    };

    // DEPLOY

    const deployAction: StageProps = {
      stageName: "Deploy",
      actions: [
        new S3DeployAction({
          actionName: "dev-deploy",
          bucket: props.devBucket,
          input: devBuildOutput,
        }),
        new S3DeployAction({
          actionName: "prod-deploy",
          bucket: props.prodBucket,
          input: prodBuildOutput,
        }),
      ],
    };

    // PIPELINE

    const pipeline = new Pipeline(this, "pipeline", {
      stages: [SourceAction, BuildAction, deployAction],
    });

    // PERMISSIONS

    pipeline.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: [
          props.devBucket.bucketArn,
          props.prodBucket.bucketArn,
          `${props.devBucket.bucketArn}/*`,
          `${props.prodBucket.bucketArn}/*`,
        ],
        actions: [
          "s3:GetBucket*",
          "s3:List*",
          "s3:GetObject*",
          "s3:DeleteObject",
          "s3:PutObject",
        ],
      })
    );
  }
}
