import {
  HomeIcon, AccountsIcon, TransactionsIcon, CashFlowIcon, InsightsIcon,
  BudgetIcon, RecurringIcon, GoalsIcon, InvestmentsIcon, SageIcon, SettingsIcon,
} from './NavIcons';

// Monarch-style slide-out navigation, grouped into sections for scanability.
// onNavigate(pageId) routes and closes the drawer; active row is highlighted.
const SECTION_GROUPS = [
  {
    title: 'Main',
    items: [
      { id: 'home',         lbl: 'Dashboard',    Icon: HomeIcon },
      { id: 'accounts',     lbl: 'Accounts',     Icon: AccountsIcon },
      { id: 'transactions', lbl: 'Transactions', Icon: TransactionsIcon },
      { id: 'coach',        lbl: 'Sage',         Icon: SageIcon },
    ],
  },
  {
    title: 'Reporting',
    items: [
      { id: 'cashflow',    lbl: 'Cash Flow',   Icon: CashFlowIcon },
      { id: 'insights',    lbl: 'Reports',     Icon: InsightsIcon },
      { id: 'budget',      lbl: 'Budget',      Icon: BudgetIcon },
      { id: 'goals',       lbl: 'Goals',       Icon: GoalsIcon },
      { id: 'investments', lbl: 'Investments', Icon: InvestmentsIcon },
    ],
  },
  {
    title: 'Tools',
    items: [
      { id: 'subscriptions', lbl: 'Recurring',  Icon: RecurringIcon },
      { id: 'perks',         lbl: 'Card Perks', Icon: RecurringIcon },
    ],
  },
  {
    title: 'Account',
    items: [
      { id: 'more', lbl: 'Settings', Icon: SettingsIcon },
    ],
  },
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
          {SECTION_GROUPS.map((group, gi) => (
            <div key={group.title} style={{ marginTop: gi === 0 ? 0 : 12 }}>
              <div style={{
                padding: '8px 14px 6px',
                fontSize: 9, letterSpacing: 2, textTransform: 'uppercase',
                color: 'var(--t3)',
              }}>
                {group.title}
              </div>
              {group.items.map((s) => {
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
          ))}
        </div>
      </nav>
    </>
  );
}
