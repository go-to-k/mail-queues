import { App, assertions } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { ConfigStackProps } from "../lib/config";
import { MailQueuesStack } from "../lib/resource/mail-queues-stack";

const getTemplate = (input: {
  slackWorkspaceId: string;
  slackChannelId: string;
  senderAddress: string;
  region: string;
}): assertions.Template => {
  const { slackWorkspaceId, slackChannelId, senderAddress, region } = input;

  const testSlackWorkspaceId = slackWorkspaceId;
  const testSlackChannelId = slackChannelId;
  const testSenderAddress = senderAddress;
  const testRegion = region;

  const testConfigStackProps: ConfigStackProps = {
    env: {
      region: testRegion,
    },
    config: {
      slackWorkspaceId: testSlackWorkspaceId,
      slackChannelId: testSlackChannelId,
      senderAddress: testSenderAddress,
    },
  };

  const app = new App();
  const stack = new MailQueuesStack(app, "MailQueuesStack", testConfigStackProps);
  return Template.fromStack(stack);
};

describe("Snapshot Tests", () => {
  const region = "ap-northeast-1";
  const input = {
    slackWorkspaceId: "slackWorkspaceId",
    slackChannelId: "slackChannelId",
    senderAddress: "senderAddress@test.test",
    region,
  };
  const template = getTemplate(input);

  test("Snapshot test", () => {
    expect(template.toJSON()).toMatchSnapshot();
  });
});

describe("Fine-grained Assertions Tests", () => {
  const region = "ap-northeast-1";
  const input = {
    slackWorkspaceId: "slackWorkspaceId",
    slackChannelId: "slackChannelId",
    senderAddress: "senderAddress@test.test",
    region,
  };
  const template = getTemplate(input);

  test("Bucket created", () => {
    template.resourceCountIs("AWS::S3::Bucket", 1);
  });

  test("DynamoDB created", () => {
    template.resourceCountIs("AWS::DynamoDB::Table", 1);
  });

  test("IAM Role created", () => {
    template.resourceCountIs("AWS::IAM::Role", 3); // +1 for "autoDeleteObjects: true" in the Bucket
  });

  test("IAM Policy created", () => {
    template.resourceCountIs("AWS::IAM::Policy", 1);
  });

  test("Lambda created", () => {
    template.resourceCountIs("AWS::Lambda::Function", 2); // +1 for "autoDeleteObjects: true" in the Bucket
  });

  test("EventSourceMapping created", () => {
    template.resourceCountIs("AWS::Lambda::EventSourceMapping", 1);
  });

  test("SQS created", () => {
    template.resourceCountIs("AWS::SQS::Queue", 2);
  });

  test("Topic created", () => {
    template.resourceCountIs("AWS::SNS::Topic", 1);
  });

  test("Chatbot created", () => {
    template.resourceCountIs("AWS::Chatbot::SlackChannelConfiguration", 1);
  });

  test("Alarm created", () => {
    template.resourceCountIs("AWS::CloudWatch::Alarm", 1);
  });
});

describe("Validation Tests", () => {
  const region = "ap-northeast-1";

  test("slackWorkspaceId is empty", () => {
    const input = {
      slackWorkspaceId: "",
      slackChannelId: "slackChannelId",
      senderAddress: "senderAddress@test.test",
      region,
    };

    expect(() => {
      getTemplate(input);
    }).toThrow(
      /{"issues":\[{"code":"too_small","minimum":1,"type":"string","inclusive":true,"message":"String must contain at least 1 character\(s\)","path":\["slackWorkspaceId"\]}\],"name":"ZodError"}/,
    );
  });

  test("slackChannelId is empty", () => {
    const input = {
      slackWorkspaceId: "slackWorkspaceId",
      slackChannelId: "",
      senderAddress: "senderAddress@test.test",
      region,
    };

    expect(() => {
      getTemplate(input);
    }).toThrow(
      /{"issues":\[{"code":"too_small","minimum":1,"type":"string","inclusive":true,"message":"String must contain at least 1 character\(s\)","path":\["slackChannelId"\]}\],"name":"ZodError"}/,
    );
  });

  test("senderAddress is empty", () => {
    const input = {
      slackWorkspaceId: "slackWorkspaceId",
      slackChannelId: "slackChannelId",
      senderAddress: "",
      region,
    };

    expect(() => {
      getTemplate(input);
    }).toThrow(
      /{"issues":\[{"validation":"email","code":"invalid_string","message":"Invalid email","path":\["senderAddress"\]},{"code":"too_small","minimum":1,"type":"string","inclusive":true,"message":"String must contain at least 1 character\(s\)","path":\["senderAddress"\]}\],"name":"ZodError"}/,
    );
  });

  test("senderAddress is invalid", () => {
    const input = {
      slackWorkspaceId: "slackWorkspaceId",
      slackChannelId: "slackChannelId",
      senderAddress: "senderAddress.test.test",
      region,
    };

    expect(() => {
      getTemplate(input);
    }).toThrow(
      /{"issues":\[{"validation":"email","code":"invalid_string","message":"Invalid email","path":\["senderAddress"\]}\],"name":"ZodError"}/,
    );
  });
});
