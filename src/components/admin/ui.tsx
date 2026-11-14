import type { ReactNode } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export function AdminPage({ title, actions, children, description }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold md:text-3xl">{title}</h1>
          {description && <p className="mt-1 text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-2xl border bg-card p-4 md:p-5", className)}>{children}</div>;
}

export function FieldLabel({ htmlFor, children, hint }: { htmlFor: string; children: ReactNode; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block font-medium">
      {children} {hint && <span className="font-normal text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl bg-muted p-8 text-center text-muted-foreground">{children}</p>;
}

export function Loading() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
      ))}
    </div>
  );
}

/** Store pages read fresh data after any change in the panel. */
export function invalidateStore(qc: QueryClient) {
  for (const k of ["site", "home", "categoria", "produto", "cart-sync"]) qc.invalidateQueries({ queryKey: [k] });
}

export const selectClass =
  "h-12 w-full rounded-xl border border-input bg-card px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
