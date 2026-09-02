import { describe, expect, it } from "vitest";
import { edgeAuthorizationHeader } from "../../packages/api-client/src/index.ts";

describe("edgeAuthorizationHeader", () => {
  it("prefers the user access token when both token and api key are present", () => {
    expect(edgeAuthorizationHeader("user-jwt", "anon-key")).toBe("Bearer user-jwt");
  });

  it("falls back to the anon api key when there is no session token", () => {
    expect(edgeAuthorizationHeader(null, "anon-key")).toBe("Bearer anon-key");
  });

  it("does not treat an empty access token as a session", () => {
    expect(edgeAuthorizationHeader("", "anon-key")).toBe("Bearer anon-key");
  });

  it("returns null when neither a token nor an api key is available", () => {
    expect(edgeAuthorizationHeader(null, null)).toBeNull();
    expect(edgeAuthorizationHeader("", "")).toBeNull();
  });
});
