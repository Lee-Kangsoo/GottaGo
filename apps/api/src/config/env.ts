import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

// Environment parsing is centralized so the rest of the code can rely on
// typed values instead of checking raw process.env strings everywhere.
const envSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  PORT: z.coerce.number().default(4000),
  USE_MOCK_DATA: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((value) => value !== "false"),
});

export const env = envSchema.parse(process.env);
