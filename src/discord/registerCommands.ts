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
          name: "set-default",
          description: "Set default server configuration",
          options: [
            {
              type: 3,
              name: "locale",
              description: "Default locale (e.g. en, es)",
              required: false,
              choices: [
                { name: "English", value: "en" },
                { name: "Español", value: "es" },
              ] as APIApplicationCommandOptionChoice<string>[],
            },
            {
              type: 3,
              name: "timezone",
              description: "Default timezone",
              required: false,
              choices: [
                { name: "UTC", value: "UTC" },
                { name: "Madrid/España", value: "Europe/Madrid" },
                { name: "London/Reino Unido", value: "Europe/London" },
                { name: "New York/USA Este", value: "America/New_York" },
                { name: "Los Angeles/USA Oeste", value: "America/Los_Angeles" },
                { name: "México", value: "America/Mexico_City" },
                {
                  name: "Buenos Aires/Argentina",
                  value: "America/Argentina/Buenos_Aires",
                },
                { name: "São Paulo/Brasil", value: "America/Sao_Paulo" },
              ] as APIApplicationCommandOptionChoice<string>[],
            },
            {
              type: 3,
              name: "message",
              description:
                "Default message template, available variables: {me}, {user}, {channel}, {server}, {date}",
              required: false,
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
              type: 4,
              name: "cooldown",
              description: "Cooldown seconds",
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
              description: "Locale (en, es)",
              required: false,
            },
            {
              type: 3,
              name: "timezone",
              description: "Timezone",
              required: false,
              choices: [
                { name: "UTC", value: "UTC" },
                { name: "Madrid/España", value: "Europe/Madrid" },
                { name: "London/Reino Unido", value: "Europe/London" },
                { name: "New York/USA Este", value: "America/New_York" },
                { name: "Los Angeles/USA Oeste", value: "America/Los_Angeles" },
                { name: "México", value: "America/Mexico_City" },
                {
                  name: "Buenos Aires/Argentina",
                  value: "America/Argentina/Buenos_Aires",
                },
                { name: "São Paulo/Brasil", value: "America/Sao_Paulo" },
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
