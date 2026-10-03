import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { walletMode } from "@/lib/payments/config";
import { claudeEnabled } from "@/lib/llm/claude";

export const dynamic = "force-dynamic";

export async function GET() {
  await getDb();
  return NextResponse.json({ ok: true, wallet: walletMode(), claude: claudeEnabled() });
}
