"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { schema as s } from "@/server/db/client";
import { resolveApproval } from "@/server/domain/agent/execute";
import { collector, fail, guard, type ActionResult } from "@/server/actions/_common";

/** Only owners and admins may resolve spend approvals. */
export async function resolveApprovalAction(approvalId: string, resolution: "approve" | "reject", amount?: string, note?: string): Promise<ActionResult> {
  try {
    const { project, db, user } = await guard("approve");
    const [ap] = await db.select().from(s.approvals).where(and(eq(s.approvals.id, approvalId), eq(s.approvals.projectId, project.id)));
    if (!ap) return { ok: false, error: "Approval not found" };
    const { log, push } = collector();
    const r = await resolveApproval(db, { approvalId, userId: user.id, resolution, modifiedAmount: amount || undefined, note: note?.slice(0, 500), log: push });
    revalidatePath("/app", "layout");
    return { ok: true, data: r, log, message: r.status === "approved" ? "Approved and executed" : r.status === "denied" ? "Denied by a policy rule at re-check" : "Rejected" };
  } catch (e) {
    return fail(e);
  }
}
