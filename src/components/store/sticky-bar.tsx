import type { ReactNode } from "react";

export function StickyBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 shadow-bar backdrop-blur safe-bottom">
      <div className="container-page flex items-center gap-3 pt-3">{children}</div>
    </div>
  );
}
