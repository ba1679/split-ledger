import { Given } from '../../../support/fixtures.js';
import {
  openBrowserSettlementForm,
  settlementFormPhrase,
} from '../../../support/splitting/settlement-form.js';

Given(settlementFormPhrase, async ({ page, world }, payer: string) => {
  await openBrowserSettlementForm(page, world, payer);
});
