/**
 * RealRobo `sub_operator_id` values for recharges via Airtel Money lapu (operator_id 11).
 * Source: RealRobo biller / sub-operator list (PREPAIDMOBILE / PREPAIDDTH).
 */
/** Mobile prepaid — always recharge via Airtel Money (operator_id 11). */
export const REALROBO_WALLET_ROUTE_MOBILE_OPERATOR_IDS = [1, 2, 3, 4] as const;

export const REALROBO_WALLET_SUB_OPERATOR_BY_OPERATOR_ID: Readonly<
  Record<number, string>
> = {
  // PREPAIDMOBILE (operator_id 11 + sub_operator_id)
  1: "1524535868", // Airtel
  2: "4055724620", // BSNL
  3: "2732468061", // Jio
  4: "1074995139", // Vi
  // PREPAIDDTH
  5: "654153049", // Airtel DTH
  6: "3841282976", // Dish TV
  7: "671016583", // Sun Direct TV
  8: "2501790927", // Tata Play
  9: "1257163329", // Videocon D2H
};

/** POSTPAIDMOBILE biller codes (Airtel Money lapu route). */
export const REALROBO_AIRTEL_POSTPAID_SUB_OPERATOR_IDS = {
  default: "2847116690",
  postpaid: "3205701260",
  fetchAndPay: "716318493",
} as const;
