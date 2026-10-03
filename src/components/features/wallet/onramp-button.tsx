"use client";
import { useRef, useState } from "react";
import { Btn } from "@/components/ui";

/** "Add budget" → Arc Onramp widget → USDC to the GrowthOS wallet address. */
export function OnrampButton({ address, userId }: { address: string; userId: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "loading" | "open" | "error">("idle");
  const [msg, setMsg] = useState("");
  async function start() {
    setState("loading");
    try {
      const { createOnrampKit, fetchOnrampSession } = await import("@circle-fin/onramp-kit");
      const session = await fetchOnrampSession({ url: "/api/onramp/sessions", body: { appUserId: userId, destinationAddress: address } });
      createOnrampKit().mountIframe({
        session,
        container: ref.current!,
        onDepositSettled: ({ payload }: { payload: { amount: string; tokenSymbol: string } }) => setMsg(`Settled: ${payload.amount} ${payload.tokenSymbol}`),
      } as never);
      setState("open");
    } catch (e) {
      setState("error");
      setMsg((e as Error).message);
    }
  }
  return (
    <div>
      <Btn onClick={start} disabled={state === "loading"}>{state === "loading" ? "Opening Onramp…" : "Add budget (Onramp)"}</Btn>
      {msg && <div className="mt-1 text-[11.5px] text-ink-3">{msg}</div>}
      <div ref={ref} className={state === "open" ? "mt-3 h-[560px] overflow-hidden rounded border border-line" : ""} />
    </div>
  );
}
