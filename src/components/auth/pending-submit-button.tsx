"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type PendingSubmitButtonProps = {
  idleLabel: string;
  pendingLabel: string;
  className?: string;
};

export function PendingSubmitButton({ idleLabel, pendingLabel, className }: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size="lg"
      className={className}
      disabled={pending}
      aria-disabled={pending}
    >
      {pending ? pendingLabel : idleLabel}
    </Button>
  );
}
