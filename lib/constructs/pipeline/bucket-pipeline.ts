import { BuildSpec, PipelineProject } from "@aws-cdk/aws-codebuild";
import { Repository } from "@aws-cdk/aws-codecommit";
import { Artifact, Pipeline, StageProps } from "@aws-cdk/aws-codepipeline";
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
  bucket: Bucket;
  buildSpecFileLocation: string;
  branch?: string;
  repo?: Repository;
};
export class BucketPipeline extends Construct {
  repo: Repository;

  constructor(scope: Construct, id: string, props?: BucketPipelineProps) {
    super(scope, id);
    props = props || {
      buildSpecFileLocation: "buildspec.yaml",
      bucket: new WebsiteBucket(scope, "bucket").bucket,
    };

    props.branch = props.branch || "main";
    props.repo =
      props.repo ||
      new Repository(scope, `repo`, {
        repositoryName: `${id}-repo`,
      });

    this.repo = props.repo;

    // SOURCE

    const sourceOutput = new Artifact(`source-artifact`);
    const buildOutput = new Artifact(`build-artifact`);

    const SourceAction: StageProps = {
      stageName: "Source",
      actions: [
        new CodeCommitSourceAction({
          branch: props.branch,
          actionName: "codecommit",
          repository: props.repo,
          output: sourceOutput,
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
          actionName: "build",
          project: buildFromSpec,
          input: sourceOutput,
          outputs: [buildOutput],
        }),
      ],
    };

    // DEPLOY

    const deployAction: StageProps = {
      stageName: "Deploy",
      actions: [
        new S3DeployAction({
          actionName: "dev-deploy",
          bucket: props.bucket,
          input: buildOutput,
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
        resources: [props.bucket.bucketArn, `${props.bucket.bucketArn}/*`],
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
