import { memo } from 'react';

interface LinkPreviewProps {
  style: 'default' | 'minimal' | 'card';
  url?: string;
}

export const LinkPreview = memo(({ style, url = 'nova.gift/open/abc123' }: LinkPreviewProps) => {
  const renderPreview = () => {
    switch (style) {
      case 'minimal':
        return (
          <div className="inline-flex items-center gap-2 px-3 py-2 bg-brand-surface rounded-lg border border-surface-border">
            <span className="text-2xl">🎁</span>
            <span className="text-sm font-mono text-brand-primary">{url}</span>
          </div>
        );
      
      case 'card':
        return (
          <div className="max-w-sm rounded-xl bg-gradient-to-br from-brand-primary to-brand-accent p-[1px]">
            <div className="bg-brand-surface rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center">
                  <span className="text-2xl">🎁</span>
                </div>
                <div>
                  <div className="font-semibold">Gift Envelope</div>
                  <div className="text-xs text-brand-text/60">Click to open</div>
                </div>
              </div>
              <div className="text-xs font-mono text-brand-primary bg-brand-surface/50 px-2 py-1 rounded">
                {url}
              </div>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="inline-flex items-center gap-2">
            <span className="text-xl">🎁</span>
            <span className="text-brand-primary underline hover:no-underline">{url}</span>
          </div>
        );
    }
  };

  return (
    <div className="flex justify-center p-8 bg-brand-surface/50 rounded-lg border border-surface-border">
      {renderPreview()}
    </div>
  );
});

LinkPreview.displayName = 'LinkPreview';