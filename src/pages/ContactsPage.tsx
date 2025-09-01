import { useEffect, useMemo, useState } from "react";

type Contact = {
  id: string; displayName: string; email?: string; wallet?: string; tags?: string[]; updatedAt?: string;
};

export default function ContactsPage() {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState<null | Contact>(null);
  const [csvText, setCsvText] = useState("");

  const load = async () => {
    const u = new URLSearchParams({ q, page: String(page), pageSize: "20" });
    if (tag) u.set("tag", tag);
    const res = await fetch(`/api/contacts?${u.toString()}`).then((r) => r.json());
    setItems(res.items);
    setTotal(res.total);
  };
  useEffect(() => {
    load(); // eslint-disable-next-line
  }, [q, tag, page]);

  const allSelected = useMemo(() => sel.size > 0 && items.every((i) => sel.has(i.id)), [sel, items]);
  const toggleRow = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const toggleAll = () =>
    setSel((s) => {
      const n = new Set(s);
      if (allSelected) items.forEach((i) => n.delete(i.id));
      else items.forEach((i) => n.add(i.id));
      return n;
    });

  const save = async (payload: Partial<Contact> & { displayName: string }) => {
    const body = { displayName: payload.displayName, email: payload.email, wallet: payload.wallet, tags: payload.tags ?? [] };
    if ((payload as any).id) {
      await fetch(`/api/contacts/${(payload as any).id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch(`/api/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }
    setShowForm(null);
    setPage(1);
    setQ("");
    await load();
  };

  const delSelected = async () => {
    if (sel.size === 0) return;
    await fetch(`/api/contacts?id=${[...sel].join(",")}`, { method: "DELETE" });
    setSel(new Set());
    await load();
  };

  const importCsv = async () => {
    if (!csvText.trim()) return;
    await fetch(`/api/contacts/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: csvText }),
    });
    setCsvText("");
    await load();
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-antonio gradient-text mb-2">Contacts</h1>
        <p className="text-brand-text/60">Manage your network and send gifts to anyone</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-primary/20 flex items-center justify-center">
              <span className="text-lg">👥</span>
            </div>
            <div>
              <p className="text-sm text-brand-text/60">Total Contacts</p>
              <p className="text-xl font-bold">{total}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <span className="text-lg">⭐</span>
            </div>
            <div>
              <p className="text-sm text-brand-text/60">VIP Contacts</p>
              <p className="text-xl font-bold">{items.filter(c => c.tags?.includes('VIP')).length}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <span className="text-lg">💼</span>
            </div>
            <div>
              <p className="text-sm text-brand-text/60">Team Members</p>
              <p className="text-xl font-bold">{items.filter(c => c.tags?.includes('Team')).length}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <span className="text-lg">🎯</span>
            </div>
            <div>
              <p className="text-sm text-brand-text/60">Selected</p>
              <p className="text-xl font-bold">{sel.size}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="glass-card p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <input
              value={q}
              onChange={(e) => {
                setPage(1);
                setQ(e.target.value);
              }}
              placeholder="Search name, email, or wallet..."
              className="input-base flex-1 min-w-0"
            />
            <div className="flex items-center gap-2">
              {["VIP", "Team", "Friends"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTag(tag === t ? undefined : t)}
                  className={`text-sm rounded-full px-4 py-2 font-medium border transition-all duration-300 active:scale-95 transform ${
                    tag === t 
                      ? "bg-brand-primary text-white border-brand-primary shadow-lg" 
                      : "bg-brand-surface text-brand-text/60 border-white/10 hover:bg-brand-text/10"
                  }`}
                >
                  {t}
                </button>
              ))}
              {tag && (
                <button 
                  onClick={() => setTag(undefined)} 
                  className="text-sm text-brand-primary hover:text-brand-secondary transition-colors"
                >
                  Clear filter
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowForm({ id: "", displayName: "" } as any)} 
              className="btn-granite-primary rounded-full"
            >
              <span className="mr-2">✨</span>
              Add Contact
            </button>
            <button 
              onClick={delSelected} 
              disabled={sel.size === 0} 
              className="px-6 py-3 text-white rounded-full font-medium transition-all duration-300 active:scale-95 transform relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: sel.size === 0 ? 'linear-gradient(135deg, #64748b 0%, #475569 50%, #334155 100%)' : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%)',
                boxShadow: `
                  inset 0 1px 0 rgba(255, 255, 255, 0.1),
                  0 4px 12px ${sel.size === 0 ? 'rgba(100, 116, 139, 0.3)' : 'rgba(220, 38, 38, 0.3)'},
                  0 2px 4px rgba(0, 0, 0, 0.2)
                `
              }}
            >
              <span className="mr-2">🗑️</span>
              Delete ({sel.size})
            </button>
          </div>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="glass-card overflow-hidden mb-6">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left p-4 text-sm font-medium text-brand-text/80">
                <input 
                  type="checkbox" 
                  checked={allSelected} 
                  onChange={toggleAll}
                  className="rounded"
                />
              </th>
              <th className="text-left p-4 text-sm font-medium text-brand-text/80">Contact</th>
              <th className="text-left p-4 text-sm font-medium text-brand-text/80">Wallet</th>
              <th className="text-left p-4 text-sm font-medium text-brand-text/80">Tags</th>
              <th className="text-left p-4 text-sm font-medium text-brand-text/80">Updated</th>
              <th className="text-left p-4 text-sm font-medium text-brand-text/80">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr
                key={c.id}
                className="border-b border-white/5 hover:bg-white/5 transition-colors"
              >
                <td className="p-4">
                  <input 
                    type="checkbox" 
                    checked={sel.has(c.id)} 
                    onChange={() => toggleRow(c.id)}
                    className="rounded"
                  />
                </td>
                <td className="p-4">
                  <div>
                    <div className="font-medium text-brand-text">{c.displayName}</div>
                    {c.email && (
                      <div className="text-sm text-brand-text/60">{c.email}</div>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <div className="font-mono text-xs text-brand-text/60 truncate max-w-[200px]">
                    {c.wallet || "-"}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-1">
                    {(c.tags ?? []).map((t) => (
                      <span 
                        key={t} 
                        className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                          t === 'VIP' ? 'bg-purple-500/20 text-purple-300' :
                          t === 'Team' ? 'bg-green-500/20 text-green-300' :
                          t === 'Friends' ? 'bg-blue-500/20 text-blue-300' :
                          'bg-brand-text/20 text-brand-text/60'
                        }`}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-4 text-sm text-brand-text/60">
                  {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : "-"}
                </td>
                <td className="p-4">
                  <button 
                    onClick={() => setShowForm(c)} 
                    className="text-sm text-brand-primary hover:text-brand-secondary transition-colors font-medium"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="p-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-brand-surface flex items-center justify-center">
                      <span className="text-3xl">📱</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-brand-text mb-2">No contacts yet</h3>
                      <p className="text-brand-text/60 mb-4">Start building your network by adding your first contact</p>
                      <button 
                        onClick={() => setShowForm({ id: "", displayName: "" } as any)}
                        className="btn-granite-primary rounded-full"
                      >
                        <span className="mr-2">✨</span>
                        Add Your First Contact
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* CSV Import Section */}
      <div className="glass-card p-6">
        <details>
          <summary className="cursor-pointer text-lg font-medium text-brand-text mb-4 hover:text-brand-primary transition-colors">
            📥 Import Contacts from CSV
          </summary>
          <div className="mt-4 space-y-4">
            <div className="bg-brand-surface/50 rounded-lg p-4">
              <p className="text-sm text-brand-text/80 mb-2">
                <strong>CSV Format:</strong> <code className="bg-brand-text/10 px-2 py-1 rounded text-xs">name,email,wallet,tags</code>
              </p>
              <p className="text-xs text-brand-text/60">
                Tags should be pipe-separated (e.g., VIP|Team). Email and wallet are optional.
              </p>
            </div>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={6}
              className="input-base font-mono text-sm"
              placeholder={`name,email,wallet,tags
Alice Johnson,alice@example.com,GABCDEFG...,VIP|Team
Bob Smith,,GXYZ123...,Friends
Charlie Brown,charlie@company.com,,Team`}
            />
            <div className="flex justify-end">
              <button 
                onClick={importCsv}
                disabled={!csvText.trim()}
                className="btn-granite-primary rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="mr-2">📤</span>
                Import Contacts
              </button>
            </div>
          </div>
        </details>
      </div>

      {showForm !== null && <ContactForm initial={showForm} onClose={() => setShowForm(null)} onSave={save} />}
    </div>
  );
}

function ContactForm({ initial, onSave, onClose }: { initial: any; onSave: (p: any) => void; onClose: () => void }) {
  const [displayName, setDisplayName] = useState(initial.displayName || "");
  const [email, setEmail] = useState(initial.email || "");
  const [wallet, setWallet] = useState(initial.wallet || "");
  const [tags, setTags] = useState<string[]>(initial.tags || []);

  const predefinedTags = ['VIP', 'Team', 'Friends', 'Business', 'Family', 'Client'];
  
  const toggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter(t => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="glass-card p-6 max-w-lg w-full space-y-6 animate-slide-up">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-primary/20 flex items-center justify-center">
            <span className="text-2xl">👤</span>
          </div>
          <h2 className="text-xl font-antonio text-brand-text mb-2">
            {initial.id ? "Edit Contact" : "Add New Contact"}
          </h2>
          <p className="text-sm text-brand-text/60">
            {initial.id ? "Update contact information" : "Add someone to your network"}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-text/80 mb-2">
              Full Name *
            </label>
            <input
              className="input-base"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter full name"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-text/80 mb-2">
              Email Address
            </label>
            <input
              type="email"
              className="input-base"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com (optional)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-text/80 mb-2">
              Stellar Wallet Address
            </label>
            <input
              className="input-base font-mono text-sm"
              value={wallet}
              onChange={(e) => setWallet(e.target.value.toUpperCase())}
              placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
            />
            <p className="text-xs text-brand-text/50 mt-1">
              Public key starting with G (optional)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-text/80 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {predefinedTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`text-sm rounded-full px-3 py-1 font-medium transition-all duration-300 hover:scale-105 ${
                    tags.includes(tag)
                      ? tag === 'VIP' ? 'bg-purple-500/30 text-purple-200 ring-2 ring-purple-400/50' :
                        tag === 'Team' ? 'bg-green-500/30 text-green-200 ring-2 ring-green-400/50' :
                        tag === 'Friends' ? 'bg-blue-500/30 text-blue-200 ring-2 ring-blue-400/50' :
                        tag === 'Business' ? 'bg-orange-500/30 text-orange-200 ring-2 ring-orange-400/50' :
                        tag === 'Family' ? 'bg-pink-500/30 text-pink-200 ring-2 ring-pink-400/50' :
                        tag === 'Client' ? 'bg-indigo-500/30 text-indigo-200 ring-2 ring-indigo-400/50' :
                        'bg-brand-primary/30 text-brand-primary ring-2 ring-brand-primary/50'
                      : tag === 'VIP' ? 'bg-purple-500/10 text-purple-300 hover:bg-purple-500/20' :
                        tag === 'Team' ? 'bg-green-500/10 text-green-300 hover:bg-green-500/20' :
                        tag === 'Friends' ? 'bg-blue-500/10 text-blue-300 hover:bg-blue-500/20' :
                        tag === 'Business' ? 'bg-orange-500/10 text-orange-300 hover:bg-orange-500/20' :
                        tag === 'Family' ? 'bg-pink-500/10 text-pink-300 hover:bg-pink-500/20' :
                        tag === 'Client' ? 'bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20' :
                        'bg-brand-text/10 text-brand-text/60 hover:bg-brand-text/20'
                  }`}
                >
                  {tags.includes(tag) && '✓ '}{tag}
                </button>
              ))}
            </div>
            {tags.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-brand-text/50 mb-2">Selected tags:</p>
                <div className="flex flex-wrap gap-2">
                  {tags.map((t, i) => (
                    <span
                      key={i}
                      className={`text-sm rounded-full px-3 py-1 font-medium ${
                        t === 'VIP' ? 'bg-purple-500/20 text-purple-300' :
                        t === 'Team' ? 'bg-green-500/20 text-green-300' :
                        t === 'Friends' ? 'bg-blue-500/20 text-blue-300' :
                        t === 'Business' ? 'bg-orange-500/20 text-orange-300' :
                        t === 'Family' ? 'bg-pink-500/20 text-pink-300' :
                        t === 'Client' ? 'bg-indigo-500/20 text-indigo-300' :
                        'bg-brand-text/20 text-brand-text/60'
                      }`}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button 
            onClick={onClose} 
            className="flex-1 btn-secondary rounded-full"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave({ id: initial.id, displayName, email, wallet, tags })}
            disabled={!displayName.trim()}
            className="flex-1 btn-granite-primary rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="mr-2">{initial.id ? "💾" : "✨"}</span>
            {initial.id ? "Save Changes" : "Add Contact"}
          </button>
        </div>
      </div>
    </div>
  );
}
