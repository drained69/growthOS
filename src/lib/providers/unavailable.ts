import type { MarketProvider, ProviderId } from "./types";

/**
 * Declared provider interfaces for platforms where GrowthOS has no reliable, permitted
 * read access in this build. They report unavailable — they never return made-up data.
 */
function declared(id: ProviderId, name: string, note: string, requiresEnv: string[]): MarketProvider {
  return {
    id,
    name,
    status: () => ({ id, name, available: false, note, requiresEnv }),
    async search() {
      return [];
    },
  };
}

export const tiktok = declared("tiktok", "TikTok", "TikTok Research API access is limited to approved researchers; not connected. No scraping.", ["TIKTOK_RESEARCH_CLIENT_KEY"]);
export const discord = declared("discord", "Discord", "Requires a bot invited into specific servers by their admins; only those channels may be read. Not connected.", ["DISCORD_BOT_TOKEN"]);
export const telegram = declared("telegram", "Telegram", "Bot API only sees chats the bot was added to. Not connected.", ["TELEGRAM_BOT_TOKEN"]);
