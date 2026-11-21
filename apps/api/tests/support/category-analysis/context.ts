/** Scenario-local IDs only; never shared across workers or accounts. */
export interface CategoryAnalysisContext {
  tripId?: string;
  ownerMemberId?: string;
  members: Map<string, string>;
  categories: Map<string, string>;
  expenses: Map<string, string>;
}
