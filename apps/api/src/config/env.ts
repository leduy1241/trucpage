import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development","test","production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  APP_URL: z.string().url().default("http://localhost:3000"),
  SESSION_SECRET: z.string().min(16),
  APP_ENCRYPTION_KEY: z.string().min(16),
  PANCAKE_API_BASE_URL: z.string().url().default("https://pages.fm/api")
});
export const getEnv = () => schema.parse(process.env);
