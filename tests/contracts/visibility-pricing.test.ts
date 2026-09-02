import { describe, expect, it } from "vitest";
import {
  assertNoLeak,
  calculateNetworkPrice,
  customerDisplayNameFromProfile,
  projectForAdmin,
  projectForCustomer,
  projectForOperatorAccepted,
  projectForOperatorOffer,
  splitFromNetworkPrice,
  type MissionEconomics,
  type OperatorOfferListItem,
} from "@stravyx/types";

describe("calculateNetworkPrice", () => {
  it("uses $250/hr × urgency × duration (cents)", () => {
    // 60 min standard → 25000 cents
    expect(
      calculateNetworkPrice({ durationMinutes: 60, urgency: "standard" })
        .networkPriceCents,
    ).toBe(25_000);

    // 30 min urgent 1.35 → round(25000 * 1.35 * 0.5) = 16875
    expect(
      calculateNetworkPrice({ durationMinutes: 30, urgency: "urgent" })
        .networkPriceCents,
    ).toBe(16_875);
  });

  it("applies equipment factor", () => {
    expect(
      calculateNetworkPrice({
        durationMinutes: 60,
        urgency: "standard",
        equipmentFactor: 1.2,
      }).networkPriceCents,
    ).toBe(30_000);
  });

  it("rejects non-positive duration", () => {
    expect(() =>
      calculateNetworkPrice({ durationMinutes: 0, urgency: "standard" }),
    ).toThrow(/durationMinutes/);
  });
});

describe("visibility firewall", () => {
  const econ: MissionEconomics = {
    missionId: "m1",
    status: "dispatched",
    networkPriceCents: 25_000,
    flightFeeCents: 17_857,
    layer2Cents: 7_143,
    fullAddress: "123 George St, Sydney NSW 2000",
    suburb: "Sydney",
    urgency: "standard",
  };

  it("customer projection exposes only network price money field", () => {
    const view = projectForCustomer(econ);
    expect(view.networkPriceCents).toBe(25_000);
    assertNoLeak("customer", view);
    expect("layer2Cents" in view).toBe(false);
    expect("flightFeeCents" in view).toBe(false);
  });

  it("operator offer is suburb-only and never network/L2", () => {
    const view = projectForOperatorOffer(econ);
    expect(view.suburb).toBe("Sydney");
    expect(view.earnCents).toBe(splitFromNetworkPrice(25_000).operatorEarnCents);
    assertNoLeak("operator", view);
    expect("fullAddress" in view).toBe(false);
    expect("networkPriceCents" in view).toBe(false);
  });

  it("unaccepted operator projection omits customerName, customer id, and fullAddress", () => {
    const view = projectForOperatorOffer(econ);
    expect("customerName" in view).toBe(false);
    expect("fullAddress" in view).toBe(false);
    expect("customerId" in view).toBe(false);
    expect("customer_id" in view).toBe(false);
    assertNoLeak("operator", view);
    expect("networkPriceCents" in view).toBe(false);
    expect("layer2Cents" in view).toBe(false);
    expect("flightFeeCents" in view).toBe(false);
    expect("platformFeeCents" in view).toBe(false);
  });

  it("unaccepted operator list item omits customerName and fullAddress", () => {
    const projected = projectForOperatorOffer(econ);
    const item: OperatorOfferListItem = {
      offerId: "offer-sent-1",
      missionId: projected.missionId,
      status: "sent",
      missionStatus: "dispatched",
      suburb: projected.suburb,
      earnCents: projected.earnCents,
      currency: projected.currency,
    };
    expect("customerName" in item).toBe(false);
    expect("fullAddress" in item).toBe(false);
    expect("customerId" in item).toBe(false);
    expect("customer_id" in item).toBe(false);
    assertNoLeak("operator", item);
  });

  it("accepted operator projection includes profiles.full_name as customerName", () => {
    const view = projectForOperatorAccepted(econ, {
      customerName: "Demo Customer",
    });
    expect(view.customerName).toBe("Demo Customer");
    expect(view.fullAddress).toBe(econ.fullAddress);
    expect("customerId" in view).toBe(false);
    expect("customer_id" in view).toBe(false);
    assertNoLeak("operator", view);
    expect("networkPriceCents" in view).toBe(false);
    expect("layer2Cents" in view).toBe(false);
    expect("flightFeeCents" in view).toBe(false);
    expect("platformFeeCents" in view).toBe(false);
  });

  it("accepted operator list item includes customerName without money keys", () => {
    const projected = projectForOperatorAccepted(econ, {
      customerName: "Demo Customer",
    });
    const item: OperatorOfferListItem = {
      offerId: "offer-accepted-1",
      missionId: projected.missionId,
      status: "accepted",
      missionStatus: "accepted",
      suburb: projected.suburb,
      earnCents: projected.earnCents,
      currency: projected.currency,
      fullAddress: projected.fullAddress,
      customerName: projected.customerName,
    };
    expect(item.customerName).toBe("Demo Customer");
    expect("fullAddress" in item).toBe(true);
    assertNoLeak("operator", item);
    expect("networkPriceCents" in item).toBe(false);
    expect("layer2Cents" in item).toBe(false);
  });

  it("blank or whitespace full_name falls back to email local-part", () => {
    expect(
      customerDisplayNameFromProfile({
        fullName: null,
        email: "alice@demo.stravyx.com",
      }),
    ).toBe("alice");
    expect(
      customerDisplayNameFromProfile({
        fullName: "   ",
        email: "alice@demo.stravyx.com",
      }),
    ).toBe("alice");
    expect(
      customerDisplayNameFromProfile({
        fullName: "Demo Customer",
        email: "alice@demo.stravyx.com",
      }),
    ).toBe("Demo Customer");
    const accepted = projectForOperatorAccepted(econ, {
      customerName: customerDisplayNameFromProfile({
        fullName: "  ",
        email: "alice@demo.stravyx.com",
      }) ?? "",
    });
    expect(accepted.customerName).toBe("alice");
    assertNoLeak("operator", accepted);
  });

  it("accepted projector rejects blank customerName", () => {
    expect(() =>
      projectForOperatorAccepted(econ, { customerName: "  " }),
    ).toThrow(/customerName/);
  });

  it("display name helper returns null when neither full_name nor email local-part is usable", () => {
    expect(
      customerDisplayNameFromProfile({ fullName: null, email: null }),
    ).toBeNull();
    expect(
      customerDisplayNameFromProfile({ fullName: "  ", email: "not-an-email" }),
    ).toBeNull();
  });

  it("assertNoLeak still rejects operator Network Price leaks", () => {
    expect(() =>
      assertNoLeak("operator", { earnCents: 1, networkPriceCents: 1 }),
    ).toThrow(/networkPriceCents/);
  });

  it("assertNoLeak does not treat customerName or accepted fullAddress as money leaks", () => {
    expect(() =>
      assertNoLeak("operator", {
        earnCents: 1,
        customerName: "Demo Customer",
        fullAddress: "123 George St, Sydney NSW 2000",
      }),
    ).not.toThrow();
  });

  it("admin sees full economics and address", () => {
    const view = projectForAdmin(econ);
    expect(view.fullAddress).toContain("George St");
    expect(view.layer2Cents).toBeGreaterThan(0);
    expect(view.operatorEarnCents + view.platformFeeCents).toBe(
      view.flightFeeCents,
    );
  });

  it("detects customer L1/L2 leak payloads", () => {
    expect(() =>
      assertNoLeak("customer", {
        networkPriceCents: 100,
        flightFeeCents: 70,
      }),
    ).toThrow(/flightFeeCents/);
  });
});
