import { describe, expect, it } from "vitest";
import { shouldFetchAddressSuggestions } from "../../apps/app-web/src/lib/addressSearch.ts";

const selectedLabel = "1 Martin Place, Sydney NSW 2000, Australia";

describe("shouldFetchAddressSuggestions", () => {
  it("does not fetch after a successful pick while the field stays focused", () => {
    expect(
      shouldFetchAddressSuggestions({
        focused: true,
        disabled: false,
        query: selectedLabel,
        committedQuery: selectedLabel,
      }),
    ).toBe(false);
  });

  it("fetches when the user edits away from the committed label", () => {
    expect(
      shouldFetchAddressSuggestions({
        focused: true,
        disabled: false,
        query: "1 Martin Place, Sydney",
        committedQuery: selectedLabel,
      }),
    ).toBe(true);
  });

  it("does not fetch queries shorter than three characters", () => {
    expect(
      shouldFetchAddressSuggestions({
        focused: true,
        disabled: false,
        query: "ab",
        committedQuery: null,
      }),
    ).toBe(false);
  });
});
