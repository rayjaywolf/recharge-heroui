/**
 * Dummy gateway for local/dev — no external API calls.
 * Outcome distribution: 80% success, 10% failed, 10% pending.
 */

export type TestRechargeStatus = "success" | "failure" | "pending";

export interface TestRechargeResult {
  status: TestRechargeStatus;
  message: string;
  referenceId: string;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function performTestRecharge(
  phoneNumber: string,
  operator: string,
  amount: number,
  transactionId: string,
  circleCode?: string
): Promise<TestRechargeResult> {
  // Simulate network latency (400–1200ms)
  const latency = 400 + Math.floor(Math.random() * 800);
  await delay(latency);

  const roll = Math.random();
  const refBase = `TEST-${transactionId.slice(-8).toUpperCase()}`;
  const circlePart = circleCode ? ` [CIRCLE: ${circleCode}]` : "";

  if (roll < 0.8) {
    return {
      status: "success",
      message: `Test recharge successful for ${operator} ₹${amount}`,
      referenceId: `${refBase}-OK [TX_ID: ${transactionId}]${circlePart}`,
    };
  }

  if (roll < 0.9) {
    return {
      status: "failure",
      message: `Test gateway declined recharge for ${phoneNumber} (${operator})`,
      referenceId: `${refBase}-FAIL [TX_ID: ${transactionId}]`,
    };
  }

  return {
    status: "pending",
    message: `Test recharge pending with operator for ${phoneNumber}`,
    referenceId: `${refBase}-PEND [TX_ID: ${transactionId}]${circlePart}`,
  };
}
