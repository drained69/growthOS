import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/current";
import { AuthForms } from "@/components/auth-forms";
import { enterDemoAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function Login() {
  if (await currentUser()) redirect("/app");
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-[5px] bg-s1 text-[11px] font-bold text-white">G</span>
          <span className="text-[15px] font-semibold tracking-tight">GrowthOS</span>
        </Link>
        <div className="rounded-md border border-line bg-surface p-5">
          <form action={enterDemoAction}>
            <button className="flex h-9 w-full items-center justify-center rounded border border-s1 bg-s1 text-[13px] font-medium text-white hover:bg-s1/90">See it work — enter the demo</button>
          </form>
          <p className="mt-2 text-[11.5px] text-ink-3">No keys needed. Seeded data is fictional and labelled DEMO; payments without a configured wallet are labelled SIMULATED.</p>
          <div className="my-4 h-px bg-line" />
          <AuthForms />
        </div>
      </div>
    </div>
  );
}
