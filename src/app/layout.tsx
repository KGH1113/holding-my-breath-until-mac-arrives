import type { Metadata } from "next";
import { headers } from "next/headers";
import { detectLocale } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "Holding My Breath Until Mac Arrives",
  description:
    "A playful bilingual countdown to one very anticipated MacBook delivery.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  const locale = detectLocale({
    acceptLanguage: requestHeaders.get("accept-language"),
    country: requestHeaders.get("x-vercel-ip-country"),
  });

  return (
    <html lang={locale}>
      <head>
        <link
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css"
          rel="stylesheet"
        />
      </head>
      <body className="bg-black text-[#f5f5f7] antialiased [font-family:Pretendard,system-ui,sans-serif]">
        {children}
      </body>
    </html>
  );
}
