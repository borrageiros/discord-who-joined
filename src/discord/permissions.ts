import { GuildMember } from "discord.js";

export function isGuildAdmin(member: GuildMember): boolean {
  return member.permissions.has("Administrator");
}
