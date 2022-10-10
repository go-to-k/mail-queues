import { StackProps } from "aws-cdk-lib";
import { StackInput } from "./types/stack-input";

export interface ConfigStackProps extends StackProps {
  config: StackInput;
}

export const configStackProps: ConfigStackProps = {
  env: {
    region: "ap-northeast-1",
  },
  config: {
    slackWorkspaceId: "*********",
    slackChannelId: "*********",
    senderAddress: "***@***.***",
  },
};
