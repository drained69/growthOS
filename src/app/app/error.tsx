"use client";
import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <EmptyState
      className="mt-10"
      title="Something went wrong loading this page"
      description={<>The error was logged{error.digest ? <> (reference <code className="num">{error.digest}</code>)</> : null}. Your data is unchanged.</>}
      action={
        <Button icon={<RotateCcw />} onClick={reset}>
          Try again
        </Button>
      }
    />
  );
}
