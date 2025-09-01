import { Button, buttonVariants } from './ui/button';
import { cn } from './ui/utils';

interface RouteChipsProps {
  value: 'best' | 'dex' | 'amm';
  onChange: (val: RouteChipsProps['value']) => void;
  size?: 'sm' | 'md';
}

export const RouteChips = ({ value, onChange, size = 'md' }: RouteChipsProps) => {
  const routes: Array<RouteChipsProps['value']> = ['best', 'dex', 'amm'];

  return (
    <div 
      className="inline-flex gap-2" 
      role="group"
      aria-label="Select routing preference"
    >
      {routes.map((route) => (
        <Button
          key={route}
          type="button"
          variant={value === route ? 'default' : 'outline'}
          size={size === 'sm' ? 'sm' : 'default'}
          onClick={() => onChange(route)}
          aria-pressed={value === route}
          className={cn(
            'capitalize',
            value === route && 'shadow-sm'
          )}
        >
          {route === 'best' ? 'Best' : route === 'dex' ? 'DEX' : 'AMM'}
        </Button>
      ))}
    </div>
  );
};