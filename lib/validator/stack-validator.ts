import { IValidation } from "constructs";
import { StackInput, StackInputSchema } from "../types/stack-input";

export class StackValidator implements IValidation {
  private stackInput: StackInput;

  constructor(stackInput: StackInput) {
    this.stackInput = stackInput;
  }

  public validate(): string[] {
    const errors: string[] = [];

    try {
      StackInputSchema.parse(this.stackInput);
    } catch (e) {
      errors.push(JSON.stringify(e));
    }

    return errors;
  }
}
