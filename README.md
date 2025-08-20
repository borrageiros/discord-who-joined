# Discord Who Joined Bot

Get a private DM when someone joins a voice channel in your server.

## ✨ What is this?

This bot watches voice channels and notifies selected users (watchers) with a private, nice-looking embed whenever someone joins or moves channels. It is multi-guild, supports per-user preferences, and offers a clear permission model: normal users vs bot administrators. User-facing messages support i18n (English/Spanish).

## 🧱 Tech Stack

- Node.js 18+, TypeScript
- discord.js v14
- Prisma + SQLite (stored at `./data/data.db`)
- i18next (en/es), Zod, Nodemon

## 🧩 Key Features

- 🔔 Private notifications (embeds) on voice join/move with a direct link to the channel
- 🛡️ Permission levels: normal users vs bot administrators
- 🧑‍🤝‍🧑 Per-guild and per-user configuration (watchers)
- 🌐 i18n (English/Spanish)
- 🧰 Slash commands with ephemeral responses
- 🗂️ Simple persistence with SQLite

## 🚀 Docker (production)

Two tags are suggested by default: `latest` (amd64) and `arm64`.

Build images:

```bash
# amd64 (default)
docker pull borrageiros/discord-who-joined:latest

# arm64 (example: Raspberry Pi)
docker pull borrageiros/discord-who-joined:arm64
```

Run the container (persist DB and set envs):

```bash
docker run -d \
  --name who-joined \
  -e TOKEN=YOUR_BOT_TOKEN \
  -e CLIENT_ID=YOUR_APP_CLIENT_ID \
  -e DEFAULT_LOCALE=en \
  -e DEFAULT_TIMEZONE=UTC \
  -v $(pwd)/data:/app/data \
  borrageiros/discord-who-joined:latest
```

Notes:

- The database is stored at `/app/data/data.db` inside the container (mapped to `./data` on the host).
- On start, migrations run automatically and the bot launches.

## 🧪 Development (Node)

1. Prepare env

```bash
cp .env.example .env
# Edit TOKEN, CLIENT_ID, DEFAULT_LOCALE, DEFAULT_TIMEZONE
```

2. Install and setup

```bash
yarn
yarn prisma:generate
yarn prisma:dev:migrate
yarn register:commands
```

3. Run in watch mode

```bash
yarn dev
```

## 🧭 Commands (overview)

- `/invite` — shows an embed with a button to invite the bot
- `/config view` — shows your personal config; if you are bot admin, also shows the server config
- `/config server-config` — set server configuration (admins only)
- `/config add-watcher` — add a watcher; admins can add anyone, allowed users can add themselves
- `/config watcher-config` — configure watcher profile; admins can edit anyone, allowed users can edit themselves
- `/config remove-watcher` — remove a watcher; admins can remove anyone, allowed users can remove themselves
- `/config permissions *` — manage who can use the bot and who is bot admin (admins only)

## 🔐 Permissions Model

- Bot Admins: server admins, users/roles explicitly marked as admin via `/config permissions add-* admin:true`.
- Normal Users: users/roles allowed via `/config permissions add-*` (no admin flag).

## ⚙️ Intents & Requirements

- Gateway Intents: Guilds, GuildVoiceStates, DirectMessages (optionally GuildMembers if you rely on role checks server-side).
- Make sure to enable the privileged intents you need in the Discord Developer Portal.

## 🌍 i18n

- Default locale and timezone can be set via env: `DEFAULT_LOCALE`, `DEFAULT_TIMEZONE`.
- Server configs are initialized on first contact using these env defaults and can be changed later.

## 🧾 Environment Variables

- `TOKEN` — Discord bot token
- `CLIENT_ID` — Application client ID
- `DEFAULT_LOCALE` — `en` or `es` (default: `en`)
- `DEFAULT_TIMEZONE` — IANA TZ (e.g. `UTC`, `Europe/Madrid`)

## 🆘 Troubleshooting

- If slash commands don’t show up, re-run: `yarn register:commands` and restart discord (Ctrl+R).
- If Prisma types look outdated, run: `yarn prisma:generate`.

Enjoy! 🎉
