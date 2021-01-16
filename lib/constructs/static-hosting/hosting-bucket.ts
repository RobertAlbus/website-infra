import { Bucket } from "@aws-cdk/aws-s3";
import { Construct, RemovalPolicy } from "@aws-cdk/core";

export type WebsiteBucketProps = {
  rootDocument?: string;
  errorDocument?: string;
  removalPolicy?: RemovalPolicy;
};
export class WebsiteBucket extends Construct {
  bucket: Bucket;

  constructor(scope: Construct, id: string, props?: WebsiteBucketProps) {
    super(scope, id);
    props = props || {};

    props.rootDocument = props.rootDocument || "index.html";
    props.errorDocument = props.errorDocument || "index.html";
    props.rootDocument = props.removalPolicy || RemovalPolicy.RETAIN;

    this.bucket = new Bucket(this, `${id}-bucket`, {
      websiteIndexDocument: props.rootDocument,
      websiteErrorDocument: props.errorDocument,
      removalPolicy: props.removalPolicy,
    });
  }
}
