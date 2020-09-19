import * as certificateManager from '@aws-cdk/aws-certificatemanager';
import * as cdk from '@aws-cdk/core';
import * as route53 from '@aws-cdk/aws-route53';
import { CloudFrontWebDistribution } from '@aws-cdk/aws-cloudfront';


export type HostedZoneForCloudfrontProps = {
    domainName: string;
    cloudfrontWebDistribution: CloudFrontWebDistribution
}
export type HostedZoneForCloudfrontValues = {

}
export function HostedZoneForCloudfront(scope: cdk.Construct, props: HostedZoneForCloudfrontProps) {

  // create Hosted Zone
  const dns = new route53.HostedZone(scope, 'dns', {
      zoneName: props.domainName
    });

  // point dns cloudfront distribution
  const recordSet = new route53.RecordSet(scope, 'dns-record', {
    recordType: route53.RecordType.A,
    target: route53.RecordTarget.fromIpAddresses(props.cloudfrontWebDistribution.distributionDomainName),
    zone: dns
  });

  // create Certificate
  const certificate = new certificateManager.DnsValidatedCertificate(scope, 'certificate', {
    hostedZone: dns,
    domainName: props.domainName
  });
}