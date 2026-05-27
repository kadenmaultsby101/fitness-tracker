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

export const NAV_ICON = {
  home: HomeIcon,
  budget: BudgetIcon,
  goals: GoalsIcon,
  coach: SageIcon,
  more: MoreIcon,
};
