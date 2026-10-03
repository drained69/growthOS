"use client";
import { useTransition } from "react";
import { Check } from "lucide-react";
import { acceptInviteAction } from "@/server/actions/team";
import { Button } from "@/components/ui";
import { toast } from "@/components/ui/toast";

export function AcceptInvite({ token, workspace }: { token: string; workspace: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="primary"
      size="lg"
      className="w-full"
      icon={<Check />}
      loading={pending}
      onClick={() =>
        start(async () => {
          const r = await acceptInviteAction(token);
          if (r && !r.ok) toast.error("Couldn’t accept invite", r.error);
        })
      }
    >
      Join {workspace}
    </Button>
  );
}
