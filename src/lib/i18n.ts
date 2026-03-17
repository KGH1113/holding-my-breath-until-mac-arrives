export type Locale = "en" | "ko";

const DEFAULT_LOCALE: Locale = "en";

function normalizeLocale(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

export function detectLocale(input: {
  acceptLanguage?: string | null;
  country?: string | null;
}): Locale {
  const country = normalizeLocale(input.country);

  if (country === "kr") {
    return "ko";
  }

  const acceptLanguage = normalizeLocale(input.acceptLanguage);

  if (acceptLanguage.includes("ko")) {
    return "ko";
  }

  return DEFAULT_LOCALE;
}
