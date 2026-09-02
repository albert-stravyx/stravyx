import { describe, expect, it } from "vitest";
import { parseSignupBody, signup, type SignupAdmin, type SignupProfileRow } from "../../supabase/functions/api/routes/signup.ts";

interface CreateUserAttributes {
  email: string;
  password: string;
  email_confirm: boolean;
  user_metadata: Record<string, unknown>;
  app_metadata: Record<string, unknown>;
}

interface AdminError { message: string; status?: number; code?: string; }
interface CreatedUser { id: string; email?: string; }

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
  nextOrgError: AdminError | null = null;
  nextReocError: AdminError | null = null;
  nextUser: CreatedUser | null = { id: "user-op", email: "op@example.com" };
  nextOrgId = "org-1";

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
        return Promise.resolve({ data: { user: null }, error: null });
      },
    },
  };

  upsertProfile = (row: SignupProfileRow) => {
    this.upsertProfileCalls.push(row);
    return Promise.resolve({ error: null });
  };

  insertOrganization = (row: { name: string }) => {
    this.insertOrganizationCalls.push(row);
    if (this.nextOrgError) {
      return Promise.resolve({ data: null, error: this.nextOrgError });
    }
    return Promise.resolve({ data: { id: this.nextOrgId }, error: null });
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
    return Promise.resolve({ error: this.nextReocError });
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toSignupAdmin(admin: FakeSignupAdmin): SignupAdmin {
  return admin;
}

async function parseResponsePayload(response: Response): Promise<Record<string, unknown>> {
  const payload: unknown = await response.json();
  if (!isRecord(payload)) throw new Error("response_payload_not_object");
  return payload;
}

function signupRequest(body: unknown): Request {
  return new Request("http://localhost/api/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function validOperatorBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    email: "op@example.com",
    password: "password1",
    fullName: "Ada Lovelace",
    role: "operator",
    arn: "123456",
    reocNumber: "CASA.ReOC.0001",
    ...overrides,
  };
}

describe("parseSignupBody operator credentials", () => {
  it("requires ARN and ReOC for operators and ignores them for customers", () => {
    const operator = parseSignupBody(validOperatorBody({ arn: " 7654321 ", reocNumber: "casa.reoc.0042" }));
    expect(operator.ok).toBe(true);
    if (!operator.ok) return;
    expect(operator.value.arn).toBe("7654321");
    expect(operator.value.reocNumber).toBe("CASA.ReOC.0042");

    const customer = parseSignupBody({
      email: "ada@example.com",
      password: "password1",
      fullName: "Ada Lovelace",
      role: "customer",
      arn: "not-an-arn",
      reocNumber: "nope",
    });
    expect(customer.ok).toBe(true);
    if (!customer.ok) return;
    expect(customer.value.arn).toBeNull();
    expect(customer.value.reocNumber).toBeNull();
  });

  it("rejects missing operator credentials as invalid_arn", () => {
    const missing = parseSignupBody({
      email: "op@example.com",
      password: "password1",
      fullName: "Ada Lovelace",
      role: "operator",
    });
    expect(missing.ok).toBe(false);
    if (missing.ok) return;
    expect(missing.code).toBe("invalid_arn");
  });
});

describe("signup operator ReOC creation", () => {
  it("creates an unverified ReOC with verified=false and online=false", async () => {
    const admin = new FakeSignupAdmin();
    const response = await signup(
      signupRequest(validOperatorBody()),
      {},
      toSignupAdmin(admin),
    );

    expect(response.status).toBe(201);
    const payload = await parseResponsePayload(response);
    expect(payload).toEqual({
      userId: "user-op",
      email: "op@example.com",
      role: "operator",
    });
    expect(admin.createUserCalls[0]?.app_metadata).toEqual({ role: "operator" });
    expect(admin.upsertProfileCalls[0]?.operator_licence_number).toBeNull();
    expect(admin.insertOrganizationCalls).toEqual([{ name: "Ada Lovelace" }]);
    expect(admin.insertReocProfileCalls).toEqual([
      {
        owner_user_id: "user-op",
        organization_id: "org-1",
        arn: "123456",
        reoc_number: "CASA.ReOC.0001",
        verified: false,
        online: false,
        verification_status: "pending_docs",
      },
    ]);
    expect(admin.deleteUserCalls).toEqual([]);
  });

  it("rejects invented ARN or ReOC before createUser", async () => {
    const inventedArn = new FakeSignupAdmin();
    const arnResponse = await signup(
      signupRequest(validOperatorBody({ arn: "12-345", reocNumber: "CASA.ReOC.0001" })),
      {},
      toSignupAdmin(inventedArn),
    );
    expect(arnResponse.status).toBe(400);
    expect((await parseResponsePayload(arnResponse)).code).toBe("invalid_arn");
    expect(inventedArn.createUserCalls).toEqual([]);
    expect(inventedArn.insertReocProfileCalls).toEqual([]);

    const inventedReoc = new FakeSignupAdmin();
    const reocResponse = await signup(
      signupRequest(validOperatorBody({ arn: "123456", reocNumber: "CASA-ReOC-0001" })),
      {},
      toSignupAdmin(inventedReoc),
    );
    expect(reocResponse.status).toBe(400);
    expect((await parseResponsePayload(reocResponse)).code).toBe("invalid_reoc");
    expect(inventedReoc.createUserCalls).toEqual([]);
  });

  it("rejects operator skip {} / missing credentials without creating an Auth user", async () => {
    const admin = new FakeSignupAdmin();
    const response = await signup(
      signupRequest({
        email: "op@example.com",
        password: "password1",
        fullName: "Ada Lovelace",
        role: "operator",
      }),
      {},
      toSignupAdmin(admin),
    );
    expect(response.status).toBe(400);
    const payload = await parseResponsePayload(response);
    expect(payload.code).toBe("invalid_arn");
    expect(payload.error).toBeTruthy();
    expect(payload.detail).toBeTruthy();
    expect(admin.createUserCalls).toEqual([]);
    expect(admin.upsertProfileCalls).toEqual([]);
    expect(admin.deleteUserCalls).toEqual([]);
  });

  it("deletes the Auth user when organization insert fails", async () => {
    const admin = new FakeSignupAdmin();
    admin.nextOrgError = { message: "org insert failed", code: "org_failed" };
    const response = await signup(
      signupRequest(validOperatorBody()),
      {},
      toSignupAdmin(admin),
    );
    expect(response.status).toBe(500);
    expect((await parseResponsePayload(response)).code).toBe("signup_failed");
    expect(admin.createUserCalls).toHaveLength(1);
    expect(admin.insertOrganizationCalls).toHaveLength(1);
    expect(admin.insertReocProfileCalls).toEqual([]);
    expect(admin.deleteUserCalls).toEqual(["user-op"]);
  });

  it("deletes the Auth user when reoc insert fails", async () => {
    const admin = new FakeSignupAdmin();
    admin.nextReocError = { message: "reoc insert failed", code: "reoc_failed" };
    const response = await signup(
      signupRequest(validOperatorBody()),
      {},
      toSignupAdmin(admin),
    );
    expect(response.status).toBe(500);
    expect((await parseResponsePayload(response)).code).toBe("signup_failed");
    expect(admin.insertReocProfileCalls).toHaveLength(1);
    expect(admin.deleteUserCalls).toEqual(["user-op"]);
  });
});
