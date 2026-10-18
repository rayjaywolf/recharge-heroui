/**
 * RealRobo `sub_operator_id` biller codes for wallet-lapu recharges.
 *
 * A wallet route sends `operator_id = <wallet>` plus `sub_operator_id = <biller code>`.
 * Each wallet (Airtel Money = 11, Amazon = 17) has its own biller code list.
 * Source: RealRobo biller / sub-operator list (PREPAID_RECHARGE / DTH / MOBILE_POSTPAID).
 */

/** Mobile prepaid — always recharged via a wallet route (never direct operator_id). */
export const REALROBO_WALLET_ROUTE_MOBILE_OPERATOR_IDS = [1, 2, 3, 4] as const;

export const REALROBO_AIRTEL_MONEY_OPERATOR_ID = 11;
export const REALROBO_AMAZON_OPERATOR_ID = 17;

export const REALROBO_WALLET_OPERATOR_IDS = [
  REALROBO_AIRTEL_MONEY_OPERATOR_ID,
  REALROBO_AMAZON_OPERATOR_ID,
] as const;

export type RealRoboWalletOperatorId =
  (typeof REALROBO_WALLET_OPERATOR_IDS)[number];

export interface RealRoboPostpaidSubOperatorIds {
  airtel: string;
  /** Airtel "fetch and pay" variant, where the wallet exposes one. */
  airtelFetchAndPay?: string;
  /** Legacy/default Airtel postpaid biller, where the wallet exposes one. */
  airtelDefault?: string;
  bsnl?: string;
  jio?: string;
  vi?: string;
}

export interface RealRoboWalletSubOperators {
  /** Keyed by RealRobo direct operator_id (1–9). */
  byOperatorId: Readonly<Record<number, string>>;
  postpaid: Readonly<RealRoboPostpaidSubOperatorIds>;
}

const AIRTEL_MONEY_SUB_OPERATORS: RealRoboWalletSubOperators = {
  byOperatorId: {
    // PREPAIDMOBILE
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
  },
  postpaid: {
    airtelDefault: "2847116690",
    airtel: "3205701260",
    airtelFetchAndPay: "716318493",
  },
};

const AMAZON_SUB_OPERATORS: RealRoboWalletSubOperators = {
  byOperatorId: {
    // PREPAID_RECHARGE
    1: "4055679830", // Airtel (AIRTEL_PRE)
    2: "9865222", // BSNL (BSNL_PRE)
    3: "2215673867", // Jio (JIO_PRE)
    4: "2014429421", // Vi (VODAFONE_IDEA_PRE)
    // DTH
    5: "1689553544", // Airtel Digital TV (AIRTELDTH)
    6: "2637424641", // Dish TV (DISH00000NAT01)
    7: "781356231", // Sun Direct (SUND00000NAT01)
    8: "2408150274", // Tata Play (TATASKY00NAT01)
    9: "451144483", // D2H (VIDEOCNDTH)
  },
  postpaid: {
    airtel: "4032544018", // Airtel Postpaid (AIRMOBOB)
    bsnl: "2995610146", // BSNL Mobile Postpaid (BSNLMOB00NAT01)
    jio: "2801359923", // Jio Postpaid (JIO000000NAT01)
    vi: "1679605053", // Vi Postpaid (VODA00000NAT01)
  },
};

export const REALROBO_WALLET_SUB_OPERATORS: Readonly<
  Record<RealRoboWalletOperatorId, RealRoboWalletSubOperators>
> = {
  [REALROBO_AIRTEL_MONEY_OPERATOR_ID]: AIRTEL_MONEY_SUB_OPERATORS,
  [REALROBO_AMAZON_OPERATOR_ID]: AMAZON_SUB_OPERATORS,
};

/** @deprecated Airtel Money (11) table; use REALROBO_WALLET_SUB_OPERATORS. */
export const REALROBO_WALLET_SUB_OPERATOR_BY_OPERATOR_ID =
  AIRTEL_MONEY_SUB_OPERATORS.byOperatorId;

/** @deprecated Airtel Money (11) postpaid codes; use REALROBO_WALLET_SUB_OPERATORS. */
export const REALROBO_AIRTEL_POSTPAID_SUB_OPERATOR_IDS = {
  default: AIRTEL_MONEY_SUB_OPERATORS.postpaid.airtelDefault!,
  postpaid: AIRTEL_MONEY_SUB_OPERATORS.postpaid.airtel,
  fetchAndPay: AIRTEL_MONEY_SUB_OPERATORS.postpaid.airtelFetchAndPay!,
} as const;
