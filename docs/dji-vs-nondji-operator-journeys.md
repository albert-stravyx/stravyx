# How DJI and non-DJI operators complete a Stravyx job

> **Audience:** founders, operators, product, anyone who should see that aircraft brand does not change the shop.  
> **Date:** 2026-08-17  
> **HTML:** [`stravyx-dji-vs-nondji-operator-journeys.html`](./stravyx-dji-vs-nondji-operator-journeys.html) · **PDF:** [`stravyx-dji-vs-nondji-operator-journeys.pdf`](./stravyx-dji-vs-nondji-operator-journeys.pdf) · Pack: [`stravyx-live-ops-briefings.html`](./stravyx-live-ops-briefings.html)  
> **Regenerate PDF:** `python3 scripts/generate_dji_vs_nondji_operator_journeys_pdf.py`  
> **One-line answer:** Non-DJI operators **never** use DJI Cloud API. They finish jobs in Stravyx with status taps and **manual upload**. Supported DJI operators *may* also plug Pilot 2 into Stravyx for live status and auto photos — same booking, same customer downloads.  
> **Authority:** [ADR 0005](./adr/0005-flight-provider-cloud-api-only.md) · [dji-integration-architecture.md](./dji-integration-architecture.md) · glossary in [dji-live-ops-path-comparison.md](./dji-live-ops-path-comparison.md)

---

## What is the same for everyone

Stravyx is the **marketplace** (the shop):

1. Customer books and pays one **Network Price**.  
2. Eligible licensed companies (**ReOC** — Remote Operator’s Certificate) see the offer.  
3. **First to Accept** wins; others are locked out. Full street address appears **after** Accept (suburb only before).  
4. Operator flies the site.  
5. Files land in Stravyx, sit **held** (quarantine), then the operator **Releases** them.  
6. Customer downloads from **Stravyx** — not from DJI, Autel, or email.

The customer never needs a DJI or Autel login. Brand of aircraft must **not** change who can win the job or what the customer pays. Connecting a DJI remote is **never** required to tap Accept.

---

## What is different (the plug, not the shop)

| | Non-DJI (Autel, Skydio, others) | Supported DJI (Pilot 2 / Dock, after privacy) |
|--|--------------------------------|-----------------------------------------------|
| Fly in | Their own flying app | **DJI Pilot 2** on the handheld remote |
| DJI Cloud API | **Never** | Optional hose: remote talks to **our** cloud |
| Progress in Stravyx | Operator taps **Ready → Airborne → Complete** | Taps can be filled from live radio; customer may get a **coarse map pin** if approved |
| Files into Stravyx | Copy off card/drone, **upload in the website** for this job | Pilot 2 can **auto-upload**, or they can still upload by hand |
| If radio/privacy off | This *is* their path | They fall back to the **same** taps + upload |

**DJI Cloud API** = DJI’s protocol where Pilot 2 (or a Dock) talks to **Stravyx-hosted** servers (not FlightHub 2). Autel/Skydio cannot speak it. A later Autel connector would be **their** API, not DJI’s.

**Manual path** = no live drone-to-Stravyx link. Status taps + signed upload. Spare tyre for non-DJI, unsupported DJI, APP 8 gate still open, or radio down.

---

## Side-by-side journey

| Step | Customer | Non-DJI operator | DJI operator (live plug on) |
|------|----------|------------------|------------------------------|
| Book | One price | Same offer board | Same |
| Accept | Job taken | First tap; then address | Same — **no** “connect DJI first” |
| Fly | — | Autel/Skydio/etc. app | Pilot 2 as usual |
| Progress | Track Job | Taps in Stravyx | Live postcards to us; optional pin |
| Files | — | Manual upload for **this job** | Auto-upload and/or manual |
| Release | Downloads appear | Confirms files belong to this job | Same |
| Cloud API | Never | **Never** | Only if Pilot 2 joined Stravyx |

---

## User stories and scenarios

### Story 1 — Brooke (Autel only)

Priya books a roof inspection. Brooke’s Autel-only company taps Accept first.

Brooke flies in Autel’s app. In Stravyx she taps Ready, Airborne, Complete. She copies photos to a laptop and **Uploads for this job**. Files are held. She presses **Release**. Priya downloads from Stravyx.

She never opened DJI software. **DJI Cloud API is not involved.**

### Story 2 — Alex (supported DJI, live radio allowed)

Same booking. Alex wins. His remote is already in **his company’s Stravyx room**. He assigns aircraft SN-123, flies in Pilot 2. Priya may see a pin. Photos can auto-land in our cupboard. He **Releases**. Priya still downloads from Stravyx, not FlightHub.

If the radio dies, he finishes like Brooke: taps + manual upload. The job must not be stuck.

### Story 3 — Alex (DJI kit) while APP 8 is still open

Live radio is **off** in production. Alex flies in Pilot 2 **locally** (screen on the remote, files on the card) and completes **exactly like Brooke**. Owning DJI hardware does **not** force Cloud API.

### Story 4 — Mixed fleet (one company)

Chris has a Matrice 30 and an Autel.

- Matrice job (after privacy): he *may* use Cloud API.  
- Autel job: **always manual** for that aircraft. The Autel cannot join DJI Cloud API.

Accept is one tap either way. He does not need the Matrice online to take an Autel job.

### Story 5 — DJI model we do not support

Dana flies a consumer DJI Mini. It is not on our Cloud API hardware list. She is **manual**, same as Autel. We do not tell her to “use Cloud API anyway.”

### Story 6 — Two operators racing; customer does not pick a brand

Priya sees one Network Price, not “DJI vs Autel.” We must **not** rank who gets the job by “whose DJI is online.” Winner might be Brooke (manual) or Alex (live). Priya still gets raw photos from Stravyx after Release.

### Story 7 — Radio outage on a DJI job already accepted

Alex accepted, then the controller cannot reach Stravyx. He still taps Complete and uploads. Same Release. Same customer download.

### Story 8 — Later (not Live-ops A)

If we add an Autel/Skydio connector, Brooke might one day get auto-upload via **their** cloud, not DJI’s. Maps/3D (Layer 2) stay a Stravyx processing product — Brooke is not sent to FlightHub.

---

## What we will not do

- Require DJI Cloud API (or any DJI account) to Accept or to be paid.  
- Make customers log into a drone-maker website.  
- Leave a job stranded because live radio failed.  
- Rank dispatch by device-online.  
- Pretend manual Track Job is a live map (status labels only, unless we later add something like phone GPS — separate product/privacy decision).

---

## Related

- Path and glossary: [dji-live-ops-path-comparison.md](./dji-live-ops-path-comparison.md)  
- APP 8 (live radio vs files-only): [app8-live-ops-gate-closeout.md](./app8-live-ops-gate-closeout.md) §1a  
- Architecture Story C (non-DJI / gate open): [dji-integration-architecture.md](./dji-integration-architecture.md)
