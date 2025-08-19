import {
  Client,
  GatewayIntentBits,
  Events,
  Partials,
  VoiceState,
  GuildMember,
  InteractionReplyOptions,
  MessageFlags,
  EmbedBuilder,
} from "discord.js";
import { env } from "../config/env";
import { t } from "../i18n";
import { normalizeEscapes } from "../utils/text";
import { prisma } from "../db/client";

export function createClient(): Client {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel],
  });

  client.once(Events.ClientReady, () => {
    console.log(t("app.started"));
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const name = interaction.commandName;
    try {
      if (name === "invite") {
        const url = `https://discord.com/api/oauth2/authorize?client_id=${env.CLIENT_ID}&permissions=3072&scope=bot%20applications.commands`;
        const embed = new EmbedBuilder()
          .setTitle(t("commands:invite.title"))
          .setDescription(t("commands:invite.description"))
          .setColor(0x7289da);
        await interaction.reply({
          embeds: [embed],
          components: [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 5,
                  label: t("commands:invite.success"),
                  url,
                },
              ],
            },
          ],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      if (name === "config") {
        await handleConfigCommand(interaction);
        return;
      }
    } catch (err) {
      console.error("Command error:", err);
      try {
        await interaction.reply({
          content: t("errors.unexpected"),
          flags: MessageFlags.Ephemeral,
        });
      } catch (replyErr) {
        console.error("Failed to reply with error:", replyErr);
      }
    }
  });

  client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    await handleVoiceStateUpdate(oldState, newState);
  });

  client.on(Events.GuildCreate, async (guild) => {
    await prisma.guildConfig.upsert({
      where: { guildId: guild.id },
      create: {
        guildId: guild.id,
        defaultLocale: env.DEFAULT_LOCALE,
        defaultTimezone: env.DEFAULT_TIMEZONE,
      },
      update: {},
    });
  });

  return client;
}

async function userHasConfigPermission(interaction: any): Promise<boolean> {
  if (!interaction.inCachedGuild()) return false;
  const member = interaction.member as GuildMember;
  if (member.permissions.has("Administrator")) return true;
  const guildId = interaction.guildId!;
  const gc = await prisma.guildConfig.findUnique({
    where: { guildId },
    include: { allowedRoles: true, allowedUsers: true },
  });
  if (!gc) return false;
  if ((gc.allowedUsers ?? []).some((u: any) => u.userId === member.id))
    return true;
  const memberRoles = new Set(member.roles.cache.keys());
  if ((gc.allowedRoles ?? []).some((r: any) => memberRoles.has(r.roleId)))
    return true;
  return false;
}

async function userHasAdminPermission(interaction: any): Promise<boolean> {
  if (!interaction.inCachedGuild()) return false;
  const member = interaction.member as GuildMember;
  if (member.permissions.has("Administrator")) return true;
  const guildId = interaction.guildId!;
  const gc = await prisma.guildConfig.findUnique({
    where: { guildId },
    include: { allowedRoles: true, allowedUsers: true },
  });
  if (!gc) return false;
  if (
    (gc.allowedUsers ?? []).some(
      (u: any) => u.userId === member.id && u.isAdmin
    )
  )
    return true;
  const memberRoles = new Set(member.roles.cache.keys());
  if (
    (gc.allowedRoles ?? []).some(
      (r: any) => r.isAdmin && memberRoles.has(r.roleId)
    )
  )
    return true;
  return false;
}

async function handleConfigCommand(interaction: any): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({
      content: t("errors.unexpected"),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const group = interaction.options.getSubcommandGroup(false);
  const sub = interaction.options.getSubcommand(false);
  const isAdminOp =
    ["set-default"].includes(sub ?? "") || group === "permissions";
  const hasPerm = isAdminOp
    ? await userHasAdminPermission(interaction)
    : await userHasConfigPermission(interaction);
  if (!hasPerm) {
    await interaction.reply({
      content: t("errors.missing_permissions"),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const guildId = interaction.guildId!;

  await prisma.guildConfig.upsert({
    where: { guildId },
    create: {
      guildId,
      defaultLocale: env.DEFAULT_LOCALE,
      defaultTimezone: env.DEFAULT_TIMEZONE,
    },
    update: {},
  });

  if (!group && sub === "set-default") {
    const defaultLocale = interaction.options.getString("locale") ?? undefined;
    const defaultTimezone =
      interaction.options.getString("timezone") ?? undefined;
    const defaultMessageTemplate =
      interaction.options.getString("message") ?? undefined;
    await prisma.guildConfig.update({
      where: { guildId },
      data: { defaultLocale, defaultTimezone, defaultMessageTemplate },
    });
    await interaction.reply({
      content: t("commands:config.saved"),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!group && sub === "add-watcher") {
    const isAdminOp = await userHasAdminPermission(interaction);
    const targetUser = interaction.options.getUser("user") ?? interaction.user;
    if (!isAdminOp && targetUser.id !== interaction.user.id) {
      await interaction.reply({
        content: t("errors.missing_permissions"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const user = targetUser;
    const enabled = interaction.options.getBoolean("enabled") ?? undefined;
    const notifySelfJoin =
      interaction.options.getBoolean("notify_self_join") ?? undefined;
    const notifyWhileWatcherInVoice =
      interaction.options.getBoolean("notify_while_in_voice") ?? undefined;
    const notifyOnMove =
      interaction.options.getBoolean("notify_on_move") ?? undefined;
    const cooldownSeconds =
      interaction.options.getInteger("cooldown") ?? undefined;
    const messageTemplate =
      interaction.options.getString("message") ?? undefined;
    const locale = interaction.options.getString("locale") ?? undefined;
    const timezone = interaction.options.getString("timezone") ?? undefined;

    await prisma.watcherConfig.upsert({
      where: { guildId_userId: { guildId, userId: user.id } },
      update: {
        enabled: enabled ?? undefined,
        notifySelfJoin: notifySelfJoin ?? undefined,
        notifyWhileWatcherInVoice: notifyWhileWatcherInVoice ?? undefined,
        notifyOnMove: notifyOnMove ?? undefined,
        cooldownSeconds: cooldownSeconds ?? undefined,
        messageTemplate: messageTemplate ?? undefined,
        locale: locale ?? undefined,
        timezone: timezone ?? undefined,
      },
      create: {
        guildId,
        userId: user.id,
        enabled: enabled ?? true,
        notifySelfJoin: notifySelfJoin ?? false,
        notifyWhileWatcherInVoice: notifyWhileWatcherInVoice ?? true,
        notifyOnMove: notifyOnMove ?? false,
        cooldownSeconds: cooldownSeconds ?? 60,
        messageTemplate: messageTemplate ?? null,
        locale: locale ?? null,
        timezone: timezone ?? null,
      },
    });
    await interaction.reply({
      content: t("commands:watcher.updated"),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!group && sub === "remove-watcher") {
    const isAdminOp = await userHasAdminPermission(interaction);
    const targetUser = interaction.options.getUser("user") ?? interaction.user;
    if (!isAdminOp && targetUser.id !== interaction.user.id) {
      await interaction.reply({
        content: t("errors.missing_permissions"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const user = targetUser;
    await prisma.watcherConfig.deleteMany({
      where: { guildId, userId: user.id },
    });
    await interaction.reply({
      content: t("commands:watcher.removed"),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (group === "permissions") {
    if (sub === "add-role") {
      const role = interaction.options.getRole("role", true);
      const isAdmin = interaction.options.getBoolean("admin") ?? false;
      await prisma.allowedRole.upsert({
        where: { guildId_roleId: { guildId, roleId: role.id } },
        update: { isAdmin },
        create: { guildId, roleId: role.id, isAdmin },
      });
      await interaction.reply({
        content: t("commands:permissions.role.allowed"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (sub === "remove-role") {
      const role = interaction.options.getRole("role", true);
      await prisma.allowedRole.deleteMany({
        where: { guildId, roleId: role.id },
      });
      await interaction.reply({
        content: t("commands:permissions.role.removed"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (sub === "add-user") {
      const user = interaction.options.getUser("user", true);
      const isAdmin = interaction.options.getBoolean("admin") ?? false;
      await prisma.allowedUser.upsert({
        where: { guildId_userId_allowed: { guildId, userId: user.id } },
        update: { isAdmin },
        create: { guildId, userId: user.id, isAdmin },
      });
      await interaction.reply({
        content: t("commands:permissions.user.allowed"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (sub === "remove-user") {
      const user = interaction.options.getUser("user", true);
      await prisma.allowedUser.deleteMany({
        where: { guildId, userId: user.id },
      });
      await interaction.reply({
        content: t("commands:permissions.user.removed"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (sub === "list") {
      const gc = await prisma.guildConfig.findUnique({
        where: { guildId },
        include: { allowedRoles: true, allowedUsers: true },
      });
      const none = t("commands:permissions.list.none");
      const adminRoles =
        gc?.allowedRoles
          ?.filter((r) => r.isAdmin)
          .map((r) => `<@&${r.roleId}>`)
          .join(", ") || none;
      const userRoles =
        gc?.allowedRoles
          ?.filter((r) => !r.isAdmin)
          .map((r) => `<@&${r.roleId}>`)
          .join(", ") || none;
      const adminUsers =
        gc?.allowedUsers
          ?.filter((u) => u.isAdmin)
          .map((u) => `<@${u.userId}>`)
          .join(", ") || none;
      const userUsers =
        gc?.allowedUsers
          ?.filter((u) => !u.isAdmin)
          .map((u) => `<@${u.userId}>`)
          .join(", ") || none;

      const embed = new EmbedBuilder()
        .setTitle(t("commands:permissions.title"))
        .setColor(0x7289da)
        .addFields(
          {
            name: `__**${t("commands:permissions.list.usage_title")}**__`,
            value: `**${t(
              "commands:permissions.list.users_label"
            )}** \n${userUsers} \n**${t(
              "commands:permissions.list.roles_label"
            )}** \n${userRoles}`,
            inline: true,
          },
          {
            name: `__**${t("commands:permissions.list.admin_title")}**__`,
            value: `**${t(
              "commands:permissions.list.users_label"
            )}** \n${adminUsers} \n**${t(
              "commands:permissions.list.roles_label"
            )}** \n${adminRoles}`,
            inline: true,
          }
        )
        .setTimestamp();

      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
  }

  if (!group && sub === "view") {
    const gc = await prisma.guildConfig.findUnique({
      where: { guildId },
      include: { watchers: true },
    });
    const isAdminOp = await userHasAdminPermission(interaction);
    const me = interaction.user;
    const myWatcher = gc?.watchers.find((w) => w.userId === me.id);

    const embed = new EmbedBuilder()
      .setTitle(t("commands:config.view.title"))
      .setColor(0x7289da)
      .setTimestamp();

    if (isAdminOp && gc) {
      const resolvedLocale = gc.defaultLocale ?? env.DEFAULT_LOCALE;
      const resolvedTimezone = gc.defaultTimezone ?? env.DEFAULT_TIMEZONE;
      embed.addFields({
        name: t("commands:config.view.server"),
        value: `**${t(
          "commands:config.view.labels.locale"
        )}:** ${resolvedLocale}\n**${t(
          "commands:config.view.labels.timezone"
        )}:** ${resolvedTimezone}\n**Message Template:** ${
          gc.defaultMessageTemplate || "Using default template"
        }`,
        inline: false,
      });
    }

    if (myWatcher) {
      embed.addFields({
        name: t("commands:config.view.user"),
        value: `**${t("commands:config.view.labels.enabled")}:** ${
          myWatcher.enabled ? "✅" : "❌"
        }\n**${t("commands:config.view.labels.self_join")}:** ${
          myWatcher.notifySelfJoin ? "✅" : "❌"
        }\n**${t("commands:config.view.labels.while_in_voice")}:** ${
          myWatcher.notifyWhileWatcherInVoice ? "✅" : "❌"
        }\n**${t("commands:config.view.labels.on_move")}:** ${
          myWatcher.notifyOnMove ? "✅" : "❌"
        }\n**${t("commands:config.view.labels.cooldown")}:** ${
          myWatcher.cooldownSeconds
        }s\n**${t("commands:config.view.labels.locale")}:** ${
          myWatcher.locale || "inherit"
        }\n**${t("commands:config.view.labels.timezone")}:** ${
          myWatcher.timezone || "inherit"
        }`,
        inline: false,
      });
    } else {
      embed.addFields({
        name: t("commands:config.view.user"),
        value: t("commands:config.view.user.none"),
        inline: false,
      });
    }

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.reply({
    content: t("errors.unexpected"),
    flags: MessageFlags.Ephemeral,
  });
}

async function handleVoiceStateUpdate(
  oldState: VoiceState,
  newState: VoiceState
): Promise<void> {
  const guildId = newState.guild.id;
  const wasIn = !!oldState.channelId;
  const isIn = !!newState.channelId;
  if (!wasIn && !isIn) return;

  const moved = wasIn && isIn && oldState.channelId !== newState.channelId;
  const joined = !wasIn && isIn;
  if (!moved && !joined) return;

  const config = await prisma.guildConfig.findUnique({
    where: { guildId },
    include: { watchers: true },
  });
  if (!config) return;

  const actorId = newState.id;
  const serverName = newState.guild.name;
  const channelName = newState.channel?.name ?? oldState.channel?.name ?? "";

  for (const watcher of config.watchers) {
    if (!watcher.enabled) continue;
    if (actorId === watcher.userId && !watcher.notifySelfJoin) continue;
    if (moved && !watcher.notifyOnMove) continue;

    const member = await newState.guild.members
      .fetch(watcher.userId)
      .catch(() => null);
    if (!member) continue;
    const inVoice = member.voice.channelId != null;
    if (inVoice && !watcher.notifyWhileWatcherInVoice) continue;

    const locale = watcher.locale ?? config.defaultLocale ?? env.DEFAULT_LOCALE;
    const templateRaw =
      watcher.messageTemplate ??
      config.defaultMessageTemplate ??
      t("notifications:voice.default");
    const template = normalizeEscapes(templateRaw);

    const timezone =
      watcher.timezone ?? config.defaultTimezone ?? env.DEFAULT_TIMEZONE;
    let date: string;
    try {
      date = new Date().toLocaleString(locale.replace("_", "-"), {
        timeZone: timezone,
      });
    } catch (err) {
      console.warn(`Invalid timezone "${timezone}", falling back to UTC`);
      date = new Date().toLocaleString(locale.replace("_", "-"), {
        timeZone: "UTC",
      });
    }
    const content = template
      .replace("{me}", member.displayName)
      .replace("{user}", newState.member?.displayName ?? "Someone")
      .replace("{channel}", channelName)
      .replace("{server}", serverName)
      .replace("{date}", date);

    const voiceUrl = newState.channelId
      ? `https://discord.com/channels/${newState.guild.id}/${newState.channelId}`
      : undefined;

    const notificationEmbed = new EmbedBuilder()
      .setTitle(t("notifications:voice.title"))
      .setDescription(content)
      .setColor(0x7289da)
      .setTimestamp();

    if (voiceUrl) {
      notificationEmbed.addFields({
        name: t("notifications:voice.join"),
        value: `[${channelName}](${voiceUrl})`,
        inline: false,
      });
    }

    await member.send({ embeds: [notificationEmbed] }).catch(() => undefined);
  }
}
