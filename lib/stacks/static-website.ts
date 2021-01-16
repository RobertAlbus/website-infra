import * as cdk from "@aws-cdk/core";

import { Stack, RemovalPolicy } from "@aws-cdk/core";
import { WebsiteBucket } from "../constructs/static-hosting/hosting-bucket";
import { BucketCdn } from "../constructs/static-hosting/cdn-for-s3";
import { BucketPipeline } from "../constructs/pipeline/bucket-pipeline";

// https://dev.to/ryands17/deploying-a-spa-using-aws-cdk-typescript-4ibf

export interface StaticWebsiteProps {
  rootDocument: string;
  errorDocument: string;
  bucketRemovalPolicy?: RemovalPolicy;
  devBranch: string;
  prodBranch: string;
  buildSpecFileLocation: string;
}

export class StaticWebsite extends Stack {
  constructor(scope: cdk.Construct, id: string, props: StaticWebsiteProps) {
    super(scope, id);
    props.bucketRemovalPolicy =
      props.bucketRemovalPolicy || RemovalPolicy.RETAIN;

    //  HOSTING

    const devBucket = new WebsiteBucket(this, `dev-bucket`, {
      rootDocument: props.rootDocument,
      errorDocument: props.errorDocument,
      removalPolicy: props.bucketRemovalPolicy,
    });
    const prodBucket = new WebsiteBucket(this, `prod-bucket`, {
      rootDocument: props.rootDocument,
      errorDocument: props.errorDocument,
      removalPolicy: props.bucketRemovalPolicy,
    });

    new BucketCdn(this, `dev-cdn`, { bucket: devBucket.bucket });
    new BucketCdn(this, `prod-cdn`, { bucket: prodBucket.bucket });

    // Pipeline

    new BucketPipeline(this, "pipeline", {
      devBranch: props.devBranch,
      prodBranch: props.prodBranch,
      buildSpecFileLocation: props.buildSpecFileLocation,
      devBucket: devBucket.bucket,
      prodBucket: prodBucket.bucket,
    });
  }
}
