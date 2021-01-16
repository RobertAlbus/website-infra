import {
  CloudFrontAllowedMethods,
  CloudFrontWebDistribution,
  CloudFrontWebDistributionProps,
  OriginAccessIdentity,
} from "@aws-cdk/aws-cloudfront";
import { PolicyStatement } from "@aws-cdk/aws-iam";
import { Bucket } from "@aws-cdk/aws-s3";
import { Construct, RemovalPolicy } from "@aws-cdk/core";
import { WebsiteBucket } from "./hosting-bucket";

export type BucketCdnProps = {
  bucket?: Bucket;
};
export class BucketCdn extends Construct {
  distribution: CloudFrontWebDistribution;

  constructor(scope: Construct, id: string, props?: BucketCdnProps) {
    super(scope, id);
    props = props || {};

    props.bucket =
      props.bucket || new WebsiteBucket(scope, "bucket", {}).bucket;

    const cloudFrontOAI = new OriginAccessIdentity(this, `cdn-OAI`, {
      comment: `OAI for ${id}.`,
    });

    const cloudFrontDistProps: CloudFrontWebDistributionProps = {
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: props.bucket,
            originAccessIdentity: cloudFrontOAI,
          },
          behaviors: [
            {
              isDefaultBehavior: true,
              allowedMethods: CloudFrontAllowedMethods.GET_HEAD_OPTIONS,
              compress: true,
            },
          ],
        },
      ],
    };

    this.distribution = new CloudFrontWebDistribution(
      this,
      `cdn`,
      cloudFrontDistProps
    );

    // add iam roles for Cloudfront only access to S3
    const cloudfrontS3Access = new PolicyStatement();
    cloudfrontS3Access.addActions("s3:GetBucket*");
    cloudfrontS3Access.addActions("s3:GetObject*");
    cloudfrontS3Access.addActions("s3:List*");
    cloudfrontS3Access.addResources(props.bucket.bucketArn);
    cloudfrontS3Access.addResources(`${props.bucket.bucketArn}/*`);
    cloudfrontS3Access.addCanonicalUserPrincipal(
      cloudFrontOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId
    );

    props.bucket.addToResourcePolicy(cloudfrontS3Access);
  }
}
