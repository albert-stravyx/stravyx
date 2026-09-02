# How Stravyx connects drones — recommended path

> **Audience:** founders, operators, and anyone who should understand the choice without industry jargon.  
> **HTML:** [`stravyx-dji-live-ops-path-comparison.html`](./stravyx-dji-live-ops-path-comparison.html) · **PDF:** [`stravyx-dji-live-ops-path-comparison.pdf`](./stravyx-dji-live-ops-path-comparison.pdf) · Pack: [`stravyx-live-ops-briefings.html`](./stravyx-live-ops-briefings.html)  
> **Regenerate PDF:** `python3 scripts/generate_dji_live_ops_path_comparison_pdf.py`  
> **Recommended:** drones talk to **Stravyx** using DJI’s Cloud API, plus a **manual** upload path for everyone else. FlightHub 2 is a later option for processed maps and 3D, not how we connect aircraft for the first live-ops slice.  
> **Authority:** [ADR 0005](./adr/0005-flight-provider-cloud-api-only.md) (architecture decision record) · [dji-integration-architecture.md](./dji-integration-architecture.md)

---

## Picture the shop

Stravyx is the **marketplace**: customers book a drone job, licensed operators tap Accept (first one wins), the customer sees one price, and files come back through Stravyx.

A drone still needs a **radio-to-internet link** so live progress and photos can reach that marketplace. The question is: *whose cloud does the remote controller talk to?*

---

## Glossary (read this first)

Every technical term used in this note is defined here. Later sections assume these meanings.

| Term | Meaning in plain English |
|------|--------------------------|
| **Stravyx** | Our Australian marketplace that matches customers with licensed drone operators, holds the booking, the price, and the customer’s files. |
| **Marketplace** | The booking, payment, job-status, and download product — not the flying itself. |
| **Customer** | The person or company who books and pays for the job (for example a roof inspection). |
| **Operator** | The licensed drone business that flies the job. |
| **ReOC** | **Remote Operator’s Certificate** — the CASA company licence that lets an Australian drone business take commercial work. |
| **CASA** | **Civil Aviation Safety Authority** — Australia’s aviation regulator. |
| **DJI** | The drone manufacturer whose enterprise controllers and docks we integrate with first. Other brands use the manual path. |
| **Aircraft / drone** | The flying machine. For Cloud API it usually talks to the handheld controller, not to the internet by itself. |
| **RC** | **Remote Controller** — the handheld box with sticks and a screen (for example DJI RC Plus). |
| **Pilot 2** | **DJI Pilot 2** — DJI’s official flying app that runs **on the RC’s screen**. Pilots fly with it and can log it into a company cloud. |
| **Dock** | A ground box that stores, charges, and can launch a drone with less human on site. For Cloud API it is another “doorway” to the internet, like an RC. |
| **Gateway** | The device that actually talks to the cloud: the **RC running Pilot 2**, or a **Dock**. Stravyx sees a gateway serial number come online, then which drones are paired to it. |
| **SN** | **Serial number** — unique hardware ID on an RC, Dock, or aircraft. |
| **Workspace** | Stravyx’s Cloud API “organisation room” that Pilot 2 logs into — like joining a company Slack, but for drones. |
| **Cloud API** | DJI’s protocol where Pilot 2 or a Dock talk to **our** servers (not to DJI FlightHub). Stravyx **hosts** that cloud. |
| **MQTT** | An industrial messaging protocol the RC/Dock uses to send live status to Stravyx. Customers’ browsers never use MQTT. Think: a private radio-to-server chat. |
| **HTTPS** | Ordinary secure web requests. Pilot 2 also uses HTTPS to log in, bind devices, and report that a photo upload finished. |
| **STS** | **Security Token Service** — short-lived keys so the drone/app can upload files **directly** into Stravyx storage without getting our permanent passwords. |
| **Manual path** | No live drone-to-Stravyx link. The operator taps Ready → Airborne → Complete in Stravyx and uploads files by hand. Same customer outcome. |
| **FlightHub 2 / FH2** | DJI’s own fleet-ops website and cloud. Operators can run devices there. Stravyx would have to **call DJI’s servers** if we used it. Not required to connect drones or deliver raw photos. |
| **OpenAPI** | A documented set of web addresses (APIs) a computer program can call. FH2 OpenAPI is how Stravyx would talk to DJI’s FlightHub, if we ever did. |
| **API** | **Application Programming Interface** — a defined way for one computer system to ask another to do something (list devices, start a job, fetch a file). |
| **SaaS** | **Software as a Service** — software you use on someone else’s website (FlightHub 2 is DJI’s SaaS). |
| **Layer 1 / L1** | Raw capture: photos, video, and logs from the flight. Visible to customer and operator (with permission). |
| **Layer 2 / L2** | Processed products built from raw files: maps, 3D models, analytics. In Stravyx this is our processing revenue; operators must not see that economics. |
| **Orthomosaic** | A map-like photo stitched from many overlapping pictures, as if looking straight down. |
| **Photogrammetry** | Turning many photos into maps or 3D models with software. |
| **Network Price** | The single price the customer sees. They must not see our split between flight fee and processing. Operators must not see our margin or Layer 2. |
| **Visibility firewall** | Rules in the server (not just hiding things on screen) so the wrong role never receives forbidden money or address fields. |
| **First-to-accept** | Eligible operators are offered the job; the first who taps Accept wins; others are locked out. |
| **Track Job** | The customer screen that shows job progress (and later a live map pin) while the job runs. |
| **WebSocket / WS** | How the phone or browser gets live updates from Stravyx. The browser talks only to Stravyx, never to the drone. |
| **Release (quarantine)** | Photos land in Stravyx first as “held.” The operator (or a rule) confirms they belong to this job, then **releases** them so the customer can download. |
| **SoT** | **System of record** — the one system whose answer is official. For bookings, price, and customer files, that is Stravyx. |
| **Live-ops A** | The first live-operations slice: book → accept → fly → return **raw** photos to the customer. Not livestream, not docks, not 3D maps. |
| **COGS** | **Cost of goods sold** — what it costs us to run the service (servers, storage, support), not the sticker price of a DJI plan. |
| **Device seats** | A FlightHub pricing style that charges per connected aircraft or device per year. |
| **APP 8** | **Australian Privacy Principle 8** — rules about sending personal information overseas. Live video, location, and site photos can count. We do not turn on live drone links in production until this is legally closed. |
| **DPIA** | **Data Protection Impact Assessment** — a written check of what data goes where and who is responsible. |
| **MSDK** | **Mobile SDK (Software Development Kit)** — DJI’s toolkit to build a **custom** flying app on a phone, instead of using Pilot 2. |
| **HUD** | **Heads-up display** — the live flight instruments on the pilot’s screen (map, battery, camera). |
| **ADR** | **Architecture Decision Record** — a short written choice and why we made it (for example ADR 0005). |
| **Bind** | Linking a controller or dock to a Stravyx company account so it can report in. |
| **Sync** | FlightHub’s optional product that copies media or telemetry between FH2 and another cloud. |
| **Analyzer / Virtual Cockpit** | FH2 extras: inspection/change reports, and a remote flying/supervision screen. Out of Live-ops A. |
| **Non-DJI** | Autel, Skydio, and other brands. They use the **manual** path until we add a dedicated connector. |

---

## Recommended: Cloud API + manual

**In one sentence:** Drones report to **our shop**. If they cannot, the operator still finishes the job in Stravyx by hand.

Pilot 2 (or a Dock) joins a Stravyx workspace. Live status comes into Stravyx. Photos land in Stravyx storage. The customer never needs a DJI account. FlightHub 2 is only considered later if we want DJI to **process** maps or 3D.

### Example

Alex’s licensed drone company (a ReOC) wins a roof job in Stravyx — he taps Accept first. On the remote controller he opens Pilot 2 and joins the Stravyx cloud. The customer watches progress in Stravyx Track Job. After landing, photos upload into Stravyx. Alex confirms **Release**. The customer downloads from Stravyx — not from a DJI website.

A second controller in the same company can join the same way (multi-drone). A non-DJI operator, or a DJI operator before the APP 8 privacy gate is closed, uses the same book → accept loop, then taps status and uploads files (**manual**). Full comparison: [dji-vs-nondji-operator-journeys.md](./dji-vs-nondji-operator-journeys.md).

### Why this is Live-ops A

Live-ops A only needs: book → first-to-accept → fly → give the customer **raw** photos. Cloud API does that into Stravyx. Manual is the spare tyre so brand of aircraft never changes marketplace fairness, and so a server outage does not strand a job.

### Pros

- One system of record: booking, price, and delivery stay in Stravyx.
- Several remotes or docks can bind without buying FlightHub 2 device seats.
- Non-DJI operators use the same customer journey.
- If the live link is down, the job can still complete by hand.
- Photos stay in storage we control, then go to the customer through our signed links and visibility rules.
- Customers never need a DJI or FlightHub login.

### Cons (we accept these)

- Stravyx must run and pay for the device cloud: MQTT messaging, upload tokens (STS), file storage, and monitoring (our COGS).
- We own security: each controller must only see its own company’s traffic.
- APP 8 still needs a legal data-flow check (and likely a DPIA), even when we host the cloud, because DJI licence checks may still call DJI overseas.
- Live tracking and auto-upload only work on **supported** DJI Pilot 2 / Dock hardware. Other DJI and all non-DJI stay on manual until we add more connectors.
- We do not get FlightHub’s built-in map/3D processing, Analyzer, or Virtual Cockpit until we buy or build those later.

### What we do later (not this path)

- **FlightHub 2 Business** — only if Layer 2 maps/3D, Analyzer, Sync, or Virtual Cockpit become a product we buy instead of build.
- **MSDK (custom Stravyx flight app)** — optional branded HUD on the phone; not required to connect supported Pilot 2 / Dock fleets ([ADR 0003](./adr/0003-mobile-cross-platform-vs-native.md)).

---

## Other approaches we looked at (context only)

These are **not** how Live-ops A ships. They stay here so a new reader understands *why* the recommended path is Cloud API + manual.

### FlightHub 2 as the live-ops home

**Idea:** Fleet and flights live mainly in DJI FlightHub 2. Stravyx would call DJI’s OpenAPI and copy devices, tasks, and media into the marketplace.

**Example:** Alex flies and manages aircraft inside FlightHub 2. After he accepts a Stravyx job, we try to create a matching FH2 task and pull photos back so the customer can download from Stravyx.

#### Pros

- Less Stravyx infrastructure if DJI already hosts the fleet screen and some livestream minutes.
- Familiar for operators who already live in FlightHub every day.
- Modelling, Analyzer, and Virtual Cockpit can come “in the box” later without us building photogrammetry first.
- Code-light Sync may copy files with less custom engineering.

#### Cons

- Two systems of record: “accepted on Stravyx” can disagree with “task on FlightHub.”
- Seat and subscription cost can be high if priced per device (Enterprise-style seats).
- Customers still book and pay Stravyx, so we still must hold and **Release** files under our visibility rules — FlightHub does not remove that.
- Extra hops through DJI’s SaaS widen the APP 8 / overseas privacy surface.
- Does not by itself give us first-to-accept, Network Price, or customer downloads.

**How this relates to the recommendation:** useful **later** for Layer 2, not as the backbone for connect + raw delivery.

### Cloud API and FlightHub 2 both required from day one

**Idea:** Every DJI operator binds Pilot 2 to Stravyx **and** keeps devices in FlightHub 2 (or keeps the two in sync) before we call live ops done.

**Example:** Alex must join Stravyx in Pilot 2 *and* maintain an FH2 organisation, with jobs wired both ways.

#### Pros

- Ready earlier for FlightHub-native fleets and modelling tools.
- Some operators avoid “pick one cloud.”
- Livestream or reconstruction could be borrowed from FlightHub while Stravyx still owns booking.

#### Cons

- Double setup and training for every pilot.
- Two failure modes: either cloud can break the story.
- Larger privacy surface — data may touch Stravyx **and** DJI from day one.
- No extra win for raw photos or Track Job, which Cloud API already covers.
- Higher COGS: we still host Cloud API **and** pay FlightHub.

**How this relates to the recommendation:** FlightHub can wait until Layer 2 or Sync is a real product need.

### Custom Stravyx app only (MSDK)

**Idea:** Build a branded flight app with DJI’s Mobile SDK instead of using Pilot 2 + Cloud API.

**Example:** Alex installs “Stravyx Fly” on a phone attached to the controller and flies only inside our app. Telemetry and media never go through Pilot 2’s cloud join.

#### Pros

- Deep branded HUD and our own buttons/workflows.
- Live instruments can work on the phone even when the internet is poor (local display).
- Opens some consumer DJI models that Cloud API may not cover (depending on SDK version).

#### Cons

- Large build: Android/iOS native work, app-store, DJI keys, ongoing SDK upgrades.
- Every operator must install and learn a new app instead of the Pilot 2 they already use.
- Does not by itself replace marketplace booking, first-to-accept, or customer downloads.
- Supported Pilot 2 / Dock fleets already reach Stravyx through Cloud API without a custom app.

**How this relates to the recommendation:** a **parallel** operator-app track later ([ADR 0001](./adr/0001-dji-telemetry-unified-types.md), [ADR 0003](./adr/0003-mobile-cross-platform-vs-native.md)), not the marketplace live-ops backbone.

---

## Bottom line

Drones report to **Stravyx** (Cloud API). **Manual** upload is always available. FlightHub 2 and a custom MSDK app are later capabilities, not how we connect jobs to customers for Live-ops A.

Printable copy: [stravyx-dji-live-ops-path-comparison.pdf](./stravyx-dji-live-ops-path-comparison.pdf). Browser briefing: [stravyx-dji-live-ops-path-comparison.html](./stravyx-dji-live-ops-path-comparison.html).

How DJI and non-DJI operators complete the same job: [dji-vs-nondji-operator-journeys.md](./dji-vs-nondji-operator-journeys.md).
