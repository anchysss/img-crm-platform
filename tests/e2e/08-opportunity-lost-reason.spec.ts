import { test } from "@playwright/test";

/** PZ 12.3. LOST bez lostReason-a mora pasti. */
test.skip("Opportunity LOST bez razloga odbijen", async () => {
  // tRPC opportunities.setStage { stageKod: 'LOST' } bez lostReasonKod → VALIDATION.
});
