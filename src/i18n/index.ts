import i18next from "i18next";
import Backend from "i18next-fs-backend";
import path from "path";
import { env } from "../config/env";

export async function initI18n(): Promise<void> {
  await i18next.use(Backend).init({
    lng: env.DEFAULT_LOCALE,
    fallbackLng: "en",
    preload: ["en", "es"],
    backend: {
      loadPath: path.join(process.cwd(), "locales/{{lng}}/{{ns}}.json"),
    },
    ns: ["common", "commands", "notifications"],
    defaultNS: "common",
    interpolation: {
      escapeValue: false,
    },
  });
}

export function t(key: string, options?: Record<string, unknown>): string {
  const result = i18next.t(key, options as never);
  return typeof result === "string" ? result : String(result);
}
