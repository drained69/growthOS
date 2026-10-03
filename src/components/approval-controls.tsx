"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resolveApprovalAction } from "@/app/actions";
import { AgentLog } from "./action-button";
import { Btn } from "./ui";

export function ApprovalControls({ id, requested }: { id: string; requested: string }) {
  const [amount, setAmount] = useState(requested);
  const [modify, setModify] = useState(false);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const [res, setRes] = useState<{ ok: boolean; error?: string; message?: string; log?: { agent: string; message: string }[] } | null>(null);
  const router = useRouter();
  const go = (resolution: "approve" | "reject") =>
    start(async () => {
      const r = await resolveApprovalAction(id, resolution, modify ? amount : undefined, note || undefined);
      setRes(r);
      router.refresh();
    });
  return (
    <div className="space-y-2">
      {modify && (
        <div className="flex items-center gap-2">
          <input value={amount} onChange={(e) => setAmount(e.target.value)} className="num h-7 w-28 rounded border border-line bg-bg px-2 text-[12px]" aria-label="Approved amount" />
          <span className="text-[11px] text-ink-3">USDC (≤ requested)</span>
        </div>
      )}
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="h-7 w-full rounded border border-line bg-bg px-2 text-[12px]" />
      <div className="flex gap-2">
        <Btn variant="primary" disabled={pending} onClick={() => go("approve")}>{pending ? "Executing…" : modify ? "Approve modified" : "Approve"}</Btn>
        <Btn variant="danger" disabled={pending} onClick={() => go("reject")}>Reject</Btn>
        <Btn variant="ghost" disabled={pending} onClick={() => setModify((m) => !m)}>{modify ? "Cancel modify" : "Modify"}</Btn>
      </div>
      {res && !res.ok && <div className="text-[11.5px] text-critical">{res.error}</div>}
      {res?.log && <AgentLog log={res.log} />}
    </div>
  );
}
