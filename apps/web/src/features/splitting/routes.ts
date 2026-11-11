/** Owner-only page patterns; mounted only when the corresponding feature is implemented. */
export const splittingRoutes = {
  members: '/trips/:tripId/members',
  settlement: '/trips/:tripId/settlement',
  settleArrangement: '/trips/:tripId/settlements/new',
  independentRepayment: '/trips/:tripId/repayments/new',
} as const;
