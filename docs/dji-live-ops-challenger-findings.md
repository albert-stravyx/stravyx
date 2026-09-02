# Independent review of how Stravyx connects drones — findings and fixes

> **Audience:** founders, operators, and anyone who should understand the review without industry jargon.  
> **Date:** 2026-08-16  
> **HTML:** [`stravyx-dji-live-ops-challenger-findings.html`](./stravyx-dji-live-ops-challenger-findings.html) · **PDF:** [`stravyx-dji-live-ops-challenger-findings.pdf`](./stravyx-dji-live-ops-challenger-findings.pdf) · Pack: [`stravyx-live-ops-briefings.html`](./stravyx-live-ops-briefings.html)  
> **Regenerate PDF:** `python3 scripts/generate_dji_live_ops_challenger_findings_pdf.py`  
> **Reviewer:** architecture-challenger (independent of the original architect).  
> **Verdict:** **Support with conditions.** The recommended path is still right. Several safety and honesty gaps must close before live drone links or automatic photo upload go to production.  
> **Does not change:** Cloud API + manual; FlightHub 2 still later; no NestJS/MQTT code until Phase 1B + privacy approval.  
> **Authority:** [dji-integration-architecture.md](./dji-integration-architecture.md) · [ADR 0005](./adr/0005-flight-provider-cloud-api-only.md) · [dji-live-ops-path-comparison.md](./dji-live-ops-path-comparison.md) (glossary)

If a word is new, use the glossary in the [path comparison](./dji-live-ops-path-comparison.md). Short reminders used below:

| Term | Plain meaning |
|------|----------------|
| **ReOC** | The licensed drone company (Alex’s business). |
| **Workspace** | The “company room” a remote controller logs into. |
| **Gateway** | The remote controller (or dock) that talks to the internet. |
| **STS** | A short-lived upload key so photos go into our storage without our permanent password. |
| **Quarantine / Release** | Photos land as “held”; the operator confirms they belong to this job; then the customer can download. |
| **Manual path** | No live drone link: tap status and upload files by hand. |
| **SoT** | System of record — the official answer. For bookings and files: Stravyx. |

---

## What this review was for

An independent reviewer tried to **break** the plan: “drones report to Stravyx (Cloud API); everyone else uses manual upload.”

They were not asked to agree. They were asked: where could two companies see each other’s jobs? Where could photos land on the wrong booking? Where are we promising something the spare tyre cannot actually do?

**Bottom line:** keep the plan. Tighten ten points before we turn on live ingest.

---

## How to read each finding

Every item has:

1. **Picture** — a shop-floor analogy.  
2. **Problem** — what can go wrong.  
3. **Recommended fix** — the one we would do if forced to pick.  
4. **Two alternatives** — when they are better or worse.  
5. **Who decides** — engineering can proceed, or a human must choose.

Severity:

- **BLOCKER** — do not turn on live MQTT / auto-upload until this is designed.  
- **HIGH** — can ship a smaller slice, but must not reach customers in a half-done form.  
- **MEDIUM** — shape the design now so we do not paint ourselves into a corner.

---

## A-01 — Keep each drone company’s room private (BLOCKER)

**Picture.** Two licensed operators, Alex and Brooke, both use Stravyx. Each remote controller must only see *its* company’s drones and jobs — like two hotels that must not share room keys.

**Problem.** The plan says: give each controller its own private radio channel (MQTT access lists). That is necessary, but not enough. Login, “list my devices,” and “give me an upload key” are ordinary web requests. Those were described as if everyone lives in **one** big Stravyx room. A valid controller login could, in a sloppy design, list another company’s aircraft or ask for an upload key into the wrong cupboard.

**Recommended fix (slice S2 — bind, after privacy).** Give **each ReOC its own logical Cloud API workspace**. The server decides which room you are in from the login token — never from a company ID the app typed in the URL. The same rule applies to upload keys, photo callbacks, and radio topics. Moving a drone between companies is a deliberate, audited handover, not a silent re-pair.

**Alternative 1 — one shared DJI room, Stravyx filters every query.** Use if DJI licensing will not allow many workspaces. Worse: one missed filter leaks across the marketplace.

**Alternative 2 — a completely separate server per large customer.** Use only for a handful of tightly regulated tenants. Worse: cost and ops explode at marketplace scale.

**Who decides:** **Yes.** Per-company rooms vs accept shared-room risk.

---

## A-02 — The handset that asks for the upload key must own the aircraft (BLOCKER)

**Picture.** Alex books a roof job and assigns *aircraft SN-123*. Photos should go only to that job. The **remote controller** (the gateway) is what actually asks Stravyx for a short-lived upload key. Controllers can be re-paired to a different drone. If we only check “is SN-123 assigned to this job?” we might hand the key to a controller that is no longer flying that aircraft.

**Problem.** Binding the **aircraft** to the job at “allocated” does not prove that **this** controller currently controls that aircraft. A stale pairing or a replayed request could mint job-scoped keys for the wrong device.

**Recommended fix (between S2 bind and S3 auto-media).** Introduce a short-lived **capture session**: this company + this controller + this aircraft + this job, with a freshness check that the controller still sees that aircraft. Upload keys may only write into a folder named after that session (`capture-sessions/{id}/raw/`). The “upload finished” report must carry the same session id.

**Alternative 1 — no session table; challenge the controller at every key request.** Lighter for a tiny pilot. Worse for reconnects and proving which flight a file belongs to.

**Alternative 2 — session on the dock only (ignore aircraft swaps).** Fine for a dock that almost never changes aircraft. Worse for Pilot 2 handsets that swap drones.

**Who decides:** **Yes.** Approve the session model and how “fresh” topology must be.

---

## A-03 — Manual upload is a spare tyre, not a second sports car (HIGH)

**Picture.** If the live radio is down, Alex can still finish the job: tap Ready → Airborne → Complete and upload photos. The customer still gets files. They will **not** get a live map pin of the aircraft.

**Problem.** The written rule said *every* customer-visible outcome must work on the manual path. Live tracking is customer-visible and **cannot** be done by status taps alone. That over-promise will fail the first time we test it.

**Recommended fix (slice S1).** Narrow the promise: manual always delivers **booking, accept, progress labels, and raw photos**. Live map is optional and labelled (`live` / `manual status` / `unavailable`). Never let “is the drone online?” change who wins the job or the price.

**Alternative 1 — phone GPS as a vendor-neutral map pin.** Use if commercial live-map parity is required. Worse: privacy, battery, and a mobile app we have not approved.

**Alternative 2 — borrow FlightHub tracking for DJI-only fleets.** Helps operators who already live in FlightHub. Worse: excludes non-DJI operators and adds a second cloud.

**Who decides:** **Yes.** Live-ops A promises **live-map parity**, or only **completion and delivery** parity?

---

## A-04 — “Allocated” is planning, not “this flight is live” (HIGH)

**Picture.** On Monday Alex assigns a particular aircraft to Thursday’s roof job (planning). On Tuesday he still needs that aircraft for a different site. If “assigned to Thursday” means “locked as the live flight forever,” Tuesday’s job cannot use the aircraft, and Thursday’s stale lock is a safety bug if someone else is actually flying.

**Problem.** The data model uses **allocated** to mean “we picked a pilot/dock.” The architecture also used it as the **active flight lock**. Those are different jobs.

**Recommended fix (S2).** Keep **planned assignment** (this aircraft is pencilled on this job). Use the **capture session** (A-02) as the only lock that authorises live upload and live tracking.

**Alternative 1 — bind the aircraft only minutes before take-off.** Simple for walk-up jobs. Worse for spotting equipment clashes days ahead.

**Alternative 2 — one table with “planned” vs “active” flags.** Fewer tables. Worse: planning and security stay tangled.

**Who decides:** **Yes.** Must we support several **future** scheduled missions on the same aircraft?

---

## A-05 — Winning the job must be all-or-nothing (HIGH)

**Picture.** First-to-accept is a race: two operators tap Accept. The database must record **one** winner, update the job, and write the history **together**. If the computer dies mid-way, we must not end up with “Alex won the offer” but “the job still has no operator.”

**Problem.** Today those updates are separate steps in the demo API. A crash can leave a half-written story. A unique index stops *two accepted offers*, but not a broken half-record.

**Recommended fix (before we trust this for bind/upload).** One database function per command (`accept`, `change status`, `release photos`) that checks “we expected this state,” writes everything in one transaction, and ignores a retry with the same idempotency key.

**Alternative 1 — wait until NestJS and do transactions there.** Fine after cutover. Worse: the Edge demo stays inconsistent until then.

**Alternative 2 — nightly cleanup jobs that stitch broken rows.** Unacceptable for first-to-accept: two operators must never both believe they won, even briefly.

**Who decides:** **No.** This follows existing marketplace rules.

---

## A-06 — One way to name a file in storage (HIGH)

**Picture.** A photo needs a stable address: which cupboard, which shelf, which version, which checksum. If slice S0 (manual upload) uses one naming scheme and slice S3 (drone auto-upload) uses another, we will migrate or lose files, and the customer download link will disagree with the operator’s copy.

**Problem.** The demo column is `storage_path`. The long-term model mentions `s3_key`. The architecture proposes `provider + object_key`. Three names for one idea.

**Recommended fix (S0).** Store a **provider-neutral** address: provider, bucket, object key, version, region, sha256. Manual upload can still use today’s storage. Drone auto-upload later adds an Amazon S3 / MinIO adapter **without** changing the API the apps see. Download links are always minted by our server.

**Alternative 1 — start on Australian S3 from S0.** Avoids a later move if AWS is already approved. Worse: new infrastructure before Phase 1B.

**Alternative 2 — stay on current storage, then bulk-move everything before auto-upload.** Smallest S0. Worse: a mandatory, verifiable migration.

**Who decides:** **Yes.** Which storage provider, and do we migrate or start on the final cupboard?

---

## A-07 — “Upload finished” texts can get lost (HIGH)

**Picture.** The drone uploads a photo, then sends a postcard: “I put file 47 in the cupboard.” If we only listen for postcards, a lost postcard means the file sits in the cupboard forever and the job looks empty. Ignoring a *duplicate* postcard (idempotency) does not find a *missing* one.

**Recommended fix (S3).** Keep a durable inbox of postcards; identify each object by bucket **and** version (so overwrites cannot silently swap a file); periodically **walk the session folder** and create held (quarantine) records for objects that belong, after hash checks. Closing a session includes “we expected these files.”

**Alternative 1 — a button: “rescan this flight.”** Fine for a tiny pilot. Worse: someone has to notice the gap.

**Alternative 2 — the cupboard itself notifies us when an object appears (storage events), postcards are extra.** Stronger delivery. Worse: more cloud coupling.

**Who decides:** **No.** Use inbox + folder scan.

---

## A-08 — “Held for the operator” is not the same as “safe to open” (HIGH)

**Picture.** Quarantine today means: the customer cannot download yet. It does **not** mean we checked that the file is a real photo, not a renamed virus, not a huge junk blob.

**Problem.** Manual upload is untrusted (anyone with an operator login). Device upload is also untrusted. Signing a download link to a “held” file can still harm the customer’s computer.

**Recommended fix (S0, before customers download).** Land files in a private, non-executable area. Enforce size limits, allowed types, and “does the file really start like a JPEG/MP4?” Compute a hash. Scan for malware **before** Release. Previews are generated in isolation. Keep a retention / legal-hold rule for disputes.

**Alternative 1 — only allow DJI camera JPEG/MP4.** Tighter for a DJI-only pilot. Worse: non-DJI and odd formats lose parity; “DJI made it” is not proof of safety.

**Alternative 2 — never give originals; only give our converted copies.** Safest in a browser. Worse: customers who need the original evidence file.

**Who decides:** **Yes.** Allowed formats, size limits, scanner, how long we keep files.

---

## A-09 — Do not force “manual upload” to pretend it is a live drone (MEDIUM)

**Picture.** A live DJI controller can report “I am online,” stream positions, and upload automatically. A manual operator can only tap status and attach files. If we invent one giant “flight provider” plug that *must* do all of those, the manual plug will return fake “success” or empty topology — and callers will not know what is real.

**Recommended fix (S1 design).** Split the plugs: **status reporter**, **file ingress**, **device connector**, **live position source**. Manual implements the first two. DJI implements all four. The app asks “what can you do?” instead of assuming everything.

**Alternative 1 — one plug with capability flags and a clear “not supported” error.** Smaller registry. Worse: callers still depend on a wide interface.

**Alternative 2 — two completely separate services (manual vs DJI) with no shared types.** Fastest first code. Worse: “job complete” and “file arrived” can drift apart.

**Who decides:** **Yes.** Changing this contract needs Program Design (it is named in ADR 0005).

---

## A-10 — We have not yet proved the bill (MEDIUM)

**Picture.** We deferred FlightHub 2 because per-device seats looked expensive and Cloud API covers raw photos. We have **not** written down: what it costs *us* to run a highly available radio broker, storage, and night-time support at 1, 100, and 1,000 devices — versus a current FlightHub Business quote.

**Problem.** The commercial comparison is not yet decision-grade. Direction can stay; a large infrastructure spend should not.

**Recommended fix (before paid S2 servers).** Three workload models (pilot / 100 / 1,000 devices) comparing: our Cloud API operating cost; FlightHub Business (verified quote and quotas); manual-only baseline. Keep “operators already live in FlightHub” as a **friction** score, not a dollar line. Keep FlightHub deferred unless the numbers change Live-ops A.

**Alternative 1 — run one real ReOC on Cloud API and measure.** Honest when assumptions are weak. Worse: spend before the model exists.

**Alternative 2 — paid make-vs-buy with vendor quotes.** Better before a large enterprise bet. Worse: slower, sales-shaped numbers.

**Who decides:** **Yes.** What cost/risk threshold lets us go past a pilot?

---

## In what order

| When | Close these |
|------|-------------|
| Before customers download real files (S0) | A-05 all-or-nothing job commands; A-06 one file address; A-08 safe-to-open checks |
| While designing S1 | A-03 honest spare-tyre promise; A-09 split plugs |
| Before live bind (S2) | Privacy (APP 8) and existing gates; A-01 private rooms; A-04 planning vs live lock; A-05; a pilot cost check (A-10) |
| Before automatic photo upload (S3) | A-02 capture session + upload keys; S3 storage adapter (A-06); A-07 lost-postcard scan; A-08 on device files too |
| Later | Phone map pins; scale tuning; FlightHub for maps/3D |

Existing gates still apply: release state machine, APP 8 / DPIA, capture-session attribution, per-controller radio passwords, and “no money/address leaks” tests. This review **adds** the ten items above; it does not replace those.

---

## What we will not do

- Trust a company id typed in a URL.  
- Hand out upload keys from “whatever was last paired.”  
- Treat “upload finished” postcards as the only proof a file exists.  
- Let customers download held files before type/malware checks.  
- Make the manual path invent fake live-drone data.  
- Rank who gets the job by “whose drone is online.”  
- Start NestJS, MQTT, or FlightHub before the existing Phase 1B and privacy gates.  
- Change the recommendation: drones still report to **Stravyx**; **manual** remains the spare tyre.

---

## Human decisions still open

1. Per-ReOC Cloud API rooms vs one shared room with filtering (A-01).  
2. Capture-session rules and how fresh pairing must be (A-02).  
3. Live-ops A: live map promised, or only completion + files (A-03).  
4. Whether aircraft planning must support several future jobs (A-04).  
5. Storage provider and whether we migrate (A-06).  
6. File types, size limits, scanner, retention (A-08).  
7. Split flight-provider contracts (A-09 / Program Design).  
8. Cost threshold past a Cloud API pilot (A-10).
