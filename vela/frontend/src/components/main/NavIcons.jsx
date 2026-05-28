// Simple, consistent line icons for the bottom nav. Stroke uses
// currentColor so the .bn.on color (accent) flows through.
const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 24 24',
};

export function HomeIcon() {
  return (
    <svg {...base}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" /></svg>
  );
}
export function BudgetIcon() {
  return (
    <svg {...base}><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M3 20h18" /></svg>
  );
}
export function GoalsIcon() {
  return (
    <svg {...base}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.2" /></svg>
  );
}
export function SageIcon() {
  return (
    <svg {...base}><path d="M12 3c.6 3.5 2 4.9 5.5 5.5C14 9 12.6 10.5 12 14c-.6-3.5-2-4.9-5.5-5.5C10 8 11.4 6.5 12 3Z" /><path d="M18.5 14c.3 1.6 1 2.3 2.5 2.6-1.5.3-2.2 1-2.5 2.6-.3-1.6-1-2.3-2.5-2.6 1.5-.3 2.2-1 2.5-2.6Z" /></svg>
  );
}
export function MoreIcon() {
  return (
    <svg {...base}><circle cx="5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="19" cy="12" r="1.4" /></svg>
  );
}
export function InsightsIcon() {
  return (
    <svg {...base}><path d="M21 12a9 9 0 1 1-9-9v9Z" /><path d="M14 3.5a9 9 0 0 1 6.5 6.5H14Z" /></svg>
  );
}
export function SearchIcon() {
  return (
    <svg {...base}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
  );
}
export function MenuIcon() {
  return (
    <svg {...base}><path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h18" /></svg>
  );
}
export function AccountsIcon() {
  return (
    <svg {...base}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /><path d="M16 3v3" /><path d="M8 3v3" /></svg>
  );
}
export function TransactionsIcon() {
  return (
    <svg {...base}><path d="M7 7h11l-3-3" /><path d="M17 17H6l3 3" /></svg>
  );
}
export function CashFlowIcon() {
  return (
    <svg {...base}><path d="M4 7h9a4 4 0 0 1 0 8H8" /><path d="m7 12-3 3 3 3" /><path d="M16 4l3 3-3 3" /></svg>
  );
}
export function RecurringIcon() {
  return (
    <svg {...base}><path d="M4 9a8 8 0 0 1 13-3l3 3" /><path d="M20 4v5h-5" /><path d="M20 15a8 8 0 0 1-13 3l-3-3" /><path d="M4 20v-5h5" /></svg>
  );
}
export function InvestmentsIcon() {
  return (
    <svg {...base}><path d="M4 16l5-5 4 4 7-7" /><path d="M16 8h4v4" /></svg>
  );
}
export function SettingsIcon() {
  return (
    <svg {...base}><circle cx="12" cy="12" r="3" /><path d="M19.4 13.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-2.9-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.1-2.9H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.1-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 2.9 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.4 1Z" /></svg>
  );
}

export const NAV_ICON = {
  home: HomeIcon,
  transactions: TransactionsIcon,
  budget: BudgetIcon,
  coach: SageIcon,
  menu: MenuIcon,
  insights: InsightsIcon,
  goals: GoalsIcon,
  accounts: AccountsIcon,
  cashflow: CashFlowIcon,
  recurring: RecurringIcon,
  investments: InvestmentsIcon,
  settings: SettingsIcon,
  more: MoreIcon,
};
