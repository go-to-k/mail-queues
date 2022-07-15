import { z } from "zod";

export const MailRequestSchema = z.object({
  mailKey: z.string().nonempty(),
  subject: z.string(),
  body: z.string(),
  toAddress: z.string().nonempty(),
  attachedFileKeys: z.array(z.string().nonempty()).optional(),
});

export type MailRequest = z.infer<typeof MailRequestSchema>;
