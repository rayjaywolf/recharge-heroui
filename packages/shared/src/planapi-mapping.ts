import { normalizeOperatorKey } from "./recharge-providers";

/** planapi.in prepaid OpCode → internal operator family key. */
export const PLANAPI_OPCODE_TO_OPERATOR_KEY: Record<string, string> = {
  "2": "AIRTEL",
  "4": "BSNL",
  "5": "BSNL",
  "6": "VI",
  "11": "JIO",
  "23": "VI",
};

/** Preferred planapi opcode when resolving from internal operator family. */
const INTERNAL_OPERATOR_KEY_TO_PLANAPI_OPCODE: Record<string, string> = {
  AIRTEL: "2",
  JIO: "11",
  BSNL: "4",
  VI: "23",
};

/**
 * planapi.in numeric CircleCode → app circle code (REALROBO / A1 / MRobotics).
 * Source: planapi OPERATOR CIRCLE LIST + OperatorFetchNew samples.
 */
export const PLANAPI_CIRCLE_CODE_TO_INTERNAL: Record<string, string> = {
  "10": "DL",
  "97": "UPW",
  "02": "PB",
  "2": "PB",
  "03": "HP",
  "3": "HP",
  "96": "HR",
  "55": "JK",
  "54": "UPE",
  "92": "MU",
  "90": "MH",
  "98": "GJ",
  "93": "MP",
  "70": "RJ",
  "31": "KO",
  "51": "WB",
  "53": "OR",
  "56": "AS",
  "16": "NE",
  "17": "NE",
  "52": "BR",
  "06": "KA",
  "6": "KA",
  "40": "CN",
  "94": "TN",
  "95": "KL",
  "49": "AP",
  "101": "CG",
  "105": "JH",
};

/** Circle name fragments from planapi → internal code. */
const PLANAPI_CIRCLE_NAME_TO_INTERNAL: [string, string][] = [
  ["delhi", "DL"],
  ["up(west)", "UPW"],
  ["uttar pradesh west", "UPW"],
  ["up(east)", "UPE"],
  ["uttar pradesh east", "UPE"],
  ["punjab", "PB"],
  ["himachal", "HP"],
  ["haryana", "HR"],
  ["jammu", "JK"],
  ["mumbai", "MU"],
  ["maharashtra", "MH"],
  ["gujarat", "GJ"],
  ["madhya pradesh", "MP"],
  ["rajasthan", "RJ"],
  ["kolkat", "KO"],
  ["kolkata", "KO"],
  ["west bengal", "WB"],
  ["orissa", "OR"],
  ["odisha", "OR"],
  ["assam", "AS"],
  ["north east", "NE"],
  ["nesa", "NE"],
  ["bihar", "BR"],
  ["karnataka", "KA"],
  ["chennai", "CN"],
  ["tamil nadu", "TN"],
  ["kerala", "KL"],
  ["andhra", "AP"],
  ["chhattisgarh", "CG"],
  ["chhatisgarh", "CG"],
  ["jharkhand", "JH"],
  ["goa", "MH"],
  ["sikkim", "NE"],
  ["tripura", "NE"],
  ["meghalay", "NE"],
  ["mizoram", "NE"],
  ["manipur", "NE"],
];

/** When exact code is missing on a provider, try these equivalents. */
const INTERNAL_CIRCLE_FALLBACKS: Record<string, string[]> = {
  CG: ["MP"],
  UP: ["UPW"],
  CI: ["CN"],
  CH: ["DL"],
  GB: ["DL"],
};

export function mapInternalOperatorToPlanapiOpCode(
  operatorLabel: string,
): string | null {
  const key = mapPlanapiOperatorKey("", operatorLabel);
  if (key && INTERNAL_OPERATOR_KEY_TO_PLANAPI_OPCODE[key]) {
    return INTERNAL_OPERATOR_KEY_TO_PLANAPI_OPCODE[key];
  }

  const normalized = normalizeOperatorKey(operatorLabel);
  for (const [internal, opcode] of Object.entries(
    INTERNAL_OPERATOR_KEY_TO_PLANAPI_OPCODE,
  )) {
    if (normalized === internal) return opcode;
    if (internal === "JIO" && normalized.includes("JIO")) return opcode;
    if (internal === "BSNL" && normalized.includes("BSNL")) return opcode;
    if (internal === "AIRTEL" && normalized.includes("AIRTEL")) return opcode;
    if (
      internal === "VI" &&
      (normalized.includes("VI") ||
        normalized.includes("VODAFONE") ||
        normalized.includes("IDEA"))
    ) {
      return opcode;
    }
  }

  return null;
}

/** Resolve planapi numeric circle code for plans API (prefer value from operator lookup). */
export function resolvePlanapiCircleCode(params: {
  planapiCircleCode?: string | null;
  planapiCircleName?: string | null;
  internalCircleCode?: string | null;
}): string | null {
  const fromApi = String(params.planapiCircleCode ?? "").trim();
  if (fromApi) return fromApi;

  const internal = String(params.internalCircleCode ?? "").trim().toUpperCase();
  if (internal) {
    for (const [planapiCode, appCode] of Object.entries(
      PLANAPI_CIRCLE_CODE_TO_INTERNAL,
    )) {
      if (appCode === internal) return planapiCode;
    }
  }

  const name = String(params.planapiCircleName ?? "").toLowerCase().trim();
  if (name) {
    for (const [fragment, code] of PLANAPI_CIRCLE_NAME_TO_INTERNAL) {
      if (name.includes(fragment)) {
        for (const [planapiCode, appCode] of Object.entries(
          PLANAPI_CIRCLE_CODE_TO_INTERNAL,
        )) {
          if (appCode === code) return planapiCode;
        }
      }
    }
  }

  return null;
}

export function mapPlanapiOperatorKey(
  opCode: string | null | undefined,
  operatorName: string | null | undefined,
): string {
  const code = String(opCode ?? "").trim();
  if (code && PLANAPI_OPCODE_TO_OPERATOR_KEY[code]) {
    return PLANAPI_OPCODE_TO_OPERATOR_KEY[code];
  }

  const name = String(operatorName ?? "").toUpperCase().trim();
  if (!name) return "";

  if (name.includes("JIO") || name.includes("RELIANCE")) return "JIO";
  if (name.includes("AIRTEL")) return "AIRTEL";
  if (
    name.includes("VODAFONE") ||
    name.includes("IDEA") ||
    name === "VI" ||
    name.includes("VODAFONE IDEA")
  ) {
    return "VI";
  }
  if (name.includes("BSNL")) return "BSNL";

  return normalizeOperatorKey(name);
}

export function mapPlanapiCircleCode(
  planapiCircleCode: string | null | undefined,
  planapiCircleName: string | null | undefined,
): string | null {
  const raw = String(planapiCircleCode ?? "").trim();
  if (raw) {
    const mapped = PLANAPI_CIRCLE_CODE_TO_INTERNAL[raw];
    if (mapped) return mapped;
  }

  const name = String(planapiCircleName ?? "").toLowerCase().trim();
  if (!name) return null;

  for (const [fragment, code] of PLANAPI_CIRCLE_NAME_TO_INTERNAL) {
    if (name.includes(fragment)) return code;
  }

  return null;
}

/**
 * Pick the commission-rule operator string that best matches planapi output.
 */
export function matchConfiguredOperator(
  internalKey: string,
  configuredOperators: string[],
): string | null {
  if (!internalKey || configuredOperators.length === 0) return null;

  const key = normalizeOperatorKey(internalKey);

  for (const op of configuredOperators) {
    if (normalizeOperatorKey(op) === key) return op;
  }

  for (const op of configuredOperators) {
    const normalized = normalizeOperatorKey(op);
    if (key === "JIO" && (normalized.includes("JIO") || normalized.includes("RELIANCE"))) {
      return op;
    }
    if (
      key === "VI" &&
      (normalized.includes("VI") ||
        normalized.includes("VODAFONE") ||
        normalized.includes("IDEA"))
    ) {
      return op;
    }
    if (key === "BSNL" && normalized.includes("BSNL")) return op;
    if (key === "AIRTEL" && normalized.includes("AIRTEL")) return op;
  }

  return null;
}

/**
 * Resolve internal circle code supported by the routed provider's circle list.
 */
export function matchConfiguredCircle(
  internalCircle: string | null,
  allowedCircleCodes: string[],
): string | null {
  if (!internalCircle || allowedCircleCodes.length === 0) return null;

  const upper = internalCircle.toUpperCase();
  if (allowedCircleCodes.includes(upper)) return upper;

  const fallbacks = INTERNAL_CIRCLE_FALLBACKS[upper] ?? [];
  for (const alt of fallbacks) {
    if (allowedCircleCodes.includes(alt)) return alt;
  }

  return null;
}
