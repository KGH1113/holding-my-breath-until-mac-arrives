import { headers } from "next/headers";
import { HomePage } from "@/components/home-page";
import { detectLocale } from "@/lib/i18n";

export default async function Page() {
  const requestHeaders = await headers();
  const locale = detectLocale({
    acceptLanguage: requestHeaders.get("accept-language"),
    country: requestHeaders.get("x-vercel-ip-country"),
  });

  return <HomePage locale={locale} />;
}
