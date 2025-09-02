import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SkinStudio from './SkinStudio';

vi.mock('@/store/skins', () => ({
  useSkins: () => ({
    presets: [
      {
        id: 'silver',
        name: 'Silver',
        settings: { angle: 35, noise: 0.1, stops: ['#EEEFF3', '#D5D8E0', '#B8BEC9', '#F7F9FF'] },
        animation: 'none',
      },
      {
        id: 'holoBlue',
        name: 'Holo Blue',
        settings: { angle: 28, noise: 0.08, stops: ['#1E2FFF', '#4E6BFF', '#7AA2FF', '#C1D3FF'] },
        animation: 'shimmer',
        requires: { minSends: 1 },
      },
    ],
    unlocked: ['silver'],
    selectedId: 'silver',
    getById: (id: string) => ({
      id,
      name: id === 'silver' ? 'Silver' : 'Holo Blue',
      settings: { angle: 35, noise: 0.1, stops: ['#EEEFF3', '#D5D8E0', '#B8BEC9', '#F7F9FF'] },
      animation: 'none',
    }),
    setSelected: vi.fn(),
  }),
  AnimationKind: {},
  Skin: {},
}));

vi.mock('@/store/rewards', () => ({
  useRewards: () => ({
    sendCount: 5,
    totalUsdCents: 10000,
  }),
  useKaleometers: () => ({
    sendCount: 5,
    totalUsdCents: 10000,
  }),
}));

vi.mock('@/utils/rewards', () => ({
  progressForRule: () => ({
    eligible: false,
    tooltip: 'Send 1 gift to unlock',
    sendReq: { current: 0, required: 1, ratio: 0 },
    usdReq: null,
  }),
  ruleLabel: () => 'Send 1 gift',
  usd: (cents: number) => `$${(cents / 100).toFixed(2)}`,
}));

vi.mock('@/components/PageHeader', () => ({
  PageHeader: ({ title, description }: any) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@/components/studio/StudioInsightsCard', () => ({
  default: ({ onGuide }: any) => (
    <div onClick={onGuide}>Studio Insights</div>
  ),
}));

vi.mock('@/components/ui/ProgressPills', () => ({
  default: () => <div>Progress Pills</div>,
}));

describe('SkinStudio', () => {
  it('renders with header', () => {
    render(<SkinStudio />);
    
    expect(screen.getByText('Skin Studio')).toBeInTheDocument();
    expect(screen.getByText(/Browse and customize/)).toBeInTheDocument();
  });

  it('displays skin catalog by default', () => {
    render(<SkinStudio />);
    
    expect(screen.getByText(/All Skins/)).toBeInTheDocument();
    expect(screen.getByText('1 Unlocked')).toBeInTheDocument();
  });

  it('displays skin catalog', () => {
    render(<SkinStudio />);
    
    expect(screen.getByText(/All Skins/)).toBeInTheDocument();
    expect(screen.getByText('1 Unlocked')).toBeInTheDocument();
  });

  it('displays user progress stats', () => {
    render(<SkinStudio />);
    
    expect(screen.getByText('Your Progress')).toBeInTheDocument();
    expect(screen.getByText('Total Sends:')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Total Sent:')).toBeInTheDocument();
    expect(screen.getByText('$100.00')).toBeInTheDocument();
  });

  it('renders studio insights component', () => {
    render(<SkinStudio />);
    
    expect(screen.getByText('Studio Insights')).toBeInTheDocument();
  });
});