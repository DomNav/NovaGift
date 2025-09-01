import React from 'react';
import { 
  Gift,
  Coins,
  Inbox,
  Users,
  Activity,
  Palette,
  Settings,
  Folder,
  Paintbrush,
  Store,
  Crown
} from 'lucide-react';

export type Persona = "sender" | "recipient";
type Weights = Partial<Record<Persona, number>>;

export type NavItem = {
  id: string;
  label: string;
  path?: string;
  icon: React.ReactNode;
  children?: NavItem[];
  weights: Weights;  // lower = higher in list
  badge?: "new" | "beta";
};

export const NAV: NavItem[] = [
  { 
    id: "create", 
    label: "Create", 
    path: "/", 
    icon: React.createElement(Gift, { className: "w-5 h-5" }), 
    weights: { sender: 10 } 
  },
  { 
    id: "fund", 
    label: "Fund", 
    path: "/fund", 
    icon: React.createElement(Coins, { className: "w-5 h-5" }), 
    weights: { sender: 20 } 
  },
  { 
    id: "open", 
    label: "Open", 
    path: "/open", 
    icon: React.createElement(Inbox, { className: "w-5 h-5" }), 
    weights: { sender: 30, recipient: 5 } 
  },
  { 
    id: "contacts", 
    label: "Contacts", 
    path: "/contacts", 
    icon: React.createElement(Users, { className: "w-5 h-5" }), 
    weights: { sender: 40 } 
  },
  { 
    id: "activity", 
    label: "Activity", 
    path: "/activity", 
    icon: React.createElement(Activity, { className: "w-5 h-5" }), 
    weights: { sender: 50, recipient: 20 } 
  },
  {
    id: "studio",
    label: "Studio",
    path: "/studio",
    icon: React.createElement(Palette, { className: "w-5 h-5" }),
    weights: { sender: 60 },
    children: [
      { 
        id: "projects", 
        label: "Projects", 
        path: "/studio/projects", 
        icon: React.createElement(Folder, { className: "w-4 h-4" }), 
        weights: { sender: 61 }, 
        badge: "new" 
      },
      { 
        id: "studio-skins", 
        label: "Skins", 
        path: "/studio", 
        icon: React.createElement(Paintbrush, { className: "w-4 h-4" }), 
        weights: { sender: 62 }
      },
      { 
        id: "skin-store", 
        label: "Skin Store", 
        path: "/skins", 
        icon: React.createElement(Store, { className: "w-4 h-4" }), 
        weights: { sender: 63 }
      },
      { 
        id: "kale-skins", 
        label: "KALE Skins", 
        path: "/kale-skins", 
        icon: React.createElement(Crown, { className: "w-4 h-4" }), 
        weights: { sender: 64 }
      },
    ],
  },
  { 
    id: "settings", 
    label: "Settings", 
    path: "/settings", 
    icon: React.createElement(Settings, { className: "w-5 h-5" }), 
    weights: { sender: 999, recipient: 999 } 
  },
];

export function orderedNav(persona: Persona = "sender") {
  const orderOf = (n: NavItem) => n.weights[persona] ?? 500;
  const sortTree = (items: NavItem[]): NavItem[] =>
    items
      .slice()
      .sort((a, b) => orderOf(a) - orderOf(b))
      .map(i => i.children ? { ...i, children: sortTree(i.children) } : i);
  return sortTree(NAV);
}

// Persona detection logic
export function detectPersona(): Persona {
  // Check for JWT token in URL params (recipient mode)
  const urlParams = new URLSearchParams(window.location.search);
  const hasJwtToken = urlParams.has('t');
  
  // Check if we're on a deep link route for opening envelopes
  const isOpenRoute = window.location.pathname.startsWith('/open/') || 
                     (window.location.pathname === '/open' && hasJwtToken);
  
  if (isOpenRoute || hasJwtToken) {
    return "recipient";
  }
  
  return "sender";
}
