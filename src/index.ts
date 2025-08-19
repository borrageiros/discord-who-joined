import { initI18n } from "./i18n";
import { createClient } from "./discord/bot";
import { env } from "./config/env";

async function main(): Promise<void> {
  await initI18n();
  const client = createClient();
  await client.login(env.TOKEN);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
