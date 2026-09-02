export type PhoneParseResult =
  | { ok: true; e164: string | null }
  | { ok: false; code: "invalid_phone" };

/**
 * Normalise an Australian mobile to E.164 (+614XXXXXXXX).
 * Empty / omitted → null. Landlines and non-AU numbers are invalid.
 */
export function parseAuMobile(value: unknown): PhoneParseResult {
  if (value === undefined || value === null) {
    return { ok: true, e164: null };
  }
  if (typeof value !== "string") {
    return { ok: false, code: "invalid_phone" };
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: true, e164: null };
  }

  const digits = trimmed.replace(/\D/g, "");
  let national: string;
  if (digits.startsWith("61") && digits.length === 11) {
    national = digits.slice(2);
  } else if (digits.startsWith("0") && digits.length === 10) {
    national = digits.slice(1);
  } else if (digits.length === 9) {
    national = digits;
  } else {
    return { ok: false, code: "invalid_phone" };
  }

  if (national.length !== 9 || !national.startsWith("4")) {
    return { ok: false, code: "invalid_phone" };
  }
  return { ok: true, e164: `+61${national}` };
}

export function formatAuMobileDisplay(e164: string | null): string | null {
  if (!e164) return null;
  if (!e164.startsWith("+61") || e164.length !== 12) return e164;
  const national = e164.slice(3);
  return `+61 ${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
}
