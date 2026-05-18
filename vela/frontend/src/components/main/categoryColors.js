// Consistent color per spending category — used by Budget bars, the
// Spending Breakdown chart, and the dot on each transaction row. Picked
// to harmonize with Vela's dark editorial palette (no neon, no clash
// with the cream + gold accents).
// More saturated, deliberately distinct hues — the muted v1 set had
// peach/sand/gold reading nearly identical on the donut chart.
// Still tuned for Vela's dark background (no neon, no full-saturation
// primaries), but each category should now be recognizable at a glance.
export const CATEGORY_COLORS = {
  Housing:         '#4a90d9', // confident blue
  'Food & Dining': '#ef6f3a', // coral / burnt orange
  Transport:       '#3aa86b', // forest green
  Shopping:        '#d44ca0', // magenta
  Subscriptions:   '#e3b41a', // amber yellow
  Entertainment:   '#8a5cd6', // purple
  Bills:           '#d63b3b', // brick red
  Income:          '#3dc97f', // bright green
  Investment:      '#c8941e', // dark gold
  Other:           '#888a92', // warm gray
};

export function colorFor(category) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.Other;
}
