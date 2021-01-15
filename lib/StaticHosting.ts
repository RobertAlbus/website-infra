import * as cdk from "@aws-cdk/core";
import * as cloudfront from "@aws-cdk/aws-cloudfront";
import * as codebuild from "@aws-cdk/aws-codebuild";
import * as iam from "@aws-cdk/aws-iam";
import * as s3 from "@aws-cdk/aws-s3";
import * as codeCommit from "@aws-cdk/aws-codecommit";

import { Construct } from "@aws-cdk/core";
import { Pipeline, Artifact } from "@aws-cdk/aws-codepipeline";
import {
  CodeBuildAction,
  CodeCommitSourceAction,
  S3DeployAction,
} from "@aws-cdk/aws-codepipeline-actions";

// https://dev.to/ryands17/deploying-a-spa-using-aws-cdk-typescript-4ibf

export interface StaticHostingStackProps {
  websiteName: string;
  rootDocument: string;
  errorDocument: string;
  domainName: string;
  buildBranch: string;
  repoOwner: string;
  repoName: string;
  buildSpecFileLocation: string;
  GithubKeySecretARN: string;
}
export class StaticHostingStack extends Construct {
  constructor(
    scope: cdk.Construct,
    id: string,
    props: StaticHostingStackProps
  ) {
    super(scope, id);

    ////////
    //
    //  HOSTING
    //

    const bucket = new s3.Bucket(this, `${id}-hosting-bucket`, {
      websiteIndexDocument: props.rootDocument,
      websiteErrorDocument: props.errorDocument,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    ////////
    //
    //  CDN
    //

    const cloudFrontOAI = new cloudfront.OriginAccessIdentity(
      this,
      `${id}-cloudfront-OAI`,
      {
        comment: `OAI for ${props.websiteName} website.`,
      }
    );

    const cloudFrontDistProps: cloudfront.CloudFrontWebDistributionProps = {
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: bucket,
            originAccessIdentity: cloudFrontOAI,
          },
          behaviors: [
            {
              isDefaultBehavior: true,
              allowedMethods:
                cloudfront.CloudFrontAllowedMethods.GET_HEAD_OPTIONS,
              compress: true,
            },
          ],
        },
      ],
    };

    const cloudfrontDist = new cloudfront.CloudFrontWebDistribution(
      this,
      `${id}-cdn`,
      cloudFrontDistProps
    );

    // add iam roles for Cloudfront only access to S3
    const cloudfrontS3Access = new iam.PolicyStatement();
    cloudfrontS3Access.addActions("s3:GetBucket*");
    cloudfrontS3Access.addActions("s3:GetObject*");
    cloudfrontS3Access.addActions("s3:List*");
    cloudfrontS3Access.addResources(bucket.bucketArn);
    cloudfrontS3Access.addResources(`${bucket.bucketArn}/*`);
    cloudfrontS3Access.addCanonicalUserPrincipal(
      cloudFrontOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId
    );

    bucket.addToResourcePolicy(cloudfrontS3Access);

    ////////
    //
    //  BUILD
    //

    const repo = new codeCommit.Repository(this, `${id}-source-repo`, {
      repositoryName: `${id}-source-repo`,
    });

    const hugoBuild = new codebuild.PipelineProject(this, `${id}-build`, {
      buildSpec: codebuild.BuildSpec.fromSourceFilename(
        props.buildSpecFileLocation
      ),
    });

    const sourceOutput = new Artifact(`${id}-pipeline-source-artifact`);
    const hugoBuildOutput = new Artifact(`${id}-pipeline-build-artifact`);

    const pipeline = new Pipeline(this, `${id}-pipeline`, {
      stages: [
        {
          stageName: "Source",
          actions: [
            new CodeCommitSourceAction({
              branch: "main",
              actionName: "CodeCommit_Source",
              repository: repo,
              output: sourceOutput,
            }),
          ],
        },
        {
          stageName: "Build",
          actions: [
            new CodeBuildAction({
              actionName: "Hugo_Build",
              project: hugoBuild,
              input: sourceOutput,
              outputs: [hugoBuildOutput],
            }),
          ],
        },
        {
          stageName: "Deploy",
          actions: [
            new S3DeployAction({
              actionName: "S3_Deploy",
              bucket: bucket,
              input: hugoBuildOutput,
            }),
          ],
        },
      ],
    });

    // iam policy to push build artifacts to S3
    pipeline.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [bucket.bucketArn, `${bucket.bucketArn}/*`],
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
