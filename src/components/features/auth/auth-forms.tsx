"use client";
import { useActionState, useState } from "react";
import { loginAction, signupAction } from "@/server/actions";
import { Btn } from "@/components/ui";

const input = "h-8 w-full rounded border border-line bg-bg px-2.5 text-[13px] text-ink outline-none placeholder:text-ink-4 focus:border-s1";

export function AuthForms() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loginState, login, loginPending] = useActionState(loginAction, null);
  const [signupState, signup, signupPending] = useActionState(signupAction, null);
  const state = mode === "login" ? loginState : signupState;
  return (
    <div>
      <div className="mb-3 flex gap-3 text-[12px]">
        {(["login", "signup"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} className={m === mode ? "text-ink" : "text-ink-3 hover:text-ink-2"}>
            {m === "login" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>
      <form action={mode === "login" ? login : signup} className="space-y-2">
        {mode === "signup" && <input name="name" placeholder="Name" className={input} autoComplete="name" />}
        <input name="email" type="email" required placeholder="you@company.com" className={input} autoComplete="email" />
        <input name="password" type="password" required minLength={8} placeholder="Password (8+ chars)" className={input} autoComplete={mode === "login" ? "current-password" : "new-password"} />
        {state && !state.ok && <div className="text-[12px] text-critical">{state.error}</div>}
        <Btn variant="default" className="w-full justify-center" disabled={loginPending || signupPending}>
          {mode === "login" ? (loginPending ? "Signing in…" : "Sign in") : signupPending ? "Creating…" : "Create account"}
        </Btn>
      </form>
    </div>
  );
}
