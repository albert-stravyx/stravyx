import { describe, expect, it } from "vitest";
import {
  confirmOperatorCredential,
  createOperatorCredentialUploadUrl,
  listOperatorCredentials,
} from "../../supabase/functions/api/routes/operatorCredentials.ts";
import { CREDENTIALS_BUCKET } from "../../supabase/functions/api/routes/operatorCredentialsShared.ts";
import type { OperatorCredentialKind } from "@stravyx/types";
import { FakeAdminClient, makeCtx, seedReoc } from "./operatorCredentialsFake.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function parsePayload(response: Response): Promise<Record<string, unknown>> {
  const payload: unknown = await response.json();
  if (!isRecord(payload)) throw new Error("response_payload_not_object");
  return payload;
}

function uploadRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/operator/credentials/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function confirmRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/operator/credentials/id/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const KINDS: OperatorCredentialKind[] = [
  "reoc_certificate",
  "repl",
  "certificate_of_currency",
];

describe("operator credential routes", () => {
  it("rejects disallowed MIME types including image/jpg", async () => {
    const admin = new FakeAdminClient();
    seedReoc(admin);
    const ctx = makeCtx(admin, "operator", "operator-1");
    for (const contentType of ["image/jpg", "application/zip", "text/plain"]) {
      const response = await createOperatorCredentialUploadUrl(
        uploadRequest({
          kind: "reoc_certificate",
          filename: "doc.pdf",
          contentType,
        }),
        ctx,
      );
      expect(response.status).toBe(400);
      expect((await parsePayload(response)).code).toBe("media_type_not_allowed");
    }
    expect(admin.files.size).toBe(0);
  });

  it("returns 403 for customers before creating a credential row", async () => {
    const admin = new FakeAdminClient();
    seedReoc(admin);
    const response = await createOperatorCredentialUploadUrl(
      uploadRequest({
        kind: "reoc_certificate",
        filename: "doc.pdf",
        contentType: "application/pdf",
      }),
      makeCtx(admin, "customer", "customer-1"),
    );
    expect(response.status).toBe(403);
    expect((await parsePayload(response)).code).toBe("forbidden");
    expect(admin.files.size).toBe(0);
  });

  it("returns credentials_already_verified when the operator is already verified", async () => {
    const admin = new FakeAdminClient();
    seedReoc(admin, { verification_status: "verified", verified: true });
    const response = await createOperatorCredentialUploadUrl(
      uploadRequest({
        kind: "reoc_certificate",
        filename: "doc.pdf",
        contentType: "application/pdf",
      }),
      makeCtx(admin, "operator", "operator-1"),
    );
    expect(response.status).toBe(409);
    expect((await parsePayload(response)).code).toBe("credentials_already_verified");
    expect(admin.files.size).toBe(0);
  });

  it("rejects uploads while the operator is pending_review", async () => {
    const admin = new FakeAdminClient();
    seedReoc(admin, { verification_status: "pending_review", verified: false });
    const response = await createOperatorCredentialUploadUrl(
      uploadRequest({
        kind: "reoc_certificate",
        filename: "doc.pdf",
        contentType: "application/pdf",
      }),
      makeCtx(admin, "operator", "operator-1"),
    );
    expect(response.status).toBe(409);
    expect((await parsePayload(response)).code).toBe("credentials_pending_review");
    expect(admin.reocs.get("reoc-1")?.verification_status).toBe("pending_review");
    expect(admin.files.size).toBe(0);
  });

  it("rejects confirm while the operator is pending_review", async () => {
    const admin = new FakeAdminClient();
    seedReoc(admin, { verification_status: "pending_review", verified: false });
    const response = await confirmOperatorCredential(
      "file-1",
      confirmRequest({
        byteSize: 2048,
        originalName: "doc.pdf",
        contentType: "application/pdf",
      }),
      makeCtx(admin, "operator", "operator-1"),
    );
    expect(response.status).toBe(409);
    expect((await parsePayload(response)).code).toBe("credentials_pending_review");
    expect(admin.reocs.get("reoc-1")?.verification_status).toBe("pending_review");
  });

  it("confirms all three kinds and moves status to pending_review with verified false", async () => {
    const admin = new FakeAdminClient();
    seedReoc(admin);
    const ctx = makeCtx(admin, "operator", "operator-1");
    for (const kind of KINDS) {
      const upload = await createOperatorCredentialUploadUrl(
        uploadRequest({ kind, filename: `${kind}.pdf`, contentType: "application/pdf" }),
        ctx,
      );
      expect(upload.status).toBe(200);
      const uploaded = await parsePayload(upload);
      expect(typeof uploaded.id).toBe("string");
      expect(admin.buckets[admin.buckets.length - 1]).toBe(CREDENTIALS_BUCKET);
      const confirm = await confirmOperatorCredential(
        String(uploaded.id),
        confirmRequest({
          byteSize: 2048,
          originalName: `${kind}.pdf`,
          contentType: "application/pdf",
        }),
        ctx,
      );
      expect(confirm.status).toBe(200);
    }
    const reoc = admin.reocs.get("reoc-1");
    expect(reoc?.verification_status).toBe("pending_review");
    expect(reoc?.verified).toBe(false);
    expect([...admin.files.values()].every((file) => file.confirmed_at !== null)).toBe(true);
    expect([...admin.files.values()].every((file) => file.content_type === "application/pdf")).toBe(
      true,
    );
  });

  it("rejects confirm when storage reports a disallowed mimetype", async () => {
    const admin = new FakeAdminClient();
    seedReoc(admin);
    const ctx = makeCtx(admin, "operator", "operator-1");
    const upload = await createOperatorCredentialUploadUrl(
      uploadRequest({
        kind: "reoc_certificate",
        filename: "scan.jpeg",
        contentType: "image/jpeg",
      }),
      ctx,
    );
    expect(upload.status).toBe(200);
    const uploaded = await parsePayload(upload);
    const file = admin.files.get(String(uploaded.id));
    expect(file).toBeDefined();
    const stored = admin.storageObjects.get(file!.storage_path);
    expect(stored).toBeDefined();
    stored!.mimetype = "text/html";

    const confirm = await confirmOperatorCredential(
      String(uploaded.id),
      confirmRequest({
        byteSize: 2048,
        originalName: "scan.jpeg",
        contentType: "image/jpeg",
      }),
      ctx,
    );
    expect(confirm.status).toBe(400);
    expect((await parsePayload(confirm)).code).toBe("media_type_not_allowed");
    expect(admin.files.get(String(uploaded.id))?.confirmed_at).toBeNull();
    expect(admin.reocs.get("reoc-1")?.verification_status).toBe("pending_docs");
  });

  it("lists only the owner ReOC files and forbids another operator", async () => {
    const admin = new FakeAdminClient();
    seedReoc(admin);
    seedReoc(admin, {
      id: "reoc-2",
      owner_user_id: "operator-2",
      arn: "7654321",
      reoc_number: "CASA.ReOC.0002",
    });
    const ownerCtx = makeCtx(admin, "operator", "operator-1");
    const upload = await createOperatorCredentialUploadUrl(
      uploadRequest({
        kind: "repl",
        filename: "repl.png",
        contentType: "image/png",
      }),
      ownerCtx,
    );
    const uploaded = await parsePayload(upload);
    await confirmOperatorCredential(
      String(uploaded.id),
      confirmRequest({ byteSize: 2048, originalName: "repl.png", contentType: "image/png" }),
      ownerCtx,
    );

    const ownerList = await listOperatorCredentials(
      new Request("http://localhost/api/operator/credentials"),
      ownerCtx,
    );
    expect(ownerList.status).toBe(200);
    const ownerPayload = await parsePayload(ownerList);
    expect(ownerPayload.reocId).toBe("reoc-1");
    expect(Array.isArray(ownerPayload.files)).toBe(true);
    const files = ownerPayload.files as unknown[];
    expect(files).toHaveLength(1);

    const otherList = await listOperatorCredentials(
      new Request("http://localhost/api/operator/credentials"),
      makeCtx(admin, "operator", "operator-2"),
    );
    expect(otherList.status).toBe(200);
    const otherPayload = await parsePayload(otherList);
    expect(otherPayload.reocId).toBe("reoc-2");
    expect(otherPayload.files).toEqual([]);
  });

  it("moves rejected operators to pending_docs on upload and pending_review after three confirms without verifying", async () => {
    const admin = new FakeAdminClient();
    seedReoc(admin, {
      verification_status: "rejected",
      verified: false,
      rejection_reason: "Illegible scan",
    });
    const ctx = makeCtx(admin, "operator", "operator-1");
    const first = await createOperatorCredentialUploadUrl(
      uploadRequest({
        kind: "reoc_certificate",
        filename: "reoc.pdf",
        contentType: "application/pdf",
      }),
      ctx,
    );
    expect(first.status).toBe(200);
    expect(admin.reocs.get("reoc-1")?.verification_status).toBe("pending_docs");
    expect(admin.reocs.get("reoc-1")?.verified).toBe(false);

    for (const kind of KINDS) {
      const upload = await createOperatorCredentialUploadUrl(
        uploadRequest({ kind, filename: `${kind}.jpeg`, contentType: "image/jpeg" }),
        ctx,
      );
      const uploaded = await parsePayload(upload);
      await confirmOperatorCredential(
        String(uploaded.id),
        confirmRequest({
          byteSize: 2048,
          originalName: `${kind}.jpeg`,
          contentType: "image/jpeg",
        }),
        ctx,
      );
    }
    expect(admin.reocs.get("reoc-1")?.verification_status).toBe("pending_review");
    expect(admin.reocs.get("reoc-1")?.verified).toBe(false);
  });
});
