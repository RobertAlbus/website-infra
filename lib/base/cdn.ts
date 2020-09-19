import * as cdk from '@aws-cdk/core';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as iam from '@aws-cdk/aws-iam';
import * as s3 from '@aws-cdk/aws-s3';


export type CloudfrontForS3Props = {
    websiteName: string;
    bucket: s3.Bucket;
}

export function CloudfrontForS3(scope: cdk.Construct, props: CloudfrontForS3Props) {

    const cloudFrontOAI = new cloudfront.OriginAccessIdentity(scope, 'OAI', {
        comment: `OAI for ${props.websiteName} website.`,
      });
  
    const cloudFrontDistProps: cloudfront.CloudFrontWebDistributionProps = {
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: props.bucket,
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
      scope,
      `${props.websiteName}-cfd`,
      cloudFrontDistProps
    );

      // add iam roles for Cloudfront only access to S3
    const cloudfrontS3Access = new iam.PolicyStatement();
    cloudfrontS3Access.addActions('s3:GetBucket*');
    cloudfrontS3Access.addActions('s3:GetObject*');
    cloudfrontS3Access.addActions('s3:List*');
    cloudfrontS3Access.addResources(props.bucket.bucketArn);
    cloudfrontS3Access.addResources(`${props.bucket.bucketArn}/*`);
    cloudfrontS3Access.addCanonicalUserPrincipal(
      cloudFrontOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId
    );

    props.bucket.addToResourcePolicy(cloudfrontS3Access);

    return cloudfrontDist;
}