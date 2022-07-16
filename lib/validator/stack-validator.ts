import { IValidation } from "constructs";
import { StackInput, StackInputSchema } from "../types/stack-input";

export class StackValidator implements IValidation {
  private slackWorkspaceId: string;
  private slackChannelId: string;
  private senderAddress: string;

  constructor(slackWorkspaceId: string, slackChannelId: string, senderAddress: string) {
    this.slackWorkspaceId = slackWorkspaceId;
    this.slackChannelId = slackChannelId;
    this.senderAddress = senderAddress;
  }

  public validate(): string[] {
    const errors: string[] = [];

    try {
      const stackInput: StackInput = StackInputSchema.parse({
        slackWorkspaceId: this.slackWorkspaceId,
        slackChannelId: this.slackChannelId,
        senderAddress: this.senderAddress,
      });
    } catch (e) {
      errors.push(JSON.stringify(e));
    }

    return errors;
  }
}
