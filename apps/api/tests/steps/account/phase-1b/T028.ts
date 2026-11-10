import { When } from '../../../support/fixtures.js';
import {
  requestUnauthenticatedSettlement,
  unauthenticatedSettlementPhrase,
} from '../../../support/splitting/unauthenticated-settlement.js';

When(unauthenticatedSettlementPhrase, async ({ world }) => {
  await requestUnauthenticatedSettlement(world);
});
