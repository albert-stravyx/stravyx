import { describe, expect, it } from "vitest";
import { parseSignupRole } from "@stravyx/types";
import {
  parseSignupBody,
  signup,
  type SignupAdmin,
  type SignupProfileRow,
} from "../../supabase/functions/api/routes/signup.ts";

interface CreateUserAttributes {
  email: string;
  password: string;
  email_confirm: boolean;
  user_metadata: Record<string, unknown>;
  app_metadata: Record<string, unknown>;
}

interface AdminError { message: string; status?: number; code?: string; }
interface CreatedUser { id: string; email?: string; }
interface JsonPayload {
  error?: unknown; code?: unknown; detail?: unknown;
  userId?: unknown; email?: unknown; role?: unknown;
}

class FakeSignupAdmin {
  readonly createUserCalls: CreateUserAttributes[] = [];
  readonly deleteUserCalls: string[] = [];
  readonly upsertProfileCalls: SignupProfileRow[] = [];
  readonly insertOrganizationCalls: Array<{ name: string }> = [];
  readonly insertReocProfileCalls: Array<{
    owner_user_id: string;
    organization_id: string;
    arn: string;
    reoc_number: string;
    verified: boolean;
    online: boolean;
    verification_status: string;
  }> = [];
  nextError: AdminError | null = null;
  nextProfileError: AdminError | null = null;
  nextProfileThrow: Error | null = null;
  nextDeleteError: AdminError | null = null;
  nextUser: CreatedUser | null = { id: "user-1", email: "ada@example.com" };

  readonly auth = {
    admin: {
      createUser: (attributes: CreateUserAttributes) => {
        this.createUserCalls.push(attributes);
        if (this.nextError) {
          return Promise.resolve({ data: { user: null }, error: this.nextError });
        }
        return Promise.resolve({ data: { user: this.nextUser }, error: null });
      },
      deleteUser: (id: string) => {
        this.deleteUserCalls.push(id);
        if (this.nextDeleteError) {
          return Promise.resolve({ data: { user: null }, error: this.nextDeleteError });
        }
        return Promise.resolve({ data: { user: null }, error: null });
      },
    },
  };

  upsertProfile = (row: SignupProfileRow) => {
    this.upsertProfileCalls.push(row);
    if (this.nextProfileThrow) {
      return Promise.reject(this.nextProfileThrow);
    }
    return Promise.resolve({ error: this.nextProfileError });
  };

  insertOrganization = (row: { name: string }) => {
    this.insertOrganizationCalls.push(row);
    return Promise.resolve({ data: { id: "org-1" }, error: null });
  };

  insertReocProfile = (row: {
    owner_user_id: string;
    organization_id: string;
    arn: string;
    reoc_number: string;
    verified: false;
    online: false;
    verification_status: "pending_docs";
  }) => {
    this.insertReocProfileCalls.push(row);
    return Promise.resolve({ error: null });
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toSignupAdmin(admin: FakeSignupAdmin): SignupAdmin {
  return admin;
}

async function parseResponsePayload(response: Response): Promise<JsonPayload> {
  const payload: unknown = await response.json();
  if (!isRecord(payload)) throw new Error("response_payload_not_object");
  return payload;
}

function signupRequest(body: unknown, rawBody?: string): Request {
  return new Request("http://localhost/api/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: rawBody ?? JSON.stringify(body),
  });
}

function validBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { email: "ada@example.com", password: "password1", fullName: "Ada Lovelace", role: "customer", ...overrides };
}

describe("parseSignupRole", () => {
  it("maps customer and operator only", () => {
    expect(parseSignupRole("customer")).toBe("customer");
    expect(parseSignupRole("operator")).toBe("operator");
    expect(parseSignupRole("admin")).toBeNull();
    expect(parseSignupRole("")).toBeNull();
    expect(parseSignupRole(null)).toBeNull();
    expect(parseSignupRole(undefined)).toBeNull();
    expect(parseSignupRole(1)).toBeNull();
  });
});

describe("parseSignupBody", () => {
  it("accepts a trimmed customer payload", () => {
    const parsed = parseSignupBody({
      email: "  ada@example.com  ",
      password: "password1",
      fullName: "  Ada Lovelace  ",
      role: "customer",
    });
    expect(parsed).toEqual({
      ok: true,
      value: {
        email: "ada@example.com",
        password: "password1",
        fullName: "Ada Lovelace",
        role: "customer",
        phoneE164: null,
        company: null,
        defaultLocation: null,
        operatorLicenceNumber: null,
        serviceArea: null,
        arn: null,
        reocNumber: null,
      },
    });
  });

  it("rejects a non-object as invalid_json", () => {
    const parsed = parseSignupBody(["customer"]);
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.code).toBe("invalid_json");
  });

  it("rejects missing fields as invalid_body", () => {
    const parsed = parseSignupBody({ email: "ada@example.com" });
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.code).toBe("invalid_body");
  });

  it("rejects empty or at-less email as invalid_email", () => {
    const empty = parseSignupBody(validBody({ email: "   " }));
    expect(empty.ok).toBe(false);
    if (empty.ok) return;
    expect(empty.code).toBe("invalid_email");

    const noAt = parseSignupBody(validBody({ email: "ada.example.com" }));
    expect(noAt.ok).toBe(false);
    if (noAt.ok) return;
    expect(noAt.code).toBe("invalid_email");
  });

  it("rejects a short password as invalid_password", () => {
    const parsed = parseSignupBody(validBody({ password: "short" }));
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.code).toBe("invalid_password");
  });

  it("rejects an empty fullName as invalid_full_name", () => {
    const parsed = parseSignupBody(validBody({ fullName: "   " }));
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.code).toBe("invalid_full_name");
  });

  it("rejects admin and other roles as invalid_role", () => {
    const admin = parseSignupBody(validBody({ role: "admin" }));
    expect(admin.ok).toBe(false);
    if (admin.ok) return;
    expect(admin.code).toBe("invalid_role");

    const missing = parseSignupBody({
      email: "ada@example.com",
      password: "password1",
      fullName: "Ada Lovelace",
    });
    expect(missing.ok).toBe(false);
    if (missing.ok) return;
    expect(missing.code).toBe("invalid_role");
  });

  it("normalises AU phone and optional extras", () => {
    const parsed = parseSignupBody(validBody({
      phone: "0400 000 000",
      company: "  Analytical Engines  ",
      defaultLocation: "Adelaide SA",
      operatorLicenceNumber: "ReOC-1",
      serviceArea: "Greater Adelaide",
    }));
    expect(parsed).toEqual({
      ok: true,
      value: {
        email: "ada@example.com",
        password: "password1",
        fullName: "Ada Lovelace",
        role: "customer",
        phoneE164: "+61400000000",
        company: "Analytical Engines",
        defaultLocation: "Adelaide SA",
        operatorLicenceNumber: "ReOC-1",
        serviceArea: "Greater Adelaide",
        arn: null,
        reocNumber: null,
      },
    });
  });

  it("treats skipped or blank phone as null", () => {
    const omitted = parseSignupBody(validBody());
    expect(omitted.ok).toBe(true);
    if (!omitted.ok) return;
    expect(omitted.value.phoneE164).toBeNull();
    const blank = parseSignupBody(validBody({ phone: "   " }));
    expect(blank.ok).toBe(true);
    if (!blank.ok) return;
    expect(blank.value.phoneE164).toBeNull();
  });

  it("rejects invalid AU phone as invalid_phone", () => {
    for (const phone of ["08 1234 5678", "not-a-phone", 400000000]) {
      const parsed = parseSignupBody(validBody({ phone }));
      expect(parsed.ok).toBe(false);
      if (parsed.ok) return;
      expect(parsed.code).toBe("invalid_phone");
    }
  });
});

describe("signup route", () => {
  it("creates a customer with app_metadata.role and no role in user_metadata", async () => {
    const admin = new FakeSignupAdmin();
    const response = await signup(signupRequest(validBody()), {}, toSignupAdmin(admin));

    expect(response.status).toBe(201);
    const payload = await parseResponsePayload(response);
    expect(payload).toEqual({
      userId: "user-1",
      email: "ada@example.com",
      role: "customer",
    });
    expect(admin.createUserCalls).toHaveLength(1);
    const call = admin.createUserCalls[0];
    if (!call) throw new Error("createUser_not_called");
    expect(call.email).toBe("ada@example.com");
    expect(call.password).toBe("password1");
    expect(call.email_confirm).toBe(true);
    expect(call.app_metadata).toEqual({ role: "customer" });
    expect(call.user_metadata).toEqual({ full_name: "Ada Lovelace" });
    expect(Object.prototype.hasOwnProperty.call(call.user_metadata, "role")).toBe(false);
    expect(admin.upsertProfileCalls).toEqual([
      {
        id: "user-1",
        email: "ada@example.com",
        full_name: "Ada Lovelace",
        primary_role: "customer",
        phone_e164: null,
        company: null,
        default_location: null,
        operator_licence_number: null,
        service_area: null,
      },
    ]);
    expect(admin.deleteUserCalls).toEqual([]);
    expect(admin.insertOrganizationCalls).toEqual([]);
    expect(admin.insertReocProfileCalls).toEqual([]);
  });

  it("does not upsert a profile when createUser fails", async () => {
    const admin = new FakeSignupAdmin();
    admin.nextError = {
      message: "A user with this email address has already been registered",
      status: 422,
      code: "email_exists",
    };
    const response = await signup(signupRequest(validBody()), {}, toSignupAdmin(admin));

    expect(response.status).toBe(409);
    expect(admin.upsertProfileCalls).toEqual([]);
    expect(admin.deleteUserCalls).toEqual([]);
  });

  it("deletes the Auth user when the profile role upsert fails after createUser", async () => {
    const admin = new FakeSignupAdmin();
    admin.nextProfileError = {
      message: "profiles write failed",
      code: "profile_write_failed",
    };
    const response = await signup(
      signupRequest(validBody({ role: "customer" })),
      {},
      toSignupAdmin(admin),
    );

    expect(response.status).toBe(500);
    const payload = await parseResponsePayload(response);
    expect(payload.code).toBe("signup_failed");
    expect(admin.createUserCalls).toHaveLength(1);
    expect(admin.upsertProfileCalls).toHaveLength(1);
    expect(admin.upsertProfileCalls[0]?.primary_role).toBe("customer");
    expect(admin.deleteUserCalls).toEqual(["user-1"]);
  });

  it("deletes the Auth user when the profile role upsert throws after createUser", async () => {
    const admin = new FakeSignupAdmin();
    admin.nextProfileThrow = new Error("profiles write threw");
    const response = await signup(
      signupRequest(validBody({ role: "customer" })),
      {},
      toSignupAdmin(admin),
    );

    expect(response.status).toBe(500);
    const payload = await parseResponsePayload(response);
    expect(payload.code).toBe("signup_failed");
    expect(admin.deleteUserCalls).toEqual(["user-1"]);
  });

  it("still returns signup_failed when compensating deleteUser fails", async () => {
    const admin = new FakeSignupAdmin();
    admin.nextProfileError = {
      message: "profiles write failed",
      code: "profile_write_failed",
    };
    admin.nextDeleteError = {
      message: "delete user failed",
      code: "delete_failed",
    };
    const response = await signup(
      signupRequest(validBody({ role: "customer" })),
      {},
      toSignupAdmin(admin),
    );

    expect(response.status).toBe(500);
    const payload = await parseResponsePayload(response);
    expect(payload.code).toBe("signup_failed");
    expect(admin.deleteUserCalls).toEqual(["user-1"]);
  });

  it("rejects admin without calling createUser", async () => {
    const admin = new FakeSignupAdmin();
    const response = await signup(
      signupRequest(validBody({ role: "admin" })),
      {},
      toSignupAdmin(admin),
    );

    expect(response.status).toBe(400);
    const payload = await parseResponsePayload(response);
    expect(payload.code).toBe("invalid_role");
    expect(payload.error).toBeTruthy();
    expect(payload.detail).toBeTruthy();
    expect(admin.createUserCalls).toEqual([]);
    expect(admin.upsertProfileCalls).toEqual([]);
    expect(admin.deleteUserCalls).toEqual([]);
  });

  it("returns invalid_json for a non-JSON body", async () => {
    const admin = new FakeSignupAdmin();
    const response = await signup(
      signupRequest(null, "not-json"),
      {},
      toSignupAdmin(admin),
    );

    expect(response.status).toBe(400);
    const payload = await parseResponsePayload(response);
    expect(payload.code).toBe("invalid_json");
    expect(admin.createUserCalls).toEqual([]);
  });

  it("returns invalid_body for a missing-field object", async () => {
    const admin = new FakeSignupAdmin();
    const response = await signup(
      signupRequest({ email: "ada@example.com" }),
      {},
      toSignupAdmin(admin),
    );

    expect(response.status).toBe(400);
    const payload = await parseResponsePayload(response);
    expect(payload.code).toBe("invalid_body");
    expect(admin.createUserCalls).toEqual([]);
  });

  it("returns invalid_email for an address without @", async () => {
    const admin = new FakeSignupAdmin();
    const response = await signup(
      signupRequest(validBody({ email: "ada.example.com" })),
      {},
      toSignupAdmin(admin),
    );

    expect(response.status).toBe(400);
    const payload = await parseResponsePayload(response);
    expect(payload.code).toBe("invalid_email");
    expect(admin.createUserCalls).toEqual([]);
  });

  it("returns invalid_password for a password shorter than 8 characters", async () => {
    const admin = new FakeSignupAdmin();
    const response = await signup(
      signupRequest(validBody({ password: "shortpw" })),
      {},
      toSignupAdmin(admin),
    );

    expect(response.status).toBe(400);
    const payload = await parseResponsePayload(response);
    expect(payload.code).toBe("invalid_password");
    expect(JSON.stringify(payload)).not.toContain("shortpw");
    expect(admin.createUserCalls).toEqual([]);
  });

  it("returns invalid_full_name for an empty name", async () => {
    const admin = new FakeSignupAdmin();
    const response = await signup(
      signupRequest(validBody({ fullName: "  " })),
      {},
      toSignupAdmin(admin),
    );

    expect(response.status).toBe(400);
    const payload = await parseResponsePayload(response);
    expect(payload.code).toBe("invalid_full_name");
    expect(admin.createUserCalls).toEqual([]);
  });

  it("maps a duplicate email to 409 email_already_registered", async () => {
    const admin = new FakeSignupAdmin();
    admin.nextError = {
      message: "A user with this email address has already been registered",
      status: 422,
      code: "email_exists",
    };
    const response = await signup(signupRequest(validBody()), {}, toSignupAdmin(admin));

    expect(response.status).toBe(409);
    const payload = await parseResponsePayload(response);
    expect(payload.code).toBe("email_already_registered");
    expect(payload.detail).toBeTruthy();
    expect(admin.createUserCalls).toHaveLength(1);
    expect(admin.deleteUserCalls).toEqual([]);
  });

  it("maps Admin API failure to 500 signup_failed without leaking secrets", async () => {
    const admin = new FakeSignupAdmin();
    admin.nextError = {
      message: "service_role key super-secret-value failed upstream",
      status: 500,
      code: "unexpected_failure",
    };
    const response = await signup(signupRequest(validBody()), {}, toSignupAdmin(admin));

    expect(response.status).toBe(500);
    const payload = await parseResponsePayload(response);
    expect(payload.code).toBe("signup_failed");
    expect(payload.error).toBeTruthy();
    expect(payload.detail).toBeTruthy();
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain("super-secret-value");
    expect(serialized).not.toContain("service_role");
    expect(serialized).not.toContain("password1");
  });

  it("persists phone and signup extras on the profile upsert", async () => {
    const admin = new FakeSignupAdmin();
    const response = await signup(
      signupRequest(validBody({
        phone: "0400 000 000",
        company: "Analytical Engines",
        defaultLocation: "Adelaide SA",
        operatorLicenceNumber: "ReOC-1",
        serviceArea: "Greater Adelaide",
      })),
      {},
      toSignupAdmin(admin),
    );

    expect(response.status).toBe(201);
    expect(admin.upsertProfileCalls).toEqual([
      {
        id: "user-1",
        email: "ada@example.com",
        full_name: "Ada Lovelace",
        primary_role: "customer",
        phone_e164: "+61400000000",
        company: "Analytical Engines",
        default_location: "Adelaide SA",
        operator_licence_number: "ReOC-1",
        service_area: "Greater Adelaide",
      },
    ]);
    expect(admin.deleteUserCalls).toEqual([]);
  });

  it("stores a skipped phone as null", async () => {
    const admin = new FakeSignupAdmin();
    const response = await signup(
      signupRequest(validBody({ phone: "" })),
      {},
      toSignupAdmin(admin),
    );

    expect(response.status).toBe(201);
    expect(admin.upsertProfileCalls[0]?.phone_e164).toBeNull();
    expect(admin.deleteUserCalls).toEqual([]);
  });

  it("returns invalid_phone without calling createUser", async () => {
    const admin = new FakeSignupAdmin();
    const response = await signup(
      signupRequest(validBody({ phone: "08 1234 5678" })),
      {},
      toSignupAdmin(admin),
    );

    expect(response.status).toBe(400);
    const payload = await parseResponsePayload(response);
    expect(payload.code).toBe("invalid_phone");
    expect(admin.createUserCalls).toEqual([]);
    expect(admin.upsertProfileCalls).toEqual([]);
    expect(admin.deleteUserCalls).toEqual([]);
  });

  it("maps duplicate-phone unique violations to 409 and deletes the Auth user", async () => {
    const messages = [
      'duplicate key value violates unique constraint "profiles_phone_e164_key"',
      "duplicate key value violates unique constraint on column phone_e164",
    ];
    for (const message of messages) {
      const admin = new FakeSignupAdmin();
      admin.nextProfileError = { message, code: "23505" };
      const response = await signup(
        signupRequest(validBody({ phone: "0400 000 000" })),
        {},
        toSignupAdmin(admin),
      );
      expect(response.status).toBe(409);
      const payload = await parseResponsePayload(response);
      expect(payload.code).toBe("phone_already_registered");
      expect(admin.createUserCalls).toHaveLength(1);
      expect(admin.deleteUserCalls).toEqual(["user-1"]);
    }
  });

  it("does not treat a non-phone unique violation as phone_already_registered", async () => {
    const admin = new FakeSignupAdmin();
    admin.nextProfileError = {
      message: 'duplicate key value violates unique constraint "profiles_pkey"',
      code: "23505",
    };
    const response = await signup(
      signupRequest(validBody({ phone: "0400 000 000" })),
      {},
      toSignupAdmin(admin),
    );

    expect(response.status).toBe(500);
    const payload = await parseResponsePayload(response);
    expect(payload.code).toBe("signup_failed");
    expect(admin.deleteUserCalls).toEqual(["user-1"]);
  });
});
