import { describe, expect, it } from "vitest";
import { formatAuMobileDisplay, parseAuMobile } from "@stravyx/types";

describe("parseAuMobile", () => {
  it("normalises spaced, local, and E.164 AU mobiles to +61400000000", () => {
    expect(parseAuMobile("400 000 000")).toEqual({ ok: true, e164: "+61400000000" });
    expect(parseAuMobile("0400 000 000")).toEqual({ ok: true, e164: "+61400000000" });
    expect(parseAuMobile("+61 400 000 000")).toEqual({ ok: true, e164: "+61400000000" });
  });

  it("treats empty or omitted input as null", () => {
    expect(parseAuMobile("")).toEqual({ ok: true, e164: null });
    expect(parseAuMobile("   ")).toEqual({ ok: true, e164: null });
    expect(parseAuMobile(null)).toEqual({ ok: true, e164: null });
    expect(parseAuMobile(undefined)).toEqual({ ok: true, e164: null });
  });

  it("rejects landlines and junk as invalid_phone", () => {
    expect(parseAuMobile("08 1234 5678")).toEqual({ ok: false, code: "invalid_phone" });
    expect(parseAuMobile("02 9876 5432")).toEqual({ ok: false, code: "invalid_phone" });
    expect(parseAuMobile("not-a-phone")).toEqual({ ok: false, code: "invalid_phone" });
    expect(parseAuMobile("123")).toEqual({ ok: false, code: "invalid_phone" });
    expect(parseAuMobile(400000000)).toEqual({ ok: false, code: "invalid_phone" });
  });
});

describe("formatAuMobileDisplay", () => {
  it("returns null for null and formats E.164 as a spaced AU mobile", () => {
    expect(formatAuMobileDisplay(null)).toBeNull();
    expect(formatAuMobileDisplay("+61400000000")).toBe("+61 400 000 000");
  });
});
