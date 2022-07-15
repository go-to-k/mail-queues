import { z } from "zod";

export const MailRequestSchema = z.object({
  mailKey: z.string().min(1),
  subject: z.string(),
  body: z.string(),
  toAddress: z.string().min(1),
  attachedFileKeys: z.array(z.string().min(1)).optional(),
});

export type MailRequest = z.infer<typeof MailRequestSchema>;
