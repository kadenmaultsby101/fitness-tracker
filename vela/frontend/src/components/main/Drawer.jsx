import {
  HomeIcon, AccountsIcon, TransactionsIcon, CashFlowIcon, InsightsIcon,
  BudgetIcon, RecurringIcon, GoalsIcon, InvestmentsIcon, SageIcon, SettingsIcon,
} from './NavIcons';

// Monarch-style slide-out navigation. Full section list; tap routes via
// onNavigate(pageId) and closes. Active row is highlighted.
const SECTIONS = [
  { id: 'home',          lbl: 'Dashboard',    Icon: HomeIcon },
  { id: 'accounts',      lbl: 'Accounts',     Icon: AccountsIcon },
  { id: 'transactions',  lbl: 'Transactions', Icon: TransactionsIcon },
  { id: 'cashflow',      lbl: 'Cash Flow',    Icon: CashFlowIcon },
  { id: 'insights',      lbl: 'Reports',      Icon: InsightsIcon },
  { id: 'budget',        lbl: 'Budget',       Icon: BudgetIcon },
  { id: 'subscriptions', lbl: 'Recurring',    Icon: RecurringIcon },
  { id: 'perks',         lbl: 'Card Perks',   Icon: RecurringIcon },
  { id: 'goals',         lbl: 'Goals',        Icon: GoalsIcon },
  { id: 'investments',   lbl: 'Investments',  Icon: InvestmentsIcon },
  { id: 'coach',         lbl: 'Advice',       Icon: SageIcon },
  { id: 'more',          lbl: 'Settings',     Icon: SettingsIcon },
];

export default function Drawer({ open, page, onNavigate, onClose }) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.55)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity .2s ease',
        }}
      />
      <nav
        style={{
          position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 201,
          width: 'min(82%, 300px)',
          background: 'var(--c1)',
          borderRight: '1px solid var(--b1)',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform .24s cubic-bezier(.4,0,.2,1)',
          display: 'flex', flexDirection: 'column',
          paddingTop: 'env(safe-area-inset-top)',
        }}
      >
        <div style={{ padding: '22px 20px 16px' }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 30, fontWeight: 400, letterSpacing: '-1px', lineHeight: 1 }}>
            Vela
          </div>
          <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--t3)', marginTop: 4 }}>
            Financial OS
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 12px 20px' }}>
          {SECTIONS.map((s) => {
            const active = page === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => { onNavigate(s.id); onClose(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  width: '100%', padding: '12px 14px', marginBottom: 2,
                  borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
                  background: active ? 'var(--accent-soft)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--t1)',
                  fontFamily: 'var(--sans)', fontSize: 15, fontWeight: 500,
                  textAlign: 'left',
                }}
              >
                <span className="drawer-ic" style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <s.Icon />
                </span>
                {s.lbl}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
