import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { MailQueuesStack } from "../lib/resource/mail-queues-stack";
import _cdkJsonRaw from "../cdk.json";

export type CdkJson = typeof _cdkJsonRaw;
export type PartialContext = Partial<Pick<CdkJson, "context">["context"]>;

const getTemplate = (input: {
  slackWorkspaceId?: string;
  slackChannelId?: string;
  senderAddress?: string;
  region?: string;
}): cdk.assertions.Template => {
  const _cdkJson: CdkJson = _cdkJsonRaw;
  const partialContext: PartialContext = _cdkJson.context;
  const { slackWorkspaceId, slackChannelId, senderAddress, region } = input;

  partialContext.slackWorkspaceId = slackWorkspaceId;
  partialContext.slackChannelId = slackChannelId;
  partialContext.senderAddress = senderAddress;
  partialContext.region = region;

  const app = new cdk.App({
    context: partialContext,
  });
  const regionContext = app.node.tryGetContext("region") ?? "";
  const stack = new MailQueuesStack(app, "MailQueuesStack", {
    env: {
      region: regionContext,
    },
  });
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
    template.resourceCountIs("AWS::IAM::Role", 2);
  });

  test("IAM Policy created", () => {
    template.resourceCountIs("AWS::IAM::Policy", 1);
  });

  test("Lambda created", () => {
    template.resourceCountIs("AWS::Lambda::Function", 1);
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

  test("slackWorkspaceId is undefined", () => {
    const input = {
      slackWorkspaceId: undefined,
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

  test("slackChannelId is undefined", () => {
    const input = {
      slackWorkspaceId: "slackWorkspaceId",
      slackChannelId: undefined,
      senderAddress: "senderAddress@test.test",
      region,
    };

    expect(() => {
      getTemplate(input);
    }).toThrow(
      /{"issues":\[{"code":"too_small","minimum":1,"type":"string","inclusive":true,"message":"String must contain at least 1 character\(s\)","path":\["slackChannelId"\]}\],"name":"ZodError"}/,
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

  test("senderAddress is undefined", () => {
    const input = {
      slackWorkspaceId: "slackWorkspaceId",
      slackChannelId: "slackChannelId",
      senderAddress: undefined,
      region,
    };

    expect(() => {
      getTemplate(input);
    }).toThrow(
      /{"issues":\[{"validation":"email","code":"invalid_string","message":"Invalid email","path":\["senderAddress"\]},{"code":"too_small","minimum":1,"type":"string","inclusive":true,"message":"String must contain at least 1 character\(s\)","path":\["senderAddress"\]}\],"name":"ZodError"}/,
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
