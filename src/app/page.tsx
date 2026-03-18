import { headers } from "next/headers";
import { HomePage } from "@/components/home-page";
import { detectLocale } from "@/lib/i18n";
import { getTrackingSnapshot } from "@/lib/tracking";

export default async function Page() {
  const requestHeaders = await headers();
  const locale = detectLocale({
    acceptLanguage: requestHeaders.get("accept-language"),
    country: requestHeaders.get("x-vercel-ip-country"),
  });
  const tracking = await getTrackingSnapshot();

  return <HomePage locale={locale} tracking={tracking} />;
}
