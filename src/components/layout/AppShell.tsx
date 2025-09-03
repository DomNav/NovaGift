import { PropsWithChildren, useState } from "react";
import { Menu } from "lucide-react";

export function AppShell({ children }: PropsWithChildren) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-dvh grid grid-cols-1 lg:grid-cols-[260px,1fr]">
      <div className="lg:hidden sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <button aria-label="Open navigation" className="p-2" onClick={() => setOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
          <div className="text-base font-semibold">NovaGift</div>
          <div className="w-6" />
        </div>
      </div>

      <aside className="hidden lg:block border-r bg-background">
        <div className="sticky top-0 h-dvh overflow-y-auto">{/* TODO: nav */}</div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[80%] max-w-[320px] bg-background shadow-xl">
            {/* TODO: nav */}
          </div>
        </div>
      )}

      <main className="min-w-0">
        <div className="container py-6">{children}</div>
      </main>
    </div>
  );
}