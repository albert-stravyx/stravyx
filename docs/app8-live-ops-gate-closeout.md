# APP 8 live-ops gate — close-out brief for Liz and Joel

> **Audience:** Liz (Consent & Privacy Policy v4, DPIA) and Joel (gate owner).  
> **Purpose:** List every decision, notice, and sign-off needed to **lift the DJI live-ops APP 8 blocker** (ERD §13.16).  
> **HTML:** [`stravyx-app8-live-ops-gate-closeout.html`](./stravyx-app8-live-ops-gate-closeout.html) · **PDF:** [`stravyx-app8-live-ops-gate-closeout.pdf`](./stravyx-app8-live-ops-gate-closeout.pdf) · Pack: [`stravyx-live-ops-briefings.html`](./stravyx-live-ops-briefings.html)  
> **Regenerate PDF:** `python3 scripts/generate_app8_live_ops_gate_closeout_pdf.py`  
> **Not:** legal advice, an engineering build ticket, or the APP 3/5 operator-outreach review.  
> **Date:** 2026-08-16  
> **Status:** Gate **open**. Manual photo cupboard (S0) and DJI Cloud API **licence application** may proceed. Production live radio / live map / auto-upload / livestream / dock remote-control may **not**.  
> **Authority:** [data-model-erd.md](./data-model-erd.md) §13.16 · [ADR 0005](./adr/0005-flight-provider-cloud-api-only.md) · [dji-integration-architecture.md](./dji-integration-architecture.md)

**This document is a homework pack.** When the sign-off block at the end is completed, engineering may turn on live drone-to-Stravyx features **only to the extent you have approved**. Until then, the product **fails closed**: operators finish jobs by tapping status and uploading files by hand.

---

## 1. One-page brief

Stravyx is a **shop**: customers book a drone job; a licensed operator (a **ReOC** — Remote Operator’s Certificate company) wins it; files come back through us. Some operators will later plug a DJI remote into **our** cloud so a live map and automatic photos can work. That radio can involve **personal information** (photos of people’s homes, a pin over a house) and **computers outside Australia** (including DJI checking a licence).

**Australian Privacy Principle 8 (APP 8)** is the rule about sending personal information **overseas**. A **DPIA** (Data Protection Impact Assessment) is the written list of every stop the data makes and who is responsible.

Joel locked: **do not start production live-ops** (live location ingest, livestreams, dock remote commands) until **Consent & Privacy Policy v4** discloses that overseas story (Liz). That is **this** gate.

| Allowed now | Blocked until this pack is signed |
|-------------|-----------------------------------|
| Book → Accept → operator **manually uploads** photos/video in Stravyx | Live map of the aircraft |
| Real signed upload, hold, **Release**, customer download (S0) | **Automatic** photos from the DJI remote into our cupboard |
| Apply for **DJI developer / Cloud API licence** (paperwork, waiting) | Livestream to the customer |
| Ordinary “we collect site photos” notices for the manual path | Dock “fly from the office” commands |
| | Production MQTT radio (the private walkie-talkie from the remote to us) |

**Do not mix** this review with **APP 3/5 operator-database outreach** (may we email operators from lead lists?). Different data, different notices.

| Who | Owns |
|-----|------|
| **Liz** | v4 redline; DPIA / hop list; customer and operator notices; confirm APP 3/5 stays separate; DJI DPA countries (**verify**, do not guess) |
| **Joel** | What Live-ops A actually offers (live map? auto photos?); commercial “fail closed”; written **gate closed** |
| **Engineering** | Hide Connect Pilot / live map / auto-upload until sign-off; never put secrets in the phone; S0 cupboard can ship without this gate |

---

## 1a. What if we never use live radio or automatic sync?

**Then you do not need to “close” this live-ops APP 8 gate to ship the product.** You simply **do not enter** it.

**Live radio** means the DJI remote is logged into a Stravyx room and sends live location (and similar) to our servers. **Automatic sync** means the remote puts photos in our cupboard after landing, without the operator using the website upload button.

If **neither** happens in production:

| What customers still get | What they do **not** get |
|--------------------------|---------------------------|
| Book, pay Network Price, first-to-accept | A moving pin on Track Job |
| Operator taps Ready → Airborne → Complete | Photos appearing by themselves after landing |
| Operator **uploads files by hand** for that job | Livestream, dock remote-fly, FlightHub |
| Hold → Release → customer download | Any Pilot 2 “join Stravyx cloud” in production |

**This live-ops gate (ERD §13.16)** is about **Pilot-to-Cloud / Dock-to-Cloud ingest**. No ingest → the blocker for *those features* stays **parked**, not “failed.” Engineering must **not** turn on MQTT, Connect Pilot, live map, or auto-upload. The marketplace file loop can still go live (S0).

**APP 8 does not disappear entirely.** Photos of someone’s house are still personal information. If our cupboard is in **Tokyo**, sending those files overseas is APP 8 because of **our hosting**, not because of DJI. Liz still needs collection notices and a residency call (decision D3). That is a **smaller** pack than the DJI radio DPIA.

**How Joel can record this (recommended):** In D2 / D10 / sign-off, write: *“Live-ops A is files-only. No live radio, no auto-upload. §13.16 gate remains open; production must fail-closed for Connect Pilot. S0 manual path approved.”* You can apply for a DJI licence **now** so Layer 2 is possible later; that application is not turning the radio on.

**Story.** Priya books a roof job. Alex wins, flies with any drone (DJI or not), comes home, uploads 40 photos in Stravyx. No pin. No remote talking to us. Priya downloads after Release. **Liz/Joel:** notices for “we store your site photos”; where the cupboard sits. **Not required for launch:** DJI overseas-disclosure chapter for live ingest.

If you **later** want a live pin or auto photos, come back to this pack and close D1–D10 before production.

---

## 2. Glossary

More terms: [dji-live-ops-path-comparison.md](./dji-live-ops-path-comparison.md).

| Term | Plain meaning |
|------|----------------|
| **APP 8** | Australian Privacy Principle 8 — cross-border disclosure of personal information. |
| **DPIA** | Written map: what we collect, where it goes, which country, who is responsible. |
| **Personal information** | Here: photos/video of a site that can identify a person or their home; a **live map pin** (“someone is over this house now”). |
| **ReOC** | Licensed Australian drone company (Alex’s business). Stravyx never holds this licence. |
| **Pilot 2** | DJI flying app on the **handheld remote’s screen**. |
| **Stravyx room (workspace)** | The “company hotel” Pilot 2 checks into so status and photos go to **us**, not FlightHub 2. |
| **Live status / telemetry** | Frequent postcards from the remote: roughly here, battery, still flying. Feeds the live map. |
| **MQTT** | The industrial walkie-talkie the remote uses to our servers. Customers’ browsers never use it. |
| **STS** | Security Token Service — a **temporary luggage tag** so the remote can put files in our cupboard without our permanent password. |
| **Auto-upload** | After landing, Pilot 2 asks for that tag and sends photos without the website upload button. |
| **Manual upload** | Operator uses Stravyx in a browser, picks files, uploads for **this job**. |
| **Fail-closed** | If the gate is open or later withdrawn, live connect **disappears**. The job can still finish by hand. |
| **FlightHub 2** | DJI’s own hotel. **Not** on the Live-ops A path. A later maps/3D buy would be a **new** APP 8 pass. |

---

## 3. What is in this gate vs out

| Operator / product behaviour | This live-ops APP 8 gate? | Still think about privacy? |
|------------------------------|---------------------------|----------------------------|
| Taps Ready / Airborne / Complete; **uploads in the Stravyx website** | **No** — S0 may ship | **Yes, lightly:** where *we* store files (Tokyo vs Sydney); collection notices; any overseas virus scanner |
| Customer **live map** of the aircraft | **Yes** | Yes |
| **Automatic photos** from Pilot 2 | **Treat as yes** until you explicitly exclude “auto site imagery” | Yes |
| Live **video** in the browser | **Yes** (named in §13.16) | Yes — **out of Live-ops A** until a later gate |
| Dock **remote commands** | **Yes** (named in §13.16) | Yes — **out of Live-ops A** |
| DJI **licence / heartbeat** while using our Sydney radio | **Yes** — hosting in Australia does not delete this hop | List it in the DPIA even if unverified country |
| Alex’s **own** DJI app cloud backup | **Not this gate** | Policy should say we are not that cloud |
| HubSpot leads / operator outreach | **Out of this pack** (APP 3/5) | Separate Liz track |

**Recommended default until you write otherwise:** auto site imagery is **inside** this gate. Do not turn on production auto-upload without a signed exclusion.

---

## 4. User stories (language you can sign)

### Priya — customer (roof inspection)

**Given** Priya books and pays the Network Price.  
**When** the operator flies her site.  
**Then** she has been told, in plain language at booking (and in Policy v4), that site photos are collected to deliver the job; if a live map is on, that her job location may be shown **to her** while it runs; she downloads files from Stravyx only after the operator **Releases** them; she does **not** get a live pin unless that path is approved and disclosed.

**Fail-closed:** if live map is not approved, she still gets files via manual upload. The job is not stuck.

### Alex — operator (ReOC)

**Given** Alex’s company is verified on Stravyx.  
**When** the live-ops gate is **open**.  
**Then** he does **not** see “Connect DJI Pilot” as a live production action; he taps status and uploads by hand.

**When** the gate is **closed** for the features you approved.  
**Then** he may check Pilot 2 into **his company’s** Stravyx room; Brooke’s company must never see his jobs or drones; upload tags (STS) only apply to **this flight** on **this job**.

### Stravyx admin

**Given** disclosure is withdrawn or a subprocessor changes country.  
**Then** admin (or a config flag) can turn live connect **off** without taking down booking or manual upload.

---

## 5. Scenarios (what Liz/Joel must write)

Each row: what moves, countries, gate, your homework.

### P1 — Manual only, cupboard in Australia

Alex flies, goes home, uploads 40 photos in Stravyx. Files stay in Sydney. Priya downloads after Release.

| | |
|--|--|
| **Data** | Site photos/video Alex chose; job id; his account |
| **Countries** | Australia (if storage is AU) |
| **This gate** | **No** |
| **Write** | Collection notice for site photos; retention; who the ReOC vs Stravyx is |

### P2 — Manual only, cupboard in Tokyo (today’s demo)

Same as P1; file lands in Japan.

| | |
|--|--|
| **Data** | Same photos |
| **Countries** | **Overseas** because of **our** hosting, not DJI |
| **This gate** | Still **no** for DJI radio |
| **Write** | APP 8 for **Stravyx storage region**. Decide: live customer files must be Sydney? Manual demo may stay Tokyo? |

### P3 — Live map, photos still manual

Pilot 2 is in Alex’s Stravyx room. Priya watches a pin. Alex uploads later by hand.

| | |
|--|--|
| **Data** | Live location/time; maybe battery; **not** auto photos |
| **Countries** | Our radio (intended AU) + **unverified** DJI licence hop |
| **This gate** | **Yes** |
| **Write** | v4 + DPIA for live location; customer notice that a pin may appear; fail-closed if they reject live map for Live-ops A |

### P4 — Auto photos, no live map

After landing the remote puts photos in our cupboard. No pin.

| | |
|--|--|
| **Data** | Full site imagery, automatically |
| **Countries** | Upload to our storage region + possible DJI licence hop |
| **This gate** | **Yes, until you exclude auto imagery** |
| **Write** | Explicit ruling: auto site imagery **in** or **out**. Recommended: **in**. |

### P5 — “Radio is in Sydney so APP 8 is done”

Alex’s remote talks to Sydney. The remote may still check its **DJI licence** with DJI overseas.

| | |
|--|--|
| **Data** | Device/licence technical data (**verify** with DJI DPA — do not invent fields) |
| **Countries** | **Unverified** (likely outside AU) |
| **This gate** | **Yes** for any live radio |
| **Write** | Name DJI as overseas recipient of **licence/technical** data even when ingest is AU; Liz confirms with DJI |

### P6 — Alex also uses DJI’s own cloud

Alex’s phone backups DJI photos to DJI independently.

| | |
|--|--|
| **Data** | Outside Stravyx |
| **This gate** | **No** |
| **Write** | One sentence: Stravyx is not responsible for the operator’s own DJI account cloud |

### R1 — Two companies, one shared hotel

If all operators shared one DJI “Stravyx room,” Brooke might see Alex’s drones or ask for a luggage tag into Alex’s cupboard.

| | |
|--|--|
| **Privacy issue** | Wrong **operator** seeing another’s jobs/sites (not only APP 8) |
| **Write** | Joel/Liz accept engineering’s **one room per ReOC** (or accept shared-room risk in writing). Not a substitute for APP 8, but you should know the isolation story. |

### R2 — Wrong job’s photos

The remote asks for an upload tag while paired to a **different** aircraft than the one on Priya’s job.

| | |
|--|--|
| **Privacy issue** | Priya receives another site’s imagery |
| **Write** | Support **hold then Release**; engineering’s “this-flight wristband” (capture session). Product: Release is the customer-safety catch. |

---

## 6. Hop inventory (DPIA homework)

Not a finished legal opinion. **Unverified** = Liz to confirm with DJI DPA / vendor, not engineering guesswork.

| ID | Hop | Data (typical) | Purpose | Who can see | Country today | Retention (Liz) |
|----|-----|----------------|---------|-------------|-----------------|-----------------|
| H1 | Operator/customer **browser** → Stravyx API | Account, job, suburb/address by role | Run the marketplace | Role-projected | Demo often **Tokyo** API/DB | Job + dispute period? |
| H2 | **Manual file upload** → object storage | Photos/video Alex selected | Deliver L1 to customer after Release | Operator; customer after Release; admin | Demo **unverified** / often not Sydney; **target Sydney** | Same |
| H3 | Optional **malware/type scan** | File bytes or hash | Safe to open | Scanner vendor | **TBD** — if overseas, APP 8 | Transient vs stored? |
| H4 | Pilot 2 → **our MQTT/HTTPS** (live) | Live status; bind; later STS request | Live map; auto-upload | Stravyx; customer sees **coarse** pin only if approved | **Intended Sydney** | Live stream vs stored track? |
| H5 | **STS** put → S3/MinIO | Auto photos | Same as H2 | Same as H2 | Must match residency ruling | Same as H2 |
| H6 | **DJI licence / Cloud API control plane** | Device identity, licence check (**verify**) | Controller allowed to join third-party cloud | DJI | **Unverified, likely overseas** | DJI’s policy |
| H7 | Customer **browser** ← Stravyx signed download | Released files | Customer gets the job | Customer | Same as H2 | Link expiry |
| H8 | **Livestream CDN / WebRTC** | Live video | Later product | Customer if entitled | **TBD** — new gate | Session only? |
| H9 | **FlightHub 2** | Fleet/media/models | Later L2 — **not Live-ops A** | DJI + us | DJI SaaS overseas likely | New DPIA |
| H10 | **HubSpot** | Leads, not mission photos | Marketing | CRM | Separate APP 3/5 | **Out of this pack** |

**Visibility firewall (product, not APP 8):** operators must not see customer total / Layer 2 economics; customers must not see the L1/L2 price split. Live pins must not leak full address to the wrong role.

---

## 7. Decision log (this is what removes the blocker)

Recommended defaults in **bold**. Tick after Liz/Joel fill the right-hand column.

| # | Decision | Recommended default | Liz | Joel | Notes |
|---|----------|---------------------|-----|------|-------|
| D0 | Ship **files-only** (no live radio, no auto-upload) for this release? | **Yes, if you want to launch without closing §13.16.** Gate stays open; Connect Pilot stays off. See §1a. | | | Does **not** skip D3–D6 for manual photos |
| D1 | Is **automatic site imagery** inside Consent v4 / this gate? | **Yes — in-gate** until explicitly excluded | | | Skip if D0 = files-only until you later want auto-upload |
| D2 | Is a **live map** part of first live-ops, or files-only? | **Files-only** unless you choose to close this pack for live map | | | Independent review: do not promise a pin on the manual path |
| D3 | **Storage residency** for customer files | **Sydney** for any production customer imagery (manual or auto). Demo Tokyo must not be production SoT | | | P2 is APP 8 even without DJI |
| D4 | Lawful basis — customer | **Notified collection** for delivering the job + **consent** if you offer optional live map | | | Counsel, not this doc |
| D5 | Lawful basis — operator | Operator as **independent** collector in the field vs Stravyx as platform — **spell the split** | | | ReOC flies; we host the shop |
| D6 | **Retention** after delivered / dispute hold | e.g. job files N months; legal hold longer | | | Matches Release/quarantine story |
| D7 | **Subprocessors** named in v4 | Stravyx hosting region; **DJI** (licence/technical); scanner TBD; no FH2 until L2 | | | H6 unverified countries |
| D8 | Fail-closed commercially OK? | **Yes** — live connect off, manual still completes the job | | | Admin kill switch |
| D9 | Docks / livestream / DRC in this sign-off? | **No** — later gates, later v4 delta | | | §13.16 names them as gated; do not pretend this pack covers them |
| D10 | Gate closed for **which** features? | List explicitly: e.g. “MQTT + live map + auto-upload” **or** a subset | | | Engineering will not infer |

---

## 8. Consent v4 — draft clauses (for counsel; not legal advice)

Paste-adapt. Counsel must settle wording.

**Live location.** If you use live tracking, the operator’s controller may send the aircraft’s approximate position to Stravyx so you can see job progress. That signal is processed on Stravyx systems [in Australia / see DPIA]. The controller may also exchange **licence or technical data with DJI**, which may be **outside Australia**.

**Photos and video.** Site imagery is collected to deliver your job. If automatic upload is enabled, the controller may send files to Stravyx storage after the flight. Files are **held** until the operator confirms they belong to this job, then you may download them from Stravyx. We are not DJI FlightHub; we do not use FlightHub for this service.

**Manual path.** You can complete a job by the operator uploading files in Stravyx without connecting a live controller. That path does not use the live radio.

**Withdraw / fail-closed.** If live connect is unavailable or you do not want live tracking, the operator can still finish the job by manual upload. Contact [privacy@…] to ask questions or complain to the OAIC.

**Operators.** You must only upload or auto-send imagery for jobs you are engaged to fly. You must not use Stravyx to access another operator’s jobs. Your own DJI account cloud is outside this policy.

---

## 9. Action checklist

**Done when** the evidence column can be filled (link or date).

### Liz

| Action | Done when |
|--------|-----------|
| Redline **Consent & Privacy Policy v4** for live radio + (if D1 yes) auto imagery + DJI overseas licence hop | Tracked change set + published URL/draft |
| DPIA or equivalent covering hops **H1–H7** (H8–H9 later); mark H6 **verified** or **assumed** | Document in counsel/privacy drive; summary attached or linked |
| Customer notice at **booking**; operator notice at **onboarding / Connect Pilot** | Copy signed off; engineering can implement later |
| Confirm **APP 3/5 outreach is a different document** | One line in v4 or this sign-off |
| Request **DJI DPA / subprocessors / regions** for Cloud API licence path | Email/ticket; do not block licence **application** |

### Joel

| Action | Done when |
|--------|-----------|
| Fill **D1–D10** (especially D1 auto imagery, D2 live map, D3 residency, D10 feature list) | This file’s decision log completed |
| Accept **fail-closed** (D8) as the production behaviour until/unless gate stays closed | Written yes |
| Record **gate closed** (or “closed for features X, still open for Y”) | Sign-off block below + [DECISIONS.md](./DECISIONS.md) |

### Engineering (after sign-off — not a substitute for it)

| Action | Done when |
|--------|-----------|
| Fail-closed UX: no production Connect Pilot / live map / auto-upload while gate open | Flag + tests |
| S0 manual cupboard may ship **without** waiting | Separate slice |
| No production MQTT until D10 list is closed | Architecture already forbids scaffold until Phase 1B **and** this gate |

### Parallel (does not close the gate)

| Action | Owner |
|--------|-------|
| DJI developer account + **Cloud API licence application** | Platform / Joel |
| One ReOC partner + supported hardware list | Product |

---

## 10. Sign-off

**Not legal advice.** Completing this block is the **product/privacy** signal engineering needs.

| Field | Value |
|-------|--------|
| Date | |
| Liz (v4 + DPIA + notices) | Name / signature / “complete for features: ____” |
| Joel (D1–D10 + gate) | Name / signature / “APP 8 live-ops gate **closed** for: ____ / **still open** for: ____” |
| Features explicitly **in** this close-out | e.g. none yet / **files-only (D0)** / live map / auto-upload / MQTT ingest |
| Features explicitly **out** (later pack) | Livestream, dock remote command, FlightHub 2, MSDK |
| Fail-closed confirmed | Yes / No |
| Auto site imagery in-gate? | Yes / No (if No, attach rationale) |
| Storage residency for production files | |
| Link to v4 + DPIA | |

Until this table is filled, the live-ops APP 8 gate remains **open**. Manual per-mission upload in Stravyx remains the legal production path for files.

How DJI and non-DJI operators finish the same job while this gate is open: [dji-vs-nondji-operator-journeys.md](./dji-vs-nondji-operator-journeys.md).
