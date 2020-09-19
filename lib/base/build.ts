import * as cdk from '@aws-cdk/core';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as codebuild from '@aws-cdk/aws-codebuild';
import * as iam from '@aws-cdk/aws-iam';
import * as s3 from '@aws-cdk/aws-s3';


export type CodeBuildProjectProps = {
    buildBranch: string;
    repoOwner: string;
    repoName: string;
    websiteName: string;
    buildSpecFileLocation: string;
    hostingBucket: s3.Bucket;
    webDistribution: cloudfront.CloudFrontWebDistribution;
    
}
export function CodeBuildProject(scope: cdk.Construct, props: CodeBuildProjectProps) {
  
// codebuild project setup
const webhooks: codebuild.FilterGroup[] = [
    codebuild.FilterGroup.inEventOf(
      codebuild.EventAction.PUSH,
      codebuild.EventAction.PULL_REQUEST_MERGED
    ).andHeadRefIs(props.buildBranch),
  ];

  const repo = codebuild.Source.gitHub({
    owner: props.repoOwner,
    repo: props.repoName,
    webhook: true,
    webhookFilters: webhooks,
    reportBuildStatus: true,
  });

  const project = new codebuild.Project(scope, `${props.websiteName}-build`, {
    buildSpec: codebuild.BuildSpec.fromSourceFilename(props.buildSpecFileLocation),
    projectName: `${props.websiteName}-build`,
    environment: {
      buildImage: codebuild.LinuxBuildImage.STANDARD_4_0, // has golang
      computeType: codebuild.ComputeType.SMALL,
      environmentVariables: {
        S3_BUCKET: {
          value: props.hostingBucket.bucketName,
        },
        CLOUDFRONT_DIST_ID: {
          value: props.webDistribution.distributionId,
        },
      },
    },
    source: repo,
    timeout: cdk.Duration.minutes(1),
  });

  // iam policy to push build artifacts to S3
  project.addToRolePolicy(
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: [props.hostingBucket.bucketArn, `${props.hostingBucket.bucketArn}/*`],
      actions: [
        's3:GetBucket*',
        's3:List*',
        's3:GetObject*',
        's3:DeleteObject',
        's3:PutObject',
      ],
    })
  );

  // iam policy to invalidate cloudfront distribution's cache
  project.addToRolePolicy(
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: [props.hostingBucket.bucketArn],
      actions: [
        'cloudfront:CreateInvalidation',
        'cloudfront:GetDistribution*',
        'cloudfront:GetInvalidation',
        'cloudfront:ListInvalidations',
        'cloudfront:ListDistributions',
      ],
    })
  );

  return project;
}

