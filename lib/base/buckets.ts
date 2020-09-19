import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';


export type S3WebsiteBucketProps  = {
    rootDocument: string;
    errorDocument: string;
    bucketRemovalPolicy?: cdk.RemovalPolicy;
}

export function S3WebsiteBucket(scope: cdk.Construct, id: string, props: S3WebsiteBucketProps) {

  const bucket = new s3.Bucket(scope, id, {
      websiteIndexDocument: props.rootDocument,
      websiteErrorDocument: props.errorDocument,
      removalPolicy: props.bucketRemovalPolicy ||  cdk.RemovalPolicy.DESTROY
  });

  return bucket;
}
