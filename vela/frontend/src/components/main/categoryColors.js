// Consistent color per spending category — used by Budget bars, the
// Spending Breakdown chart, and the dot on each transaction row. Picked
// to harmonize with Vela's dark editorial palette (no neon, no clash
// with the cream + gold accents).
export const CATEGORY_COLORS = {
  Housing:         '#9bb1c9', // dusty blue
  'Food & Dining': '#e7a87a', // warm peach
  Transport:       '#a8c5a3', // sage green
  Shopping:        '#d39ec4', // muted rose
  Subscriptions:   '#c4b18a', // sand
  Entertainment:   '#b89bd1', // soft violet
  Bills:           '#cc8585', // muted brick
  Income:          '#9fc8a0', // mint
  Investment:      '#d4c182', // gold
  Other:           '#8a8a8a', // neutral
};

export function colorFor(category) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.Other;
}
