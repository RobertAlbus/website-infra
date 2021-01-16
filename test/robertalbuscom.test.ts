import {
  expect as expectCDK,
  matchTemplate,
  MatchStyle,
} from "@aws-cdk/assert";
import * as cdk from "@aws-cdk/core";
import {
  StaticWebsite,
  StaticWebsiteProps,
} from "../lib/stacks/static-website";

test("Empty Stack", () => {
  const app = new cdk.App();

  // WHEN
  const props: StaticWebsiteProps = {
    rootDocument: "",
    errorDocument: "",
    devBranch: "",
    prodBranch: "",
    buildSpecFileLocation: "",
  };
  const stack = new StaticWebsite(app, "MyTestStack", props);

  // THEN
  expectCDK(stack).to(
    matchTemplate(
      {
        Resources: {},
      },
      MatchStyle.EXACT
    )
  );
});
