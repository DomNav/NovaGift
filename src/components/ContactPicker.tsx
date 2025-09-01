import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type Contact = {
  id: string; displayName: string; email?: string; wallet?: string; tags?: string[];
};

export function ContactPicker({
  open, onClose, onConfirm, preselected = [],
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
  preselected?: string[];
}) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set(preselected));
  const [data, setData] = useState<Contact[]>([]);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/contacts?q=${encodeURIComponent(q)}&page=1&pageSize=50`).then((r) => r.json()).then((d) => setData(d.items));
  }, [open, q]);

  if (!open) return null;
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-neutral-900 shadow-xl">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search contacts…"
            className="w-full rounded-xl px-3 py-2 bg-slate-50 dark:bg-neutral-800 text-slate-900 dark:text-slate-100 outline-none"
          />
        </div>
        <div className="max-h-[50vh] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {data.map((c) => (
            <label key={c.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-neutral-800 cursor-pointer">
              <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
              <div className="flex-1">
                <div className="font-medium text-slate-900 dark:text-slate-100">{c.displayName}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">{c.email || c.wallet}</div>
              </div>
              {c.tags && c.tags.length > 0 && (
                <div className="flex gap-1">
                  {c.tags.slice(0, 3).map((t) => (
                    <span key={t} className="text-xs rounded-full px-2 py-0.5 bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-300">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </label>
          ))}
          {data.length === 0 && (
            <div className="p-6 text-sm text-slate-500 dark:text-slate-400">No contacts found.</div>
          )}
        </div>
        <div className="p-4 flex justify-end gap-2">
          <button 
            onClick={onClose} 
            className="px-6 py-3 bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-slate-200 rounded-full font-medium hover:bg-slate-200 dark:hover:bg-neutral-700 transition-all duration-300 active:scale-95 transform"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm([...selected])}
            className="px-6 py-3 text-white rounded-full font-medium transition-all duration-300 active:scale-95 transform relative overflow-hidden"
            style={{
              background: `linear-gradient(
                135deg,
                #1d2bff 0%,
                #4a5fff 15%,
                #6366f1 25%,
                #8b5cf6 35%,
                #64748b 45%,
                #475569 55%,
                #7c3aed 65%,
                #3b82f6 75%,
                #1e40af 85%,
                #1d2bff 100%
              )`,
              backgroundSize: '200% 200%',
              animation: 'granite-shift 4s ease-in-out infinite',
              boxShadow: `
                inset 0 1px 0 rgba(255, 255, 255, 0.1),
                0 4px 12px rgba(29, 43, 255, 0.3),
                0 2px 4px rgba(0, 0, 0, 0.2)
              `
            }}
          >
            Add Selected
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
