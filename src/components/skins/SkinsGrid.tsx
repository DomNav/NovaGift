import { useEffect, useState } from "react";
import { authHeaders } from "../../lib/session";

type Rules = Record<string, { threshold: number; label: string }>;
type Eligible = Record<string, boolean>;

export function SkinsGrid() {
  const [eligible, setEligible] = useState<Eligible>({});
  const [rules, setRules] = useState<Rules>({});
  const [holdings, setHoldings] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  async function refreshEligibility() {
    setLoading(true);
    try {
      const authHeadersObj = authHeaders();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authHeadersObj.Authorization) {
        headers.Authorization = authHeadersObj.Authorization;
      }
      
      const r = await fetch("/api/kale/eligibility", { 
        headers 
      }).then(r => r.json());
      setEligible(r.eligible ?? {}); 
      setRules(r.rules ?? {}); 
      setHoldings(r.holdings ?? 0);
    } catch (error) {
      console.error("Failed to fetch eligibility:", error);
    }
    setLoading(false);
  }

  async function redeem(skinId: string) {
    try {
      const authHeadersObj = authHeaders();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authHeadersObj.Authorization) {
        headers.Authorization = authHeadersObj.Authorization;
      }
      
      const r = await fetch("/api/kale/redeem-kale-gated", {
        method: "POST",
        headers,
        body: JSON.stringify({ skinId }),
      }).then(r => r.json());
      
      if (r.ok) {
        alert(`Unlocked ${skinId}`); 
        await refreshEligibility();
      } else {
        alert(r.error ?? "Redeem failed");
      }
    } catch (error) {
      console.error("Redeem failed:", error);
      alert("Redeem failed");
    }
  }

  useEffect(() => { 
    refreshEligibility(); 
  }, []);

  const ids = Object.keys(rules);
  
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm opacity-70">KALE Holdings: {holdings}</div>
        <button 
          className="px-3 py-1.5 rounded-xl shadow" 
          onClick={refreshEligibility} 
          disabled={loading}
        >
          {loading ? "Checking…" : "Re-check KALE"}
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {ids.map((id) => {
          const can = eligible[id]; 
          const rule = rules[id];
          return (
            <div key={id} className="rounded-2xl p-4 shadow">
              <div className="font-medium">{id}</div>
              <div className="mt-1 text-xs opacity-70">{rule.label}</div>
              <button
                onClick={() => redeem(id)}
                disabled={!can}
                className={`mt-3 w-full rounded-xl px-3 py-2 ${
                  can ? "bg-black text-white" : "bg-gray-200 text-gray-500"
                }`}
              >
                {can ? "Unlock" : `Hold ≥ ${rule.threshold} KALE`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}