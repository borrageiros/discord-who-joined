import { z } from "zod";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const schema = z.object({
  TOKEN: z.string().min(1),
  CLIENT_ID: z.string().min(1),
  DEFAULT_LOCALE: z.string().default("en"),
  DEFAULT_TIMEZONE: z.string().default("UTC"),
});

export const env = schema.parse({
  TOKEN: process.env.TOKEN,
  CLIENT_ID: process.env.CLIENT_ID,
  DEFAULT_LOCALE: process.env.DEFAULT_LOCALE ?? "en",
  DEFAULT_TIMEZONE: process.env.DEFAULT_TIMEZONE ?? "UTC",
});

export function ensureDataDir(): void {
  const dataPath = path.resolve(process.cwd(), "data");
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }
}
