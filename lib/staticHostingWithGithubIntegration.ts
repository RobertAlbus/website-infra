import * as cdk from '@aws-cdk/core';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as codebuild from '@aws-cdk/aws-codebuild';
import * as iam from '@aws-cdk/aws-iam';
import * as s3 from '@aws-cdk/aws-s3';


import { S3WebsiteBucket } from './base/buckets';
import { CodeBuildProject } from './base/build';
import { CloudfrontForS3 } from './base/cdn';




// https://dev.to/ryands17/deploying-a-spa-using-aws-cdk-typescript-4ibf

export interface StaticHostingStackProps extends cdk.StackProps {
  websiteName: string;
  rootDocument: string;
  errorDocument: string;
  domainName: string;
  buildBranch: string;
  repoOwner: string;
  repoName: string;
  buildSpecFileLocation: string;
}
export class StaticHostingStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: StaticHostingStackProps) {
    super(scope, id, props);

    ////////
    //
    //  HOSTING
    //

    const bucket = new s3.Bucket(this, `${id}-hosting-bucket`, {
      websiteIndexDocument: props.rootDocument,
      websiteErrorDocument: props.errorDocument,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    ////////
    //
    //  CDN
    //
    
    const cloudFrontOAI = new cloudfront.OriginAccessIdentity(this, `${id}-cloudfront-OAI`, {
        comment: `OAI for ${props.websiteName} website.`,
      });
  
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
              allowedMethods: cloudfront.CloudFrontAllowedMethods.GET_HEAD_OPTIONS,
              defaultTtl: cdk.Duration.days(1),
              compress: true
            }
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
    cloudfrontS3Access.addActions('s3:GetBucket*');
    cloudfrontS3Access.addActions('s3:GetObject*');
    cloudfrontS3Access.addActions('s3:List*');
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

    const project = new codebuild.Project(this, `${id}-build`, {
      buildSpec: codebuild.BuildSpec.fromSourceFilename(props.buildSpecFileLocation),
      projectName:  `${id}-build`,
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_4_0, // has golang
        computeType: codebuild.ComputeType.SMALL,
        environmentVariables: {
          S3_BUCKET: {
            value: bucket.bucketName,
          },
          CLOUDFRONT_DIST_ID: {
            value: cloudfrontDist.distributionId,
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
        resources: [bucket.bucketArn, `${bucket.bucketArn}/*`],
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
        resources: [cloudfrontDist.distributionId],
        actions: [
          'cloudfront:CreateInvalidation',
          'cloudfront:GetDistribution*',
          'cloudfront:GetInvalidation',
          'cloudfront:ListInvalidations',
          'cloudfront:ListDistributions',
        ],
      })
    );

  }
}
