import { describe, expect, it } from "vitest";
import { parseArn, parseReoc, canReplaceOperatorCredentials, hasAllRequiredCredentialsConfirmed } from "@stravyx/types";

describe("parseArn", () => {
  it("accepts 6 or 7 ASCII digits and strips surrounding whitespace", () => {
    expect(parseArn("123456")).toEqual({ ok: true, arn: "123456" });
    expect(parseArn("1234567")).toEqual({ ok: true, arn: "1234567" });
    expect(parseArn("  7654321  ")).toEqual({ ok: true, arn: "7654321" });
    expect(parseArn("\t654321\n")).toEqual({ ok: true, arn: "654321" });
  });

  it("accepts random well-formed digit strings without claiming CASA validity", () => {
    expect(parseArn("000000")).toEqual({ ok: true, arn: "000000" });
    expect(parseArn("9999999")).toEqual({ ok: true, arn: "9999999" });
    expect(parseArn("482917")).toEqual({ ok: true, arn: "482917" });
  });

  it("rejects invented, punctuated, lettered, or wrong-length values", () => {
    const invalid: unknown[] = [
      "",
      "   ",
      "12345",
      "12345678",
      "12345a",
      "A23456",
      "123-456",
      "123 456",
      "12.3456",
      "ARN123456",
      "2024-0078415",
      123456,
      null,
      undefined,
      {},
    ];
    for (const value of invalid) {
      expect(parseArn(value)).toEqual({ ok: false, code: "invalid_arn" });
    }
  });

  it("treats missing or empty input as invalid, not skip", () => {
    expect(parseArn(undefined)).toEqual({ ok: false, code: "invalid_arn" });
    expect(parseArn(null)).toEqual({ ok: false, code: "invalid_arn" });
    expect(parseArn("")).toEqual({ ok: false, code: "invalid_arn" });
  });
});

describe("parseReoc", () => {
  it("matches CASA.ReOC.#### case-insensitively and canonicalises casing", () => {
    expect(parseReoc("CASA.ReOC.0001")).toEqual({ ok: true, reocNumber: "CASA.ReOC.0001" });
    expect(parseReoc("casa.reoc.1234")).toEqual({ ok: true, reocNumber: "CASA.ReOC.1234" });
    expect(parseReoc("Casa.REOC.9876")).toEqual({ ok: true, reocNumber: "CASA.ReOC.9876" });
    expect(parseReoc("  casa.ReOc.0420  ")).toEqual({ ok: true, reocNumber: "CASA.ReOC.0420" });
  });

  it("accepts random 4-digit suffixes without claiming CASA validity", () => {
    expect(parseReoc("CASA.ReOC.0000")).toEqual({ ok: true, reocNumber: "CASA.ReOC.0000" });
    expect(parseReoc("CASA.ReOC.9999")).toEqual({ ok: true, reocNumber: "CASA.ReOC.9999" });
    expect(parseReoc("CASA.ReOC.4810")).toEqual({ ok: true, reocNumber: "CASA.ReOC.4810" });
  });

  it("rejects other separators, wrong digit counts, and invented strings", () => {
    const invalid: unknown[] = [
      "",
      "   ",
      "CASA-ReOC-0001",
      "CASA_ReOC_0001",
      "CASA ReOC 0001",
      "CASA.ReOC.12",
      "CASA.ReOC.12345",
      "CASA.ReOC.abcd",
      "CASA.ReOC.12a4",
      "ReOC.0001",
      "CASA.ReOC.",
      "CASA.ReOC.0001 extra",
      "123456",
      1,
      null,
      undefined,
      {},
    ];
    for (const value of invalid) {
      expect(parseReoc(value)).toEqual({ ok: false, code: "invalid_reoc" });
    }
  });

  it("treats missing or empty input as invalid, not skip", () => {
    expect(parseReoc(undefined)).toEqual({ ok: false, code: "invalid_reoc" });
    expect(parseReoc(null)).toEqual({ ok: false, code: "invalid_reoc" });
    expect(parseReoc("")).toEqual({ ok: false, code: "invalid_reoc" });
  });
});

describe("credential completeness and replaceability", () => {
  it("requires all three kinds with a confirmed timestamp", () => {
    expect(hasAllRequiredCredentialsConfirmed([])).toBe(false);
    expect(hasAllRequiredCredentialsConfirmed([
      { kind: "reoc_certificate", confirmed_at: "2026-08-24T00:00:00.000Z" },
      { kind: "repl", confirmedAt: "2026-08-24T00:00:00.000Z" },
    ])).toBe(false);
    expect(hasAllRequiredCredentialsConfirmed([
      { kind: "reoc_certificate", confirmed_at: "2026-08-24T00:00:00.000Z" },
      { kind: "repl", confirmed_at: "2026-08-24T00:00:00.000Z" },
      { kind: "certificate_of_currency", confirmed_at: null },
    ])).toBe(false);
    expect(hasAllRequiredCredentialsConfirmed([
      { kind: "reoc_certificate", confirmed_at: "2026-08-24T00:00:00.000Z" },
      { kind: "repl", confirmedAt: "2026-08-24T00:00:00.000Z" },
      { kind: "certificate_of_currency", confirmed_at: "2026-08-24T00:00:00.000Z" },
    ])).toBe(true);
  });

  it("locks replacements while pending review or verified", () => {
    expect(canReplaceOperatorCredentials("pending_docs", false)).toBe(true);
    expect(canReplaceOperatorCredentials("rejected", false)).toBe(true);
    expect(canReplaceOperatorCredentials("pending_review", false)).toBe(false);
    expect(canReplaceOperatorCredentials("verified", true)).toBe(false);
    expect(canReplaceOperatorCredentials("pending_docs", true)).toBe(false);
  });
});
