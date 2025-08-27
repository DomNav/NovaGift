import { useEffect, useState, useMemo } from 'react'
import { EnvelopeCard } from '@/components/ui/EnvelopeCard'
import { useToast } from '@/hooks/useToast'
import { useSkins, type SkinSide } from '@/store/skins'
import { Check, Link, Unlink } from 'lucide-react'
import { useRewards } from '@/store/rewards'
import { progressForRule, ruleLabel } from '@/utils/rewards'
import ProgressPills from '@/components/ui/ProgressPills'
import StudioInsightsCard from '@/components/studio/StudioInsightsCard'

export const Studio = () => {
  const { addToast } = useToast()
  const { presets, selectedSealedId, selectedOpenedId, linked, setSelectedFor, setLinked, getById, hydrate } = useSkins()
  const [side, setSide] = useState<SkinSide>("sealed")
  
  const FEATURED_IDS: string[] = ["silver","amethyst","vaporwave","iceglass"]
  const [showAll, setShowAll] = useState(
    sessionStorage.getItem("studio.showAll") === "1"
  )
  
  useEffect(() => {
    hydrate()
  }, [])
  
  useEffect(() => {
    sessionStorage.setItem("studio.showAll", showAll ? "1" : "0")
  }, [showAll])
  
  const { sendCount, totalUsdCents } = useRewards()
  
  const sorted = useMemo(() => {
    // compute eligibility once
    const rewards = { sendCount, totalUsdCents }
    const withFlags = presets.map(s => ({
      skin: s,
      prog: progressForRule(s.requires, rewards),
    }))
    // group eligible first
    const owned = withFlags.filter(x => x.prog.eligible).map(x => x.skin)
    const locked = withFlags.filter(x => !x.prog.eligible).map(x => x.skin)

    // keep FEATURED order for the initial slice
    const byFeatured = (a: typeof presets[number], b: typeof presets[number]) => {
      const ia = FEATURED_IDS.indexOf(a.id as string)
      const ib = FEATURED_IDS.indexOf(b.id as string)
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
    }
    owned.sort(byFeatured)
    locked.sort(byFeatured)
    return [...owned, ...locked]
  }, [presets, sendCount, totalUsdCents])
  
  const currentSelectedId = side === "sealed" ? selectedSealedId : selectedOpenedId
  
  const top4 = useMemo(() => {
    const four = [...sorted]
    const slice = four.slice(0, 4)
    // ensure selected is visible in collapsed view
    const selected = sorted.find(s => s.id === currentSelectedId)
    if (selected && !slice.find(s => s.id === currentSelectedId)) {
      slice[3] = selected
    }
    return slice
  }, [sorted, currentSelectedId])
  
  const list = showAll ? sorted : top4
  const hiddenCount = Math.max(0, sorted.length - top4.length)
  
  const sealedSkin = getById(selectedSealedId)
  const openedSkin = getById(selectedOpenedId)
  
  const handleSkinSelect = (skinId: string) => {
    setSelectedFor(side, skinId as any)
    const skin = presets.find(p => p.id === skinId)
    if (skin) {
      const sideLabel = side === "sealed" ? "Gift" : "Open"
      addToast(`Selected ${skin.name} for ${sideLabel} side!`, 'success')
    }
  }
  
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-antonio">Studio</h1>
        </div>
        <p className="text-brand-text/60">
          Customize your envelope appearance with premium gradient skins
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Skin Selection */}
        <div>
          <div className="mb-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Choose Your Skin</h2>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="link-toggle"
                  checked={linked}
                  onChange={(e) => setLinked(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="link-toggle" className="text-sm text-brand-text/70 flex items-center gap-1">
                  {linked ? <Link className="w-3 h-3" /> : <Unlink className="w-3 h-3" />}
                  Link styles
                </label>
              </div>
            </div>
            
            {/* Segmented Control */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-sm text-brand-text/60">Editing:</span>
              <div className="inline-flex bg-brand-surface/50 rounded-lg p-0.5">
                <button
                  onClick={() => setSide("sealed")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    side === "sealed" 
                      ? "bg-white/10 text-white" 
                      : "text-brand-text/60 hover:text-brand-text/80"
                  }`}
                >
                  Gift (Sealed)
                </button>
                <button
                  onClick={() => setSide("opened")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    side === "opened" 
                      ? "bg-white/10 text-white" 
                      : "text-brand-text/60 hover:text-brand-text/80"
                  }`}
                >
                  Open (Recipient)
                </button>
              </div>
              
              {linked && (
                <div className="flex items-center gap-1 text-xs text-brand-text/50">
                  <span className="text-blue-400">🔗</span>
                  <span>Linked - selections apply to both sides</span>
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {list.map((skin) => {
              const isActive = currentSelectedId === skin.id
              const rewards = { sendCount, totalUsdCents }
              const prog = progressForRule(skin.requires, rewards)
              const isLocked = !prog.eligible
              
              return (
                <div
                  key={skin.id}
                  onClick={() => handleSkinSelect(skin.id)}
                  className={`
                    relative cursor-pointer transition-all duration-300
                    ${isActive ? 'scale-105' : 'hover:scale-102'}
                    ${isLocked ? 'opacity-60' : ''}
                  `}
                >
                  <EnvelopeCard
                    variant="sealed"
                    skin={skin}
                    usdCents={10000}
                    toLabel="Preview"
                    className="w-full h-32"
                  />
                  
                  {/* Top-right badge */}
                  <div 
                    className="absolute top-2 right-2 bg-amber-400 text-black text-[11px] font-semibold px-2 py-0.5 rounded-full" 
                    title={ruleLabel(skin.requires)}
                  >
                    {skin.requires ? "Unlock" : "Free"}
                  </div>
                  
                  {/* Lock overlay with progress pills */}
                  {!prog.eligible && (
                    <div className="absolute inset-0 bg-black/45 rounded-xl backdrop-blur-sm flex flex-col items-center justify-center text-white text-xs p-3">
                      <div className="mb-2">{prog.tooltip}</div>
                      <ProgressPills
                        send={prog.sendReq ? { current: prog.sendReq.current, required: prog.sendReq.required, ratio: prog.sendReq.ratio } : undefined}
                        usdReq={prog.usdReq ? { current: prog.usdReq.current, required: prog.usdReq.required, ratio: prog.usdReq.ratio } : undefined}
                      />
                    </div>
                  )}
                  
                  {/* Skin name badge */}
                  <div className="absolute bottom-2 left-2 bg-black/80 dark:bg-black/60 backdrop-blur-sm px-2 py-1 rounded">
                    <p className="text-xs text-white font-medium">{skin.name}</p>
                  </div>
                  
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute top-2 left-2 bg-green-500 p-1 rounded-full">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          
          <div className="mt-4 flex items-center gap-3">
            <button
              className="btn-secondary text-sm"
              onClick={() => setShowAll(v => !v)}
            >
              {showAll ? "Show less" : `Show more (${hiddenCount})`}
            </button>
            <a href="/fund" className="btn-link text-sm">Unlock more by gifting →</a>
          </div>
          
          <div className="mt-6 glass-card p-4">
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <span>🎨</span>
              About Studio
            </h3>
            <ul className="text-xs text-brand-text/60 space-y-1">
              <li>• Premium gradient designs for your envelopes</li>
              <li>• One-time purchase, use forever</li>
              <li>• Recipients see your custom skin</li>
              <li>• Support the platform development</li>
            </ul>
          </div>
        </div>
        
        {/* Preview */}
        <div>
          <h2 className="text-lg font-medium mb-4">Live Preview</h2>
          <div className="space-y-6">
            {/* Sealed Preview */}
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm text-brand-text/60">Sealed Envelope</p>
                {sealedSkin && (
                  <span className="px-2 py-0.5 bg-brand-surface/50 rounded-full text-xs text-brand-text/70">
                    {sealedSkin.name}
                  </span>
                )}
              </div>
              <EnvelopeCard
                variant="sealed"
                skin={sealedSkin}
                usdCents={10000}
                toLabel="GDEMO...RECIPIENT"
              />
            </div>
            
            {/* Opened Preview */}
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm text-brand-text/60">Opened Envelope</p>
                {openedSkin && (
                  <span className="px-2 py-0.5 bg-brand-surface/50 rounded-full text-xs text-brand-text/70">
                    {openedSkin.name}
                  </span>
                )}
              </div>
              <EnvelopeCard
                variant="opened"
                skin={openedSkin}
                usdCents={10000}
                toLabel="GDEMO...RECIPIENT"
                fromLabel="GDEMO...SENDER"
              />
            </div>
          </div>
          
          <div className="mt-6">
            <button 
              className="w-full btn-granite-primary text-sm flex items-center justify-center gap-2"
              onClick={() => {
                setSelectedFor("sealed", selectedSealedId)
                setSelectedFor("opened", selectedOpenedId)
                addToast('Applied to all new envelopes', 'success')
              }}
            >
              <span>✨</span>
              <span>Apply to All Envelopes</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Studio Insights */}
      <div className="mt-8">
        <StudioInsightsCard onGuide={() => addToast('Guide feature coming soon!', 'info')} />
      </div>
    </div>
  )
}