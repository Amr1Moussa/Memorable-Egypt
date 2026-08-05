import { cn } from "@/lib/utils/cn";

/**
 * Error state (doc 10 — Error States).
 * Explains what happened + suggests a next action. Never exposes
 * technical details.
 */
export function ErrorState({
  title = "Something went wrong",
  description = "Please try again in a moment.",
  action,
  className,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border bg-surface flex flex-col items-center justify-center rounded-lg border px-6 py-12 text-center",
        className,
      )}
      role="alert"
    >
      <h3 className="text-foreground text-base font-semibold">{title}</h3>
      <p className="text-muted-foreground mt-2 max-w-sm text-sm">
        {description}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
