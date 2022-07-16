import { z } from "zod";

export const StackInputSchema = z.object({
  slackWorkspaceId: z.string().min(1),
  slackChannelId: z.string().min(1),
  senderAddress: z.string().email().min(1),
});

export type StackInput = z.infer<typeof StackInputSchema>;
