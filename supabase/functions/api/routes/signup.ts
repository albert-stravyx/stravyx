import { json } from "../http.ts";
import { parseAuMobile } from "../phone.ts";
import { parseArn, parseReoc } from "../casaCredentials.ts";

export type SignupRole = "customer" | "operator";

export interface SignupCreateUserAttributes {
  email: string;
  password: string;
  email_confirm: boolean;
  user_metadata: { full_name: string };
  app_metadata: { role: SignupRole };
}

export interface SignupAdminError {
  message: string;
  status?: number;
  code?: string;
  details?: string;
}

export interface SignupAdminUser {
  id: string;
  email?: string;
}

export interface SignupProfileRow {
  id: string;
  email: string;
  full_name: string;
  primary_role: SignupRole;
  phone_e164: string | null;
  company: string | null;
  default_location: string | null;
  operator_licence_number: string | null;
  service_area: string | null;
}

export interface SignupOrganizationRow {
  name: string;
}

export interface SignupReocProfileRow {
  owner_user_id: string;
  organization_id: string;
  arn: string;
  reoc_number: string;
  verified: false;
  online: false;
  verification_status: "pending_docs";
}

export interface SignupAdmin {
  auth: {
    admin: {
      createUser: (
        attributes: SignupCreateUserAttributes,
      ) => Promise<{
        data: { user: SignupAdminUser | null };
        error: SignupAdminError | null;
      }>;
      /**
       * Compensating delete after a failed profile write so a retry is not
       * stuck on email_already_registered with a customer-default profile.
       */
      deleteUser: (
        id: string,
      ) => Promise<{
        data: { user: SignupAdminUser | null };
        error: SignupAdminError | null;
      }>;
    };
  };
  /**
   * GoTrue applies `app_metadata` on a follow-up UPDATE of `auth.users`, so the
   * AFTER INSERT `handle_new_user` trigger often inserts `primary_role = customer`.
   * Signup must write the intended role onto `profiles` after createUser returns.
   */
  upsertProfile: (
    row: SignupProfileRow,
  ) => Promise<{ error: SignupAdminError | null }>;
  insertOrganization: (
    row: SignupOrganizationRow,
  ) => Promise<{ data: { id: string } | null; error: SignupAdminError | null }>;
  insertReocProfile: (
    row: SignupReocProfileRow,
  ) => Promise<{ error: SignupAdminError | null }>;
}

export type SignupParseErrorCode =
  | "invalid_json"
  | "invalid_body"
  | "invalid_email"
  | "invalid_password"
  | "invalid_full_name"
  | "invalid_role"
  | "invalid_phone"
  | "invalid_arn"
  | "invalid_reoc";

export type ParsedSignupBody = {
  email: string;
  password: string;
  fullName: string;
  role: SignupRole;
  phoneE164: string | null;
  company: string | null;
  defaultLocation: string | null;
  operatorLicenceNumber: string | null;
  serviceArea: string | null;
  arn: string | null;
  reocNumber: string | null;
};

export type ParseSignupBodyResult =
  | {
    ok: true;
    value: ParsedSignupBody;
  }
  | {
    ok: false;
    code: SignupParseErrorCode;
    error: string;
    detail: string;
  };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function optionalTrimmedText(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseSignupRole(value: unknown): SignupRole | null {
  if (value === "customer" || value === "operator") return value;
  return null;
}

function parseOperatorCredentials(
  value: Record<string, unknown>,
):
  | { ok: true; arn: string; reocNumber: string }
  | { ok: false; code: "invalid_arn" | "invalid_reoc"; error: string; detail: string } {
  const arnParsed = parseArn(value.arn);
  if (!arnParsed.ok) {
    return {
      ok: false,
      code: "invalid_arn",
      error: "Invalid ARN",
      detail: "ARN must be 6 or 7 digits",
    };
  }
  const reocParsed = parseReoc(value.reocNumber);
  if (!reocParsed.ok) {
    return {
      ok: false,
      code: "invalid_reoc",
      error: "Invalid ReOC",
      detail: "ReOC must match CASA.ReOC. followed by four digits",
    };
  }
  return { ok: true, arn: arnParsed.arn, reocNumber: reocParsed.reocNumber };
}

export function parseSignupBody(value: unknown): ParseSignupBodyResult {
  if (!isRecord(value)) {
    return {
      ok: false,
      code: "invalid_json",
      error: "Invalid request body",
      detail: "Expected a JSON object",
    };
  }

  const email = value.email;
  const password = value.password;
  const fullName = value.fullName;

  if (typeof email !== "string" || typeof password !== "string" || typeof fullName !== "string") {
    return {
      ok: false,
      code: "invalid_body",
      error: "Invalid request body",
      detail: "email, password and fullName must be strings",
    };
  }

  const trimmedEmail = email.trim();
  if (!trimmedEmail || !trimmedEmail.includes("@")) {
    return {
      ok: false,
      code: "invalid_email",
      error: "Invalid email",
      detail: "Enter a valid email address",
    };
  }

  if (password.length < 8) {
    return {
      ok: false,
      code: "invalid_password",
      error: "Invalid password",
      detail: "Password must be at least 8 characters",
    };
  }

  const trimmedName = fullName.trim();
  if (!trimmedName) {
    return {
      ok: false,
      code: "invalid_full_name",
      error: "Invalid name",
      detail: "Enter your full name",
    };
  }

  const role = parseSignupRole(value.role);
  if (!role) {
    return {
      ok: false,
      code: "invalid_role",
      error: "Invalid role",
      detail: "Role must be customer or operator",
    };
  }

  const phoneParsed = parseAuMobile(value.phone);
  if (!phoneParsed.ok) {
    return {
      ok: false,
      code: "invalid_phone",
      error: "Invalid phone",
      detail: "Enter a valid Australian mobile number",
    };
  }

  const company = optionalTrimmedText(value.company);
  const defaultLocation = optionalTrimmedText(value.defaultLocation);
  const operatorLicenceNumber = optionalTrimmedText(value.operatorLicenceNumber);
  const serviceArea = optionalTrimmedText(value.serviceArea);
  if (
    company === undefined ||
    defaultLocation === undefined ||
    operatorLicenceNumber === undefined ||
    serviceArea === undefined
  ) {
    return {
      ok: false,
      code: "invalid_body",
      error: "Invalid request body",
      detail: "Optional profile fields must be strings when present",
    };
  }

  let arn: string | null = null;
  let reocNumber: string | null = null;
  if (role === "operator") {
    const credentials = parseOperatorCredentials(value);
    if (!credentials.ok) {
      return {
        ok: false,
        code: credentials.code,
        error: credentials.error,
        detail: credentials.detail,
      };
    }
    arn = credentials.arn;
    reocNumber = credentials.reocNumber;
  }

  return {
    ok: true,
    value: {
      email: trimmedEmail,
      password,
      fullName: trimmedName,
      role,
      phoneE164: phoneParsed.e164,
      company,
      defaultLocation,
      operatorLicenceNumber,
      serviceArea,
      arn,
      reocNumber,
    },
  };
}

function isDuplicateEmailError(error: SignupAdminError): boolean {
  if (error.code === "email_exists" || error.code === "user_already_exists") {
    return true;
  }
  const message = error.message.toLowerCase();
  return message.includes("already been registered") || message.includes("already registered");
}

function isDuplicatePhoneError(error: SignupAdminError): boolean {
  if (error.code !== "23505") return false;
  const parts = [error.message];
  if (error.details) parts.push(error.details);
  const haystack = parts.join(" ").toLowerCase();
  return haystack.includes("profiles_phone_e164_key") || haystack.includes("phone_e164");
}

function signupFailedResponse(cors: Record<string, string>): Response {
  return json({
    error: "Signup failed",
    code: "signup_failed",
    detail: "Unable to complete signup. Try again.",
  }, 500, cors);
}

async function compensateCreatedUser(
  admin: SignupAdmin,
  userId: string,
): Promise<void> {
  try {
    const deleted = await admin.auth.admin.deleteUser(userId);
    if (deleted.error) {
      console.error("[signup]", "compensate_delete_user_failed", {
        code: deleted.error.code ?? "unknown",
        status: deleted.error.status ?? null,
      });
    }
  } catch (cause) {
    console.error("[signup]", "compensate_delete_user_threw", cause);
  }
}

function organizationName(fullName: string, email: string): string {
  const trimmed = fullName.trim();
  if (trimmed.length > 0) return trimmed;
  return `Operator ${email}`;
}

export async function signup(
  req: Request,
  cors: Record<string, string>,
  admin: SignupAdmin,
): Promise<Response> {
  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch (cause) {
    console.error("[signup]", "invalid_json", {
      kind: cause instanceof Error ? cause.name : typeof cause,
    });
    return json({
      error: "Invalid request body",
      code: "invalid_json",
      detail: "Request body must be valid JSON",
    }, 400, cors);
  }

  const body = parseSignupBody(parsed);
  if (!body.ok) {
    return json({
      error: body.error,
      code: body.code,
      detail: body.detail,
    }, 400, cors);
  }

  const {
    email,
    password,
    fullName,
    role,
    phoneE164,
    company,
    defaultLocation,
    operatorLicenceNumber,
    serviceArea,
    arn,
    reocNumber,
  } = body.value;

  let result: {
    data: { user: SignupAdminUser | null };
    error: SignupAdminError | null;
  };
  try {
    result = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
      app_metadata: { role },
    });
  } catch (cause) {
    console.error("[signup]", "create_user_threw", cause);
    return signupFailedResponse(cors);
  }

  if (result.error) {
    if (isDuplicateEmailError(result.error)) {
      return json({
        error: "Email already registered",
        code: "email_already_registered",
        detail: "An account with this email already exists",
      }, 409, cors);
    }
    console.error("[signup]", "create_user_failed", {
      code: result.error.code ?? "unknown",
      status: result.error.status ?? null,
    });
    return signupFailedResponse(cors);
  }

  const user = result.data.user;
  if (!user) {
    console.error("[signup]", "create_user_empty");
    return signupFailedResponse(cors);
  }

  let profileResult: { error: SignupAdminError | null };
  try {
    profileResult = await admin.upsertProfile({
      id: user.id,
      email: user.email ?? email,
      full_name: fullName,
      primary_role: role,
      phone_e164: phoneE164,
      company,
      default_location: defaultLocation,
      operator_licence_number: role === "operator" ? null : operatorLicenceNumber,
      service_area: serviceArea,
    });
  } catch (cause) {
    console.error("[signup]", "profile_role_upsert_threw", {
      kind: cause instanceof Error ? cause.name : typeof cause,
    });
    await compensateCreatedUser(admin, user.id);
    return signupFailedResponse(cors);
  }
  if (profileResult.error) {
    console.error("[signup]", "profile_role_upsert_failed", {
      code: profileResult.error.code ?? "unknown",
      status: profileResult.error.status ?? null,
    });
    await compensateCreatedUser(admin, user.id);
    if (isDuplicatePhoneError(profileResult.error)) {
      return json({
        error: "Phone already registered",
        code: "phone_already_registered",
        detail: "An account with this phone number already exists",
      }, 409, cors);
    }
    return signupFailedResponse(cors);
  }

  if (role === "operator") {
    if (!arn || !reocNumber) {
      await compensateCreatedUser(admin, user.id);
      return json({
        error: "Invalid ARN",
        code: "invalid_arn",
        detail: "ARN and ReOC are required for operators",
      }, 400, cors);
    }

    let orgResult: { data: { id: string } | null; error: SignupAdminError | null };
    try {
      orgResult = await admin.insertOrganization({
        name: organizationName(fullName, user.email ?? email),
      });
    } catch (cause) {
      console.error("[signup]", "organization_insert_threw", {
        kind: cause instanceof Error ? cause.name : typeof cause,
      });
      await compensateCreatedUser(admin, user.id);
      return signupFailedResponse(cors);
    }
    if (orgResult.error || !orgResult.data) {
      console.error("[signup]", "organization_insert_failed", {
        code: orgResult.error?.code ?? "unknown",
        status: orgResult.error?.status ?? null,
      });
      await compensateCreatedUser(admin, user.id);
      return signupFailedResponse(cors);
    }

    let reocResult: { error: SignupAdminError | null };
    try {
      reocResult = await admin.insertReocProfile({
        owner_user_id: user.id,
        organization_id: orgResult.data.id,
        arn,
        reoc_number: reocNumber,
        verified: false,
        online: false,
        verification_status: "pending_docs",
      });
    } catch (cause) {
      console.error("[signup]", "reoc_insert_threw", {
        kind: cause instanceof Error ? cause.name : typeof cause,
      });
      await compensateCreatedUser(admin, user.id);
      return signupFailedResponse(cors);
    }
    if (reocResult.error) {
      console.error("[signup]", "reoc_insert_failed", {
        code: reocResult.error.code ?? "unknown",
        status: reocResult.error.status ?? null,
      });
      await compensateCreatedUser(admin, user.id);
      return signupFailedResponse(cors);
    }

    console.info("[signup]", "operator_signup_pending_created", {
      userId: user.id,
      organizationId: orgResult.data.id,
    });
  }

  return json({
    userId: user.id,
    email: user.email ?? email,
    role,
  }, 201, cors);
}
