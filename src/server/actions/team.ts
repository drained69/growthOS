"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/server/db/client";
import { currentUser } from "@/server/auth/current";
import { sessionCookieOptions, PROJECT_COOKIE } from "@/server/auth/session";
import { isRole } from "@/server/auth/access";
import { acceptInvite, changeRole, createInvite, removeMember, revokeInvite } from "@/server/domain/workspace/members";
import { fail, guard, limited, type ActionResult } from "@/server/actions/_common";

export async function inviteMemberAction(email: string, role: string): Promise<ActionResult<{ url: string }>> {
  try {
    const { project, db, user, role: actorRole } = await guard("manage_members");
    await limited(`invite:${user.id}`, 10, 0.05);
    if (!isRole(role)) return { ok: false, error: "Pick a role" };
    const { token } = await createInvite(db, { projectId: project.id, email, role, invitedBy: user.id, actorRole });
    const h = await headers();
    const origin = process.env.APP_URL?.replace(/\/$/, "") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"}`;
    revalidatePath("/app/team");
    return { ok: true, data: { url: `${origin}/invite/${token}` }, message: "Invite created — share the link; it is shown only once" };
  } catch (e) {
    return fail(e);
  }
}

export async function revokeInviteAction(inviteId: string): Promise<ActionResult> {
  try {
    const { project, db, user } = await guard("manage_members");
    await revokeInvite(db, { projectId: project.id, inviteId, actorId: user.id });
    revalidatePath("/app/team");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function changeRoleAction(userId: string, role: string): Promise<ActionResult> {
  try {
    const { project, db, user, role: actorRole } = await guard("manage_members");
    await changeRole(db, { projectId: project.id, userId, role, actorId: user.id, actorRole });
    revalidatePath("/app/team");
    return { ok: true, message: "Role updated" };
  } catch (e) {
    return fail(e);
  }
}

export async function removeMemberAction(userId: string): Promise<ActionResult> {
  try {
    const { project, db, user, role: actorRole } = await guard("manage_members");
    if (userId === user.id) return { ok: false, error: "Use “Leave workspace” to remove yourself" };
    await removeMember(db, { projectId: project.id, userId, actorId: user.id, actorRole });
    revalidatePath("/app/team");
    return { ok: true, message: "Member removed" };
  } catch (e) {
    return fail(e);
  }
}

export async function leaveWorkspaceAction(): Promise<ActionResult> {
  try {
    const { project, db, user, role } = await guard("view");
    await removeMember(db, { projectId: project.id, userId: user.id, actorId: user.id, actorRole: role });
    (await cookies()).delete(PROJECT_COOKIE);
  } catch (e) {
    return fail(e);
  }
  redirect("/app");
}

export async function acceptInviteAction(token: string): Promise<ActionResult> {
  try {
    const user = await currentUser();
    if (!user) return { ok: false, error: "Sign in first" };
    const pid = await acceptInvite(await getDb(), { token, userId: user.id, userEmail: user.email });
    (await cookies()).set(PROJECT_COOKIE, pid, sessionCookieOptions);
  } catch (e) {
    return fail(e);
  }
  redirect("/app");
}
