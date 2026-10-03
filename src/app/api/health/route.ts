import { NextResponse } from "next/server";
import { getDb } from "@/server/db/client";
import { walletMode } from "@/server/integrations/circle/config";
import { claudeEnabled } from "@/server/integrations/llm/claude";

export const dynamic = "force-dynamic";

export async function GET() {
  await getDb();
  return NextResponse.json({ ok: true, wallet: walletMode(), claude: claudeEnabled() });
}
