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
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { env } from "../config/env";
import i18next from "i18next";
import { t } from "../i18n";
import { normalizeEscapes } from "../utils/text";
import { prisma } from "../db/client";

type AllowedRoleLite = { roleId: string; isAdmin: boolean };
type AllowedUserLite = { userId: string; isAdmin: boolean };

async function resolveLocale(
  guildId: string | null,
  userId: string | null
): Promise<string> {
  const fallback = env.DEFAULT_LOCALE;
  if (!guildId || !userId) return fallback;
  const [gc, watcher] = await Promise.all([
    prisma.guildConfig.findUnique({ where: { guildId } }),
    prisma.watcherConfig.findUnique({
      where: { guildId_userId: { guildId, userId } },
    }),
  ]);
  return watcher?.locale ?? gc?.defaultLocale ?? fallback;
}

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
    try {
      if (interaction.isChatInputCommand()) {
        const name = interaction.commandName;
        if (name === "invite") {
          const url = `https://discord.com/api/oauth2/authorize?client_id=${env.CLIENT_ID}&permissions=3072&scope=bot%20applications.commands`;
          const locale = await resolveLocale(
            interaction.inCachedGuild() ? interaction.guildId! : null,
            interaction.user.id
          );
          i18next.changeLanguage(locale);
          const embed = new EmbedBuilder()
            .setTitle(t("commands:app.title"))
            .setDescription(t("commands:invite.description"))
            .setColor(0x7289da)
            .setThumbnail(
              "https://raw.githubusercontent.com/borrageiros/discord-who-joined/refs/heads/main/images/icon.png"
            );
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
          const locale = await resolveLocale(
            interaction.inCachedGuild() ? interaction.guildId! : null,
            interaction.user.id
          );
          i18next.changeLanguage(locale);
          await handleConfigCommand(interaction);
          return;
        }
      }
      if (interaction.isButton()) {
        if (!interaction.inCachedGuild()) {
          if (interaction.isRepliable()) {
            await interaction.reply({
              content: t("errors.unexpected"),
              flags: MessageFlags.Ephemeral,
            });
          }
          return;
        }
        const locale = await resolveLocale(
          interaction.guildId!,
          interaction.user.id
        );
        i18next.changeLanguage(locale);
        const customId = interaction.customId;
        if (customId === "config_create_watcher_self") {
          const hasPerm = await userHasConfigPermission(interaction as any);
          if (!hasPerm) {
            if (interaction.isRepliable()) {
              await interaction.reply({
                content: t("errors.missing_permissions"),
                flags: MessageFlags.Ephemeral,
              });
            }
            return;
          }
          const guildId = interaction.guildId!;
          const existing = await prisma.watcherConfig.findUnique({
            where: { guildId_userId: { guildId, userId: interaction.user.id } },
          });
          if (existing) {
            if (interaction.isRepliable()) {
              await interaction.reply({
                content: t("commands:watcher.already_exists"),
                flags: MessageFlags.Ephemeral,
              });
            }
            return;
          }
          await prisma.watcherConfig.create({
            data: {
              guildId,
              userId: interaction.user.id,
              enabled: true,
              notifySelfJoin: false,
              notifyWhileWatcherInVoice: false,
              notifyOnMove: false,
              notifyOnBotJoin: false,
              messageTemplate: null,
              locale: null,
              timezone: null,
            },
          });
          if (interaction.isRepliable()) {
            const rowView = new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder()
                .setCustomId("config_view_self")
                .setLabel(t("commands:config.view.view.title"))
                .setStyle(ButtonStyle.Secondary)
            );
            await interaction.reply({
              content: t("commands:watcher.added"),
              components: [rowView],
              flags: MessageFlags.Ephemeral,
            });
          }
          return;
        }
        if (customId === "config_view_self") {
          // reuse the same view path
          // call handleConfigCommand with synthesized subcommand 'view'
          (interaction as any).options = {
            getSubcommandGroup: () => null,
            getSubcommand: () => "view",
          };
          await handleConfigCommand(interaction as any);
          return;
        }
      }
    } catch (err) {
      console.error("Command error:", err);
      try {
        if (interaction.isRepliable()) {
          await interaction.reply({
            content: t("errors.unexpected"),
            flags: MessageFlags.Ephemeral,
          });
        }
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
    ["server-config"].includes(sub ?? "") || group === "permissions";
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

  if (!group && sub === "server-config") {
    const defaultLocale = interaction.options.getString("locale") ?? undefined;
    const defaultTimezone =
      interaction.options.getString("timezone") ?? undefined;
    const defaultMessageTemplate =
      interaction.options.getString("message") ?? undefined;
    const defaultTitleTemplate =
      interaction.options.getString("title") ?? undefined;
    await prisma.guildConfig.update({
      where: { guildId },
      data: {
        defaultLocale,
        defaultTimezone,
        defaultMessageTemplate,
        defaultTitleTemplate,
      },
    });
    await interaction.reply({
      content: t("commands:config.saved"),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!group && sub === "watcher-config") {
    const isAdminUser = await userHasAdminPermission(interaction);
    const targetUser = interaction.options.getUser("user") ?? interaction.user;
    if (!isAdminUser && targetUser.id !== interaction.user.id) {
      await interaction.reply({
        content: t("errors.missing_permissions"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const user = targetUser;
    const existing = await prisma.watcherConfig.findUnique({
      where: { guildId_userId: { guildId, userId: user.id } },
    });
    if (!existing) {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("config_create_watcher_self")
          .setLabel(t("commands:config.view.create_button"))
          .setStyle(ButtonStyle.Primary)
      );
      await interaction.reply({
        content: t("commands:watcher.not_found"),
        components: [row],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const enabled = interaction.options.getBoolean("enabled") ?? undefined;
    const notifySelfJoin =
      interaction.options.getBoolean("notify_self_join") ?? undefined;
    const notifyWhileWatcherInVoice =
      interaction.options.getBoolean("notify_while_in_voice") ?? undefined;
    const notifyOnMove =
      interaction.options.getBoolean("notify_on_move") ?? undefined;
    const notifyOnBotJoin =
      interaction.options.getBoolean("notify_on_bot_join") ?? undefined;
    const keepInSync =
      interaction.options.getBoolean("keep_in_sync") ?? undefined;
    const messageTemplate =
      interaction.options.getString("message") ?? undefined;
    const titleTemplate = interaction.options.getString("title") ?? undefined;
    const localeOpt = interaction.options.getString("locale");
    const localeUpdate =
      localeOpt == null
        ? undefined
        : localeOpt === "inherit"
        ? null
        : localeOpt;
    const timezoneOpt = interaction.options.getString("timezone");
    const timezoneUpdate =
      timezoneOpt == null
        ? undefined
        : timezoneOpt === "inherit"
        ? null
        : timezoneOpt;

    await prisma.watcherConfig.update({
      where: { guildId_userId: { guildId, userId: user.id } },
      data: {
        enabled: enabled ?? undefined,
        notifySelfJoin: notifySelfJoin ?? undefined,
        notifyWhileWatcherInVoice: notifyWhileWatcherInVoice ?? undefined,
        notifyOnMove: notifyOnMove ?? undefined,
        notifyOnBotJoin: notifyOnBotJoin ?? undefined,
        keepInSyncAcrossGuilds: keepInSync ?? undefined,
        messageTemplate: messageTemplate ?? undefined,
        titleTemplate: titleTemplate ?? undefined,
        locale: localeUpdate,
        timezone: timezoneUpdate,
      },
    });

    const updatedWatcher = await prisma.watcherConfig.findUnique({
      where: { guildId_userId: { guildId, userId: user.id } },
    });
    const prevKeep = !!(existing as any).keepInSyncAcrossGuilds;
    const targetKeep = keepInSync !== undefined ? keepInSync : prevKeep;
    const shouldPropagate =
      prevKeep || keepInSync === true || (prevKeep && keepInSync === false);
    if (shouldPropagate && updatedWatcher) {
      await prisma.watcherConfig.updateMany({
        where: { userId: user.id, guildId: { not: guildId } },
        data: {
          enabled: updatedWatcher.enabled,
          notifySelfJoin: updatedWatcher.notifySelfJoin,
          notifyWhileWatcherInVoice: updatedWatcher.notifyWhileWatcherInVoice,
          notifyOnMove: updatedWatcher.notifyOnMove,
          notifyOnBotJoin: updatedWatcher.notifyOnBotJoin,
          messageTemplate: updatedWatcher.messageTemplate,
          locale: updatedWatcher.locale,
          timezone: updatedWatcher.timezone,
          keepInSyncAcrossGuilds: targetKeep,
        },
      });
    }

    const rowView = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("config_view_self")
        .setLabel(t("commands:config.view.view.title"))
        .setStyle(ButtonStyle.Secondary)
    );
    await interaction.reply({
      content: t("commands:watcher.updated"),
      components: [rowView],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!group && sub === "add-watcher") {
    const isAdminUser = await userHasAdminPermission(interaction);
    const targetUser = interaction.options.getUser("user") ?? interaction.user;
    if (!isAdminUser && targetUser.id !== interaction.user.id) {
      await interaction.reply({
        content: t("errors.missing_permissions"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const user = targetUser;
    const existing = await prisma.watcherConfig.findUnique({
      where: { guildId_userId: { guildId, userId: user.id } },
    });
    if (existing) {
      await interaction.reply({
        content: t("commands:watcher.already_exists"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const enabled = interaction.options.getBoolean("enabled") ?? undefined;
    const notifySelfJoin =
      interaction.options.getBoolean("notify_self_join") ?? undefined;
    const notifyWhileWatcherInVoice =
      interaction.options.getBoolean("notify_while_in_voice") ?? undefined;
    const notifyOnMove =
      interaction.options.getBoolean("notify_on_move") ?? undefined;
    const notifyOnBotJoin =
      interaction.options.getBoolean("notify_on_bot_join") ?? undefined;
    const keepInSync =
      interaction.options.getBoolean("keep_in_sync") ?? undefined;
    const messageTemplate =
      interaction.options.getString("message") ?? undefined;
    const titleTemplate = interaction.options.getString("title") ?? undefined;
    const localeOpt = interaction.options.getString("locale");
    const localeVal = localeOpt === "inherit" ? null : localeOpt ?? null;
    const timezoneOpt = interaction.options.getString("timezone");
    const timezoneVal = timezoneOpt === "inherit" ? null : timezoneOpt ?? null;

    await prisma.watcherConfig.create({
      data: {
        guildId,
        userId: user.id,
        enabled: enabled ?? true,
        notifySelfJoin: notifySelfJoin ?? false,
        notifyWhileWatcherInVoice: notifyWhileWatcherInVoice ?? false,
        notifyOnMove: notifyOnMove ?? false,
        notifyOnBotJoin: notifyOnBotJoin ?? false,
        keepInSyncAcrossGuilds: keepInSync ?? false,
        messageTemplate: messageTemplate ?? null,
        titleTemplate: titleTemplate ?? null,
        locale: localeVal,
        timezone: timezoneVal,
      },
    });
    const rowView = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("config_view_self")
        .setLabel(t("commands:config.view.view.title"))
        .setStyle(ButtonStyle.Secondary)
    );
    await interaction.reply({
      content: t("commands:watcher.added"),
      components: [rowView],
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
          ?.filter((r: AllowedRoleLite) => r.isAdmin)
          .map((r: AllowedRoleLite) => `<@&${r.roleId}>`)
          .join(", ") || none;
      const userRoles =
        gc?.allowedRoles
          ?.filter((r: AllowedRoleLite) => !r.isAdmin)
          .map((r: AllowedRoleLite) => `<@&${r.roleId}>`)
          .join(", ") || none;
      const adminUsers =
        gc?.allowedUsers
          ?.filter((u: AllowedUserLite) => u.isAdmin)
          .map((u: AllowedUserLite) => `<@${u.userId}>`)
          .join(", ") || none;
      const userUsers =
        gc?.allowedUsers
          ?.filter((u: AllowedUserLite) => !u.isAdmin)
          .map((u: AllowedUserLite) => `<@${u.userId}>`)
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

  if (group === "exclude") {
    const isAdminUser = await userHasAdminPermission(interaction);
    const targetUser =
      interaction.options.getUser("watcher") ?? interaction.user;
    if (!isAdminUser && targetUser.id !== interaction.user.id) {
      await interaction.reply({
        content: t("errors.missing_permissions"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const user = targetUser;
    const watcher = await prisma.watcherConfig.findUnique({
      where: { guildId_userId: { guildId, userId: user.id } },
    });
    if (!watcher) {
      await interaction.reply({
        content: t("commands:watcher.not_found"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (sub === "add-user") {
      const u = interaction.options.getUser("user", true);
      await prisma.excludedUser.upsert({
        where: {
          watcherId_userId_excluded: { watcherId: watcher.id, userId: u.id },
        },
        update: {},
        create: { watcherId: watcher.id, userId: u.id },
      });
      const rowView = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("config_view_self")
          .setLabel(t("commands:config.view.view.title"))
          .setStyle(ButtonStyle.Secondary)
      );
      await interaction.reply({
        content: t("commands:watcher.updated"),
        components: [rowView],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (sub === "remove-user") {
      const u = interaction.options.getUser("user", true);
      await prisma.excludedUser.deleteMany({
        where: { watcherId: watcher.id, userId: u.id },
      });
      const rowView = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("config_view_self")
          .setLabel(t("commands:config.view.view.title"))
          .setStyle(ButtonStyle.Secondary)
      );
      await interaction.reply({
        content: t("commands:watcher.updated"),
        components: [rowView],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (sub === "add-role") {
      const r = interaction.options.getRole("role", true);
      await prisma.excludedRole.upsert({
        where: {
          watcherId_roleId_excluded: { watcherId: watcher.id, roleId: r.id },
        },
        update: {},
        create: { watcherId: watcher.id, roleId: r.id },
      });
      const rowView = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("config_view_self")
          .setLabel(t("commands:config.view.view.title"))
          .setStyle(ButtonStyle.Secondary)
      );
      await interaction.reply({
        content: t("commands:watcher.updated"),
        components: [rowView],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (sub === "remove-role") {
      const r = interaction.options.getRole("role", true);
      await prisma.excludedRole.deleteMany({
        where: { watcherId: watcher.id, roleId: r.id },
      });
      const rowView = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("config_view_self")
          .setLabel(t("commands:config.view.view.title"))
          .setStyle(ButtonStyle.Secondary)
      );
      await interaction.reply({
        content: t("commands:watcher.updated"),
        components: [rowView],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
  }

  if (!group && sub === "view") {
    const gc = await prisma.guildConfig.findUnique({
      where: { guildId },
      include: {
        watchers: { include: { excludedUsers: true, excludedRoles: true } },
      },
    });
    const isAdminOp = await userHasAdminPermission(interaction);
    const me = interaction.user;
    const myWatcher = gc?.watchers.find(
      (w: { userId: string }) => w.userId === me.id
    );

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
        )}:** ${resolvedTimezone}\n**${t(
          "commands:config.view.labels.title_template"
        )}:** ${
          gc.defaultTitleTemplate || t("notifications:voice.title")
        }\n**${t("commands:config.view.labels.message_template")}:** ${
          gc.defaultMessageTemplate || t("notifications:voice.default")
        }`,
        inline: false,
      });
    }

    if (myWatcher) {
      const excludedUsersList =
        (myWatcher as any).excludedUsers
          ?.map((eu: any) => `<@${eu.userId}>`)
          .join(", ") || t("commands:permissions.list.none");
      const excludedRolesList =
        (myWatcher as any).excludedRoles
          ?.map((er: any) => `<@&${er.roleId}>`)
          .join(", ") || t("commands:permissions.list.none");
      const inheritedLocale = gc?.defaultLocale ?? env.DEFAULT_LOCALE;
      const inheritedTimezone = gc?.defaultTimezone ?? env.DEFAULT_TIMEZONE;
      const serverTemplate =
        gc?.defaultMessageTemplate || t("notifications:voice.default");
      const serverTitleTemplate =
        gc?.defaultTitleTemplate || t("notifications:voice.title");
      const localeDisplay =
        myWatcher.locale ||
        (!isAdminOp
          ? `${t("commands:config.view.labels.inherit")} (${inheritedLocale})`
          : t("commands:config.view.labels.inherit"));
      const timezoneDisplay =
        myWatcher.timezone ||
        (!isAdminOp
          ? `${t("commands:config.view.labels.inherit")} (${inheritedTimezone})`
          : t("commands:config.view.labels.inherit"));
      const templateDisplay =
        myWatcher.messageTemplate ||
        (!isAdminOp
          ? `${t("commands:config.view.labels.inherit")} (${serverTemplate})`
          : t("commands:config.view.labels.inherit"));
      const titleTemplateDisplay =
        myWatcher.titleTemplate ||
        (!isAdminOp
          ? `${t(
              "commands:config.view.labels.inherit"
            )} (${serverTitleTemplate})`
          : t("commands:config.view.labels.inherit"));
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
        }\n**${t("commands:config.view.labels.on_bot_join")}:** ${
          (myWatcher as any).notifyOnBotJoin ? "✅" : "❌"
        }\n**${t(
          "commands:config.view.labels.locale"
        )}:** ${localeDisplay}\n**${t(
          "commands:config.view.labels.timezone"
        )}:** ${timezoneDisplay}\n**${t(
          "commands:config.view.labels.title_template"
        )}:** ${titleTemplateDisplay}\n**${t(
          "commands:config.view.labels.message_template"
        )}:** ${templateDisplay}\n**${t(
          "commands:config.view.labels.keep_in_sync"
        )}:** ${
          (myWatcher as any).keepInSyncAcrossGuilds ? "✅" : "❌"
        }\n\n__**${t("commands:config.view.exclusive_title")}**__\n**${t(
          "commands:config.view.labels.excluded_users"
        )}:** ${excludedUsersList}\n**${t(
          "commands:config.view.labels.excluded_roles"
        )}:** ${excludedRolesList}`,
        inline: false,
      });
    } else {
      embed.addFields({
        name: t("commands:config.view.user"),
        value: `${t("commands:config.view.user.none")}\n${t(
          "commands:config.view.create_hint"
        )}`,
        inline: false,
      });
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("config_create_watcher_self")
          .setLabel(t("commands:config.view.create_button"))
          .setStyle(ButtonStyle.Primary)
      );
      await interaction.reply({
        embeds: [embed],
        components: [row],
        flags: MessageFlags.Ephemeral,
      });
      return;
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
    include: {
      watchers: { include: { excludedUsers: true, excludedRoles: true } },
    },
  });
  if (!config) return;

  const actorId = newState.id;
  const serverName = newState.guild.name;
  const channelName = newState.channel?.name ?? oldState.channel?.name ?? "";

  for (const watcher of config.watchers) {
    if (!watcher.enabled) continue;
    if (actorId === watcher.userId && !watcher.notifySelfJoin) continue;
    if (moved && !watcher.notifyOnMove) continue;
    if (newState.member?.user.bot && !watcher.notifyOnBotJoin) continue;

    const member = await newState.guild.members
      .fetch(watcher.userId)
      .catch(() => null);
    if (!member) continue;
    const inVoice = member.voice.channelId != null;
    if (inVoice && !watcher.notifyWhileWatcherInVoice) continue;

    const actorUserId = newState.member?.id;
    const actorRoles = newState.member?.roles?.cache
      ? new Set(newState.member.roles.cache.keys())
      : new Set<string>();
    if (
      actorUserId &&
      (watcher.excludedUsers ?? []).some((eu: any) => eu.userId === actorUserId)
    )
      continue;
    if (
      (watcher.excludedRoles ?? []).some((er: any) => actorRoles.has(er.roleId))
    )
      continue;

    const locale = watcher.locale ?? config.defaultLocale ?? env.DEFAULT_LOCALE;
    i18next.changeLanguage(locale);
    const templateRaw =
      watcher.messageTemplate ??
      config.defaultMessageTemplate ??
      t("notifications:voice.default");
    const hasShowUserImage = templateRaw.includes("{showUserImage}");
    const hasShowServerInfo = templateRaw.includes("{showServerInfo}");
    const hasChannelLink = templateRaw.includes("{channelLink}");
    const hasShowDate = templateRaw.includes("{showDate}");
    const sanitizedTemplateRaw = templateRaw
      .replace(/\{showUserImage\}/g, "")
      .replace(/\{showServerInfo\}/g, "")
      .replace(/\{channelLink\}/g, "")
      .replace(/\{showDate\}/g, "");
    const template = normalizeEscapes(sanitizedTemplateRaw);

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

    const titleRaw =
      watcher.titleTemplate ??
      config.defaultTitleTemplate ??
      t("notifications:voice.title");
    const title = normalizeEscapes(
      titleRaw
        .replace(/\{me\}/g, member.displayName)
        .replace(/\{user\}/g, newState.member?.displayName ?? "Someone")
        .replace(/\{channel\}/g, channelName)
        .replace(/\{server\}/g, serverName)
        .replace(/\{date\}/g, date)
    );

    const notificationEmbed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(content)
      .setColor(0x7289da);

    if (hasShowDate) {
      notificationEmbed.setTimestamp();
    }

    const serverIcon = newState.guild.iconURL({ size: 256 }) ?? undefined;
    if (hasShowServerInfo && serverIcon) {
      notificationEmbed.setAuthor({ name: serverName, iconURL: serverIcon });
    }
    const actorAvatar =
      newState.member?.displayAvatarURL({ size: 128 }) ?? undefined;
    if (hasShowUserImage && actorAvatar) {
      notificationEmbed.setThumbnail(actorAvatar);
    }

    if (hasChannelLink && voiceUrl) {
      notificationEmbed.addFields({
        name: t("notifications:voice.join"),
        value: `[${channelName}](${voiceUrl})`,
        inline: false,
      });
    }

    await member.send({ embeds: [notificationEmbed] }).catch(() => undefined);
  }
}
