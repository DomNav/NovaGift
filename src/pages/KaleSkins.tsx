import { useEffect } from 'react'
import { EnvelopeCard } from '@/components/ui/EnvelopeCard'
import { useToast } from '@/hooks/useToast'
import { useSkins } from '@/store/skins'
import { Check } from 'lucide-react'

export const Studio = () => {
  const { addToast } = useToast()
  const { presets, selectedId, setSelected, hydrate } = useSkins()
  
  useEffect(() => {
    hydrate()
  }, [])
  
  const currentSkin = presets.find(p => p.id === selectedId)
  
  const handleSkinSelect = (skinId: string) => {
    setSelected(skinId as any)
    const skin = presets.find(p => p.id === skinId)
    if (skin) {
      addToast(`Selected ${skin.name} skin!`, 'success')
    }
  }
  
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-antonio gradient-text mb-2">Studio</h1>
        <p className="text-brand-text/60">
          Customize your envelope appearance with premium gradient skins
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Skin Selection */}
        <div>
          <h2 className="text-lg font-medium mb-4">Choose Your Skin</h2>
          <div className="grid grid-cols-2 gap-4">
            {presets.map((skin) => {
              const isActive = selectedId === skin.id
              
              return (
                <div
                  key={skin.id}
                  onClick={() => handleSkinSelect(skin.id)}
                  className={`
                    relative cursor-pointer transition-all duration-300
                    ${isActive ? 'scale-105' : 'hover:scale-102'}
                  `}
                >
                  <EnvelopeCard
                    variant="sealed"
                    skin={skin}
                    usdCents={10000}
                    toLabel="Preview"
                    className="w-full h-32"
                  />
                  
                  {/* Skin name badge */}
                  <div className="absolute bottom-2 left-2 bg-black/80 dark:bg-black/60 backdrop-blur-sm px-2 py-1 rounded">
                    <p className="text-xs text-white font-medium">{skin.name}</p>
                  </div>
                  
                  {/* Premium badge - removed as not in Skin type */}
                  
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
              <p className="text-sm text-brand-text/60 mb-2">Sealed Envelope</p>
              <EnvelopeCard
                variant="sealed"
                skin={currentSkin}
                usdCents={10000}
                toLabel="GDEMO...RECIPIENT"
              />
            </div>
            
            {/* Opened Preview */}
            <div className="flex flex-col items-center">
              <p className="text-sm text-brand-text/60 mb-2">Opened Envelope</p>
              <EnvelopeCard
                variant="opened"
                skin={currentSkin}
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
                if (currentSkin) {
                  setSelected(currentSkin.id)
                  addToast('Applied to all new envelopes', 'success')
                }
              }}
            >
              <span>✨</span>
              <span>Apply to All Envelopes</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Skin Details */}
      {currentSkin && (
        <div className="mt-8 glass-card p-6">
          <h3 className="text-lg font-medium mb-4">Selected: {currentSkin.name}</h3>
          <div className="grid grid-cols-4 gap-4 text-sm">
            {currentSkin.settings.stops.filter(Boolean).map((color, i) => (
              <div key={i} className="space-y-2">
                <label className="text-xs text-brand-text/60 font-medium">Color {i + 1}</label>
                <div className="flex flex-col items-center gap-2">
                  <div
                    className="w-12 h-12 rounded-lg shadow-md border-2 border-white/20 dark:border-white/10"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-mono text-xs bg-brand-surface px-2 py-1 rounded">{color}</span>
                </div>
              </div>
            ))}
            <div className="space-y-2">
              <label className="text-xs text-brand-text/60 font-medium">Angle</label>
              <div className="flex items-center justify-center">
                <span className="font-mono text-sm bg-brand-surface px-3 py-2 rounded">{currentSkin.settings.angle}°</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-brand-text/60 font-medium">Noise</label>
              <div className="flex items-center justify-center">
                <span className="font-mono text-sm bg-brand-surface px-3 py-2 rounded">{(currentSkin.settings.noise * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}