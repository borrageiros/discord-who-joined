import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import type {
  APIApplicationCommandOptionChoice,
  RESTPutAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import { env } from "../config/env";

export async function registerGlobalCommands(): Promise<void> {
  const commands: RESTPutAPIApplicationCommandsJSONBody = [
    {
      name: "invite",
      description: "Get the bot invite link",
    },
    {
      name: "config",
      description: "Configure the bot for this server",
      dm_permission: false,
      options: [
        {
          type: 1,
          name: "server-config",
          description: "Set server configuration",
          options: [
            {
              type: 3,
              name: "locale",
              description: "Default locale (e.g. en, es)",
              required: false,
              choices: [
                { name: "English", value: "en" },
                { name: "Spanish", value: "es" },
              ] as APIApplicationCommandOptionChoice<string>[],
            },
            {
              type: 3,
              name: "timezone",
              description: "Default timezone",
              required: false,
              choices: [
                { name: "UTC", value: "UTC" },
                { name: "Madrid/Spain", value: "Europe/Madrid" },
                { name: "London/United Kingdom", value: "Europe/London" },
                { name: "New York/USA East", value: "America/New_York" },
                { name: "Los Angeles/USA West", value: "America/Los_Angeles" },
                { name: "Mexico City/Mexico", value: "America/Mexico_City" },
                {
                  name: "Buenos Aires/Argentina",
                  value: "America/Argentina/Buenos_Aires",
                },
                { name: "São Paulo/Brazil", value: "America/Sao_Paulo" },
              ] as APIApplicationCommandOptionChoice<string>[],
            },
            {
              type: 3,
              name: "message",
              description:
                "Variables: {me}{user}{channel}{server}{date}{showUserImage}{showServerInfo}{channelLink}{showDate}",
              required: false,
            },
            {
              type: 3,
              name: "title",
              description:
                "Title template, available variables: {me}, {user}, {channel}, {server}, {date}",
              required: false,
            },
          ],
        },
        {
          type: 1,
          name: "watcher-config",
          description: "Configure watcher profile",
          options: [
            {
              type: 6,
              name: "user",
              description: "User to configure (admin only; default: yourself)",
              required: false,
            },
            {
              type: 5,
              name: "enabled",
              description: "Enable notifications",
              required: false,
            },
            {
              type: 5,
              name: "notify_self_join",
              description: "Notify on self join",
              required: false,
            },
            {
              type: 5,
              name: "notify_while_in_voice",
              description: "Notify while watcher is in voice",
              required: false,
            },
            {
              type: 5,
              name: "notify_on_move",
              description: "Notify on channel move",
              required: false,
            },
            {
              type: 5,
              name: "keep_in_sync",
              description:
                "Keep configuration in sync across servers (excluded users/roles are not propagated)",
              required: false,
            },
            {
              type: 5,
              name: "notify_on_bot_join",
              description: "Notify when the actor is a bot",
              required: false,
            },
            {
              type: 3,
              name: "message",
              description: "Personal message template",
              required: false,
            },
            {
              type: 3,
              name: "title",
              description: "Personal title template",
              required: false,
            },
            {
              type: 3,
              name: "locale",
              description: "Locale",
              required: false,
              choices: [
                { name: "Inheritance from the server", value: "inherit" },
                { name: "English", value: "en" },
                { name: "Spanish", value: "es" },
              ] as APIApplicationCommandOptionChoice<string>[],
            },
            {
              type: 3,
              name: "timezone",
              description: "Timezone",
              required: false,
              choices: [
                { name: "Inheritance from the server", value: "inherit" },
                { name: "UTC", value: "UTC" },
                { name: "Madrid/Spain", value: "Europe/Madrid" },
                { name: "London/United Kingdom", value: "Europe/London" },
                { name: "New York/USA East", value: "America/New_York" },
                { name: "Los Angeles/USA West", value: "America/Los_Angeles" },
                { name: "Mexico City/Mexico", value: "America/Mexico_City" },
                {
                  name: "Buenos Aires/Argentina",
                  value: "America/Argentina/Buenos_Aires",
                },
                { name: "São Paulo/Brazil", value: "America/Sao_Paulo" },
              ] as APIApplicationCommandOptionChoice<string>[],
            },
          ],
        },
        {
          type: 2,
          name: "permissions",
          description: "Manage who can use the bot",
          options: [
            {
              type: 1,
              name: "add-role",
              description: "Allow a role to manage the bot",
              options: [
                { type: 8, name: "role", description: "Role", required: true },
                {
                  type: 5,
                  name: "admin",
                  description: "Grant admin level",
                  required: false,
                },
              ],
            },
            {
              type: 1,
              name: "remove-role",
              description: "Disallow a role to manage the bot",
              options: [
                { type: 8, name: "role", description: "Role", required: true },
              ],
            },
            {
              type: 1,
              name: "add-user",
              description: "Allow a user to manage the bot",
              options: [
                { type: 6, name: "user", description: "User", required: true },
                {
                  type: 5,
                  name: "admin",
                  description: "Grant admin level",
                  required: false,
                },
              ],
            },
            {
              type: 1,
              name: "remove-user",
              description: "Disallow a user to manage the bot",
              options: [
                { type: 6, name: "user", description: "User", required: true },
              ],
            },
            {
              type: 1,
              name: "list",
              description: "List allowed roles and users",
            },
          ],
        },
        {
          type: 2,
          name: "exclude",
          description: "Manage excluded users and roles for a watcher",
          options: [
            {
              type: 1,
              name: "add-user",
              description: "Exclude a specific user",
              options: [
                {
                  type: 6,
                  name: "user",
                  description: "User to exclude",
                  required: true,
                },
                {
                  type: 6,
                  name: "watcher",
                  description:
                    "Watcher to edit (admin only; default: yourself)",
                  required: false,
                },
              ],
            },
            {
              type: 1,
              name: "remove-user",
              description: "Remove an excluded user",
              options: [
                {
                  type: 6,
                  name: "user",
                  description: "User to remove",
                  required: true,
                },
                {
                  type: 6,
                  name: "watcher",
                  description:
                    "Watcher to edit (admin only; default: yourself)",
                  required: false,
                },
              ],
            },
            {
              type: 1,
              name: "add-role",
              description: "Exclude a role",
              options: [
                {
                  type: 8,
                  name: "role",
                  description: "Role to exclude",
                  required: true,
                },
                {
                  type: 6,
                  name: "watcher",
                  description:
                    "Watcher to edit (admin only; default: yourself)",
                  required: false,
                },
              ],
            },
            {
              type: 1,
              name: "remove-role",
              description: "Remove an excluded role",
              options: [
                {
                  type: 8,
                  name: "role",
                  description: "Role to remove",
                  required: true,
                },
                {
                  type: 6,
                  name: "watcher",
                  description:
                    "Watcher to edit (admin only; default: yourself)",
                  required: false,
                },
              ],
            },
            {
              type: 1,
              name: "add-channel",
              description: "Exclude a voice channel",
              options: [
                {
                  type: 7,
                  name: "channel",
                  description: "Channel to exclude",
                  required: true,
                  channel_types: [2, 13],
                },
                {
                  type: 6,
                  name: "watcher",
                  description:
                    "Watcher to edit (admin only; default: yourself)",
                  required: false,
                },
              ],
            },
            {
              type: 1,
              name: "remove-channel",
              description: "Remove an excluded channel",
              options: [
                {
                  type: 7,
                  name: "channel",
                  description: "Channel to remove",
                  required: true,
                  channel_types: [2, 13],
                },
                {
                  type: 6,
                  name: "watcher",
                  description:
                    "Watcher to edit (admin only; default: yourself)",
                  required: false,
                },
              ],
            },
          ],
        },
        {
          type: 2,
          name: "allowlist",
          description: "Only notify for these users and roles",
          options: [
            {
              type: 1,
              name: "add-user",
              description: "Allow a specific user",
              options: [
                {
                  type: 6,
                  name: "user",
                  description: "User to allow",
                  required: true,
                },
                {
                  type: 6,
                  name: "watcher",
                  description:
                    "Watcher to edit (admin only; default: yourself)",
                  required: false,
                },
              ],
            },
            {
              type: 1,
              name: "remove-user",
              description: "Remove an allowed user",
              options: [
                {
                  type: 6,
                  name: "user",
                  description: "User to remove",
                  required: true,
                },
                {
                  type: 6,
                  name: "watcher",
                  description:
                    "Watcher to edit (admin only; default: yourself)",
                  required: false,
                },
              ],
            },
            {
              type: 1,
              name: "add-role",
              description: "Allow a role",
              options: [
                {
                  type: 8,
                  name: "role",
                  description: "Role to allow",
                  required: true,
                },
                {
                  type: 6,
                  name: "watcher",
                  description:
                    "Watcher to edit (admin only; default: yourself)",
                  required: false,
                },
              ],
            },
            {
              type: 1,
              name: "remove-role",
              description: "Remove an allowed role",
              options: [
                {
                  type: 8,
                  name: "role",
                  description: "Role to remove",
                  required: true,
                },
                {
                  type: 6,
                  name: "watcher",
                  description:
                    "Watcher to edit (admin only; default: yourself)",
                  required: false,
                },
              ],
            },
            {
              type: 1,
              name: "add-channel",
              description: "Allow a voice channel",
              options: [
                {
                  type: 7,
                  name: "channel",
                  description: "Channel to allow",
                  required: true,
                  channel_types: [2, 13],
                },
                {
                  type: 6,
                  name: "watcher",
                  description:
                    "Watcher to edit (admin only; default: yourself)",
                  required: false,
                },
              ],
            },
            {
              type: 1,
              name: "remove-channel",
              description: "Remove an allowed channel",
              options: [
                {
                  type: 7,
                  name: "channel",
                  description: "Channel to remove",
                  required: true,
                  channel_types: [2, 13],
                },
                {
                  type: 6,
                  name: "watcher",
                  description:
                    "Watcher to edit (admin only; default: yourself)",
                  required: false,
                },
              ],
            },
          ],
        },
        {
          type: 1,
          name: "add-watcher",
          description: "Add or update a watcher",
          options: [
            {
              type: 6,
              name: "user",
              description: "User to notify (optional)",
              required: false,
            },
            {
              type: 5,
              name: "enabled",
              description: "Enable notifications",
              required: false,
            },
            {
              type: 5,
              name: "notify_self_join",
              description: "Notify on self join",
              required: false,
            },
            {
              type: 5,
              name: "notify_while_in_voice",
              description: "Notify while watcher is in voice",
              required: false,
            },
            {
              type: 5,
              name: "notify_on_move",
              description: "Notify on channel move",
              required: false,
            },
            {
              type: 5,
              name: "keep_in_sync",
              description:
                "Keep configuration in sync across servers (excluded users/roles are not propagated)",
              required: false,
            },
            {
              type: 5,
              name: "notify_on_bot_join",
              description: "Notify when the actor is a bot",
              required: false,
            },
            {
              type: 3,
              name: "message",
              description: "Personal message template",
              required: false,
            },
            {
              type: 3,
              name: "locale",
              description: "Locale",
              required: false,
              choices: [
                { name: "Inheritance from the server", value: "inherit" },
                { name: "English", value: "en" },
                { name: "Spanish", value: "es" },
              ] as APIApplicationCommandOptionChoice<string>[],
            },
            {
              type: 3,
              name: "timezone",
              description: "Timezone",
              required: false,
              choices: [
                { name: "Inheritance from the server", value: "inherit" },
                { name: "UTC", value: "UTC" },
                { name: "Madrid/Spain", value: "Europe/Madrid" },
                { name: "London/United Kingdom", value: "Europe/London" },
                { name: "New York/USA East", value: "America/New_York" },
                { name: "Los Angeles/USA West", value: "America/Los_Angeles" },
                { name: "Mexico City/Mexico", value: "America/Mexico_City" },
                {
                  name: "Buenos Aires/Argentina",
                  value: "America/Argentina/Buenos_Aires",
                },
                { name: "São Paulo/Brazil", value: "America/Sao_Paulo" },
              ] as APIApplicationCommandOptionChoice<string>[],
            },
          ],
        },
        {
          type: 1,
          name: "remove-watcher",
          description: "Remove a watcher",
          options: [
            {
              type: 6,
              name: "user",
              description: "User to remove (optional)",
              required: false,
            },
          ],
        },
        {
          type: 1,
          name: "view",
          description: "View current configuration",
        },
      ],
    },
  ];

  const rest = new REST({ version: "10" }).setToken(env.TOKEN);
  await rest.put(Routes.applicationCommands(env.CLIENT_ID), { body: commands });
}

if (require.main === module) {
  registerGlobalCommands().then(() => {
    console.log("Commands registered");
  });
}
