export function shouldFetchAddressSuggestions(input: {
  focused: boolean;
  disabled: boolean;
  query: string;
  committedQuery: string | null;
}): boolean {
  if (!input.focused || input.disabled) return false;
  if (input.query.trim().length < 3) return false;
  if (input.committedQuery !== null && input.query === input.committedQuery) return false;
  return true;
}
