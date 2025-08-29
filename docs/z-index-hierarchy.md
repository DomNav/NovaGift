# Z-Index Hierarchy

## Overview
This document establishes a consistent z-index hierarchy system for NovaGift to ensure proper layering of UI elements.

## Z-Index Levels

### Base Content (z-index: 0-999)
- **0-9**: Page content, forms, cards
- **10-39**: Sidebar and navigation elements (sidebar uses z-10)
- **40-99**: Fixed header and sticky elements (header uses z-40)
- **100-999**: Tooltips, hover effects

### Overlays and Dropdowns (z-index: 9999)
All dropdowns, menus, and overlay elements use `z-[9999]` to ensure they appear above all base content:

- **UnifiedHeaderPill** expanded panel (`src/components/ui/UnifiedHeaderPill.tsx`)
- **WalletBalancePill** dropdown (`src/components/ui/WalletBalancePill.tsx`)
- **NotificationButton** dropdown (`src/components/ui/NotificationButton.tsx`)
- **UnifiedHeaderPill** disconnect menu (`src/components/ui/UnifiedHeaderPill.tsx`)
- **LuxuryLivePrices** modal (`src/components/LuxuryLivePrices.tsx`)
- **ContactForm** modal (`src/pages/ContactsPage.tsx`)

### Special Modals (z-index: 2147483647)
- **ExpandedTickerView** uses maximum z-index value to ensure it appears above everything else
- This component also programmatically hides other high z-index elements when visible

## Implementation Notes

1. **Consistent Values**: All standard dropdowns use `z-[9999]` (Tailwind arbitrary value syntax)
2. **Maximum Priority**: ExpandedTickerView uses `zIndex: 2147483647` (inline style) for absolute priority
3. **No Conflicts**: Base content (envelope forms, cards) have no z-index conflicts
4. **Future Components**: New dropdown/overlay components should use `z-[9999]`

## Files Updated

- `src/components/layout/Header.tsx` - Fixed header positioning (z-40)
- `src/components/layout/AppLayout.tsx` - Main content padding adjustment
- `src/components/ui/UnifiedHeaderPill.tsx` - Expanded panel and disconnect menu
- `src/components/ui/WalletBalancePill.tsx` - Balance dropdown
- `src/components/ui/NotificationButton.tsx` - Notification dropdown  
- `src/components/LuxuryLivePrices.tsx` - Asset detail modal
- `src/pages/ContactsPage.tsx` - Contact form modal

## Verification

After these changes, all dropdowns and overlays should appear properly above:
- Envelope ID input forms
- Page content
- Navigation elements
- Other UI components

The fixed header (z-40) stays at the top and doesn't interfere with page scrolling. The layering hierarchy ensures user interactions with dropdowns are never blocked by underlying content, and the header pills work correctly with the fixed positioning.
