import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const APPLE_ORDER_URL =
  process.env.APPLE_ORDER_URL ??
  "https://secure9.store.apple.com/kr/shop/order/guest/W1345336219/99528aaff860e20d36fce17666d7c9691d83c91f4371686e68252ffbaf6942d59f0ac81b1677933755b956a806031a357493f407819a782e3af6e2e07c51fadc7778dc52c15c153663b2e01e2d153f71?e=true";
const DHL_TRACKING_URL =
  process.env.DHL_TRACKING_URL ?? "https://api-eu.dhl.com/track/shipments";
const DHL_TRACKING_NUMBER = process.env.DHL_TRACKING_NUMBER ?? "7197708221";
const DHL_TRACKING_PAGE_URL =
  process.env.DHL_TRACKING_PAGE_URL ??
  `https://www.dhl.com/kr-ko/home/tracking.html?submit=1&tracking-id=${DHL_TRACKING_NUMBER}`;
const DHL_API_KEY = process.env.DHL_API_KEY;
const DHL_UTAPI_COOKIE = process.env.DHL_UTAPI_COOKIE;

const CACHE_TTL_MS = 5 * 60 * 1_000;
const CACHE_DIR =
  process.env.NODE_ENV === "production"
    ? path.join(os.tmpdir(), "holding-my-breath-until-mac-arrives-cache")
    : path.join(process.cwd(), ".cache");
const CACHE_FILE = path.join(CACHE_DIR, "tracking-cache.json");

export type TrackingProviderSnapshot = {
  sourceUrl: string;
  status: string;
  latestEvent: string;
  eventTime?: string | null;
  isStale: boolean;
  error?: string;
};

export type TrackingSnapshot = {
  lastUpdatedAt: string | null;
  apple: TrackingProviderSnapshot;
  dhl: TrackingProviderSnapshot;
};

type CachedTrackingSnapshot = TrackingSnapshot;

let memoryCache: CachedTrackingSnapshot | null = null;
let cacheMode: "unknown" | "file" | "memory" = "unknown";

function logTracking(message: string, details?: Record<string, unknown>) {
  const prefix = "[tracking]";

  if (details) {
    console.log(prefix, message, details);
    return;
  }

  console.log(prefix, message);
}

function defaultProviderState(
  sourceUrl: string,
  error: string,
): TrackingProviderSnapshot {
  return {
    sourceUrl,
    status: "Unavailable",
    latestEvent: "No tracking data available yet.",
    eventTime: null,
    isStale: false,
    error,
  };
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function findFirstMatch(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[0]) {
      return match[0].trim();
    }
  }

  return null;
}

function extractJsonScript<T>(html: string, scriptId: string) {
  const escapedId = scriptId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `<script[^>]*id=["']${escapedId}["'][^>]*>\\s*([\\s\\S]*?)\\s*<\\/script>`,
    "i",
  );
  const match = html.match(pattern);

  if (!match?.[1]) {
    return null;
  }

  try {
    return JSON.parse(match[1]) as T;
  } catch {
    return null;
  }
}

async function readCache() {
  if (cacheMode === "memory") {
    logTracking("Using memory tracking cache");
    return memoryCache;
  }

  try {
    const raw = await readFile(CACHE_FILE, "utf8");
    cacheMode = "file";
    logTracking("Using file tracking cache", {
      cacheFile: CACHE_FILE,
    });
    return JSON.parse(raw) as CachedTrackingSnapshot;
  } catch {
    cacheMode = "memory";
    logTracking("File tracking cache unavailable, falling back to memory", {
      cacheFile: CACHE_FILE,
    });

    return memoryCache;
  }
}

async function writeCache(snapshot: TrackingSnapshot) {
  memoryCache = snapshot;

  if (cacheMode === "memory") {
    logTracking("Stored tracking snapshot in memory cache");
    return;
  }

  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(CACHE_FILE, JSON.stringify(snapshot, null, 2), "utf8");
    cacheMode = "file";
    logTracking("Stored tracking snapshot in file cache", {
      cacheFile: CACHE_FILE,
    });
  } catch (error) {
    cacheMode = "memory";
    logTracking("File tracking cache write failed, using memory cache", {
      cacheFile: CACHE_FILE,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

function markStale(
  provider: TrackingProviderSnapshot,
): TrackingProviderSnapshot {
  return {
    ...provider,
    isStale: true,
  };
}

function isReliableDhlSnapshot(snapshot: TrackingProviderSnapshot) {
  const genericLatestEvents = new Set([
    "No DHL event details could be extracted.",
    "추적 상황은 통상적으로 배송 조회 ID를 받은 24~48시간 후에 표시됩니다",
    "Delivered",
  ]);

  const unreliableStatuses = new Set(["Unavailable", "Delivered"]);

  if (genericLatestEvents.has(snapshot.latestEvent)) {
    return false;
  }

  if (unreliableStatuses.has(snapshot.status)) {
    return false;
  }

  if (
    looksLikeDhlFooterNoise(snapshot.status) ||
    looksLikeDhlFooterNoise(snapshot.latestEvent)
  ) {
    return false;
  }

  return true;
}

function isReliableAppleSnapshot(snapshot: TrackingProviderSnapshot) {
  const genericStatuses = new Set(["Unavailable", "Order page available"]);
  const genericLatestEvents = new Set([
    "No tracking data available yet.",
    "Apple order page fetched successfully.",
  ]);

  if (genericStatuses.has(snapshot.status)) {
    return false;
  }

  if (genericLatestEvents.has(snapshot.latestEvent)) {
    return false;
  }

  return true;
}

type DhlShipmentPayload = {
  id?: string;
  status?: {
    timestamp?: string;
    statusCode?: string;
    status?: string;
    description?: string;
    remark?: string;
  };
  details?: {
    shipmentActivationDate?: string;
  };
  events?: Array<{
    timestamp?: string;
    statusCode?: string;
    status?: string;
    description?: string;
  }>;
  estimatedTimeOfDelivery?: string;
};

function getDhlSnapshotFromShipment(
  shipment: DhlShipmentPayload | undefined,
): TrackingProviderSnapshot | null {
  if (!shipment) {
    return null;
  }

  const latestEventEntry = shipment.events?.[0];
  const status =
    shipment.status?.description ??
    latestEventEntry?.description ??
    shipment.status?.remark ??
    shipment.status?.status ??
    shipment.status?.statusCode ??
    null;
  const latestEvent =
    latestEventEntry?.description ??
    shipment.status?.description ??
    shipment.status?.remark ??
    latestEventEntry?.status ??
    latestEventEntry?.statusCode ??
    null;
  const eventTime =
    latestEventEntry?.timestamp ??
    shipment.status?.timestamp ??
    shipment.estimatedTimeOfDelivery ??
    shipment.details?.shipmentActivationDate ??
    null;

  if (!status || !latestEvent) {
    return null;
  }

  return {
    sourceUrl: DHL_TRACKING_PAGE_URL,
    status,
    latestEvent,
    eventTime,
    isStale: false,
  };
}

function looksLikeDhlFooterNoise(value: string | null) {
  if (!value) {
    return false;
  }

  return [
    "채용",
    "언론 소식",
    "투자자",
    "지속 가능성",
    "브랜드 파트너십",
    "사기 주의",
    "법적 고지",
    "이용약관",
    "개인정보 처리방침",
    "쿠키 설정",
    "DHL 팔로우하기",
    "all rights reserved",
  ].some((keyword) => value.includes(keyword));
}

async function fetchDhlTrackingViaPublicPage() {
  try {
    logTracking("DHL public page fallback started", {
      url: DHL_TRACKING_PAGE_URL,
    });

    const pageResponse = await fetch(DHL_TRACKING_PAGE_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      cache: "no-store",
    });

    if (!pageResponse.ok) {
      logTracking("DHL public page fallback failed", {
        status: pageResponse.status,
      });
      return {
        ok: false as const,
        snapshot: defaultProviderState(
          DHL_TRACKING_PAGE_URL,
          `DHL public tracking page request failed with ${pageResponse.status}.`,
        ),
      };
    }

    const html = await pageResponse.text();
    const text = stripHtml(html);
    const pageStatusCandidates = [
      findFirstMatch(text, [
        /발송인에 의해 발송 정보는 등록되었으나 발송물은 아직 DHL에 인계되지 않았습니다/i,
        /Shipment information received/i,
      ]),
      findFirstMatch(text, [
        /배송 중[^.]{0,120}/i,
        /Out for delivery[^.]{0,120}/i,
      ]),
      findFirstMatch(text, [/배송 완료[^.]{0,120}/i]),
    ];
    const pageStatus =
      pageStatusCandidates.find(
        (candidate) => candidate && !looksLikeDhlFooterNoise(candidate),
      ) ?? null;

    if (pageStatus && !looksLikeDhlFooterNoise(pageStatus)) {
      logTracking("DHL public page fallback succeeded from HTML", {
        status: pageStatus,
      });
      return {
        ok: true as const,
        snapshot: {
          sourceUrl: DHL_TRACKING_PAGE_URL,
          status: pageStatus,
          latestEvent: pageStatus,
          eventTime: null,
          isStale: false,
        },
      };
    }

    const webApiUrl = new URL("https://www.dhl.com/utapi");
    webApiUrl.searchParams.set("trackingNumber", DHL_TRACKING_NUMBER);
    webApiUrl.searchParams.set(
      "language",
      process.env.DHL_TRACKING_LANGUAGE ?? "ko",
    );
    webApiUrl.searchParams.set("requesterCountryCode", "KR");
    webApiUrl.searchParams.set("source", "tt");
    webApiUrl.searchParams.set("offset", "0");
    webApiUrl.searchParams.set("limit", "1");

    logTracking("DHL public web endpoint fallback started", {
      url: webApiUrl.toString(),
    });

    const webApiResponse = await fetch(webApiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        Referer: DHL_TRACKING_PAGE_URL,
        ...(DHL_UTAPI_COOKIE ? { Cookie: DHL_UTAPI_COOKIE } : {}),
      },
      cache: "no-store",
    });

    const rawBody = await webApiResponse.text();

    if (!webApiResponse.ok) {
      const challengePayload = rawBody.includes('"sec-cp-challenge"');

      logTracking("DHL public web endpoint fallback failed", {
        status: webApiResponse.status,
        challenge: challengePayload,
      });

      return {
        ok: false as const,
        snapshot: defaultProviderState(
          DHL_TRACKING_PAGE_URL,
          challengePayload
            ? "DHL public tracking endpoint requested an anti-bot challenge."
            : `DHL public tracking endpoint failed with ${webApiResponse.status}.`,
        ),
      };
    }

    const payload = JSON.parse(rawBody) as {
      shipments?: DhlShipmentPayload[];
    };
    const snapshot = getDhlSnapshotFromShipment(payload.shipments?.[0]);

    if (!snapshot) {
      logTracking("DHL public web endpoint fallback incomplete", {
        hasShipment: Boolean(payload.shipments?.[0]),
      });
      return {
        ok: false as const,
        snapshot: defaultProviderState(
          DHL_TRACKING_PAGE_URL,
          "DHL public tracking endpoint did not return a shipment status.",
        ),
      };
    }

    logTracking("DHL public web endpoint fallback succeeded", {
      status: snapshot.status,
      latestEvent: snapshot.latestEvent,
      eventTime: snapshot.eventTime,
    });

    return {
      ok: true as const,
      snapshot,
    };
  } catch (error) {
    logTracking("DHL public fallback threw", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return {
      ok: false as const,
      snapshot: defaultProviderState(
        DHL_TRACKING_PAGE_URL,
        error instanceof Error
          ? error.message
          : "Unknown DHL public fallback error.",
      ),
    };
  }
}

async function fetchAppleTracking() {
  const cookie = process.env.APPLE_ORDER_COOKIE;

  if (!cookie) {
    logTracking("Apple tracking skipped", {
      reason: "Missing APPLE_ORDER_COOKIE",
    });
    return {
      ok: false as const,
      snapshot: defaultProviderState(
        APPLE_ORDER_URL,
        "Missing APPLE_ORDER_COOKIE environment variable.",
      ),
    };
  }

  try {
    logTracking("Apple tracking request started", {
      url: APPLE_ORDER_URL,
    });

    const response = await fetch(APPLE_ORDER_URL, {
      headers: {
        Cookie: cookie,
        "User-Agent":
          process.env.APPLE_ORDER_USER_AGENT ??
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      logTracking("Apple tracking request failed", {
        status: response.status,
      });
      return {
        ok: false as const,
        snapshot: defaultProviderState(
          APPLE_ORDER_URL,
          `Apple order request failed with ${response.status}.`,
        ),
      };
    }

    const html = await response.text();
    const text = stripHtml(html);
    const initData = extractJsonScript<{
      orderDetail?: {
        orderItems?: {
          c?: string[];
          [key: string]: unknown;
        };
      };
    }>(html, "init_data");
    const orderItems = initData?.orderDetail?.orderItems;
    const firstItemKey = orderItems?.c?.[0];
    const firstItem =
      firstItemKey && orderItems
        ? (orderItems[firstItemKey] as {
            orderItemDetails?: {
              d?: {
                deliveryDate?: string;
              };
            };
            orderItemStatusTracker?: {
              d?: {
                statusDescription?: string;
                currentStatus?: string;
              };
            };
          })
        : null;
    const statusDescription =
      firstItem?.orderItemStatusTracker?.d?.statusDescription?.trim() ?? null;
    const currentStatus =
      firstItem?.orderItemStatusTracker?.d?.currentStatus?.trim() ?? null;
    const deliveryDate =
      firstItem?.orderItemDetails?.d?.deliveryDate?.trim() ?? null;

    const status =
      statusDescription ??
      currentStatus ??
      findFirstMatch(text, [
        /Preparing to Ship/i,
        /Processing/i,
        /Shipped/i,
        /Out for Delivery/i,
        /Delivered/i,
        /Order Details/i,
      ]) ??
      "Order page available";
    const latestEvent =
      (deliveryDate ? `도착 예정: ${deliveryDate}` : null) ??
      findFirstMatch(text, [
        /Arrives[^.]+/i,
        /Delivers[^.]+/i,
        /Delivery[^.]+/i,
        /Ships[^.]+/i,
        /Pickup[^.]+/i,
      ]) ??
      "Apple order page fetched successfully.";

    logTracking("Apple tracking request succeeded", {
      status,
      currentStatus,
      deliveryDate,
      latestEvent,
    });

    return {
      ok: true as const,
      snapshot: {
        sourceUrl: APPLE_ORDER_URL,
        status,
        latestEvent,
        eventTime: null,
        isStale: false,
      },
    };
  } catch (error) {
    logTracking("Apple tracking request threw", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return {
      ok: false as const,
      snapshot: defaultProviderState(
        APPLE_ORDER_URL,
        error instanceof Error
          ? error.message
          : "Unknown Apple tracking error.",
      ),
    };
  }
}

async function fetchDhlTracking() {
  if (!DHL_API_KEY) {
    logTracking("DHL tracking skipped", {
      reason: "Missing DHL_API_KEY",
    });
    return fetchDhlTrackingViaPublicPage();
  }

  try {
    const url = new URL(DHL_TRACKING_URL);
    url.searchParams.set("trackingNumber", DHL_TRACKING_NUMBER);
    url.searchParams.set("language", process.env.DHL_TRACKING_LANGUAGE ?? "ko");

    logTracking("DHL tracking request started", {
      url: url.toString(),
      trackingNumber: DHL_TRACKING_NUMBER,
    });

    const response = await fetch(url, {
      headers: {
        "DHL-API-Key": DHL_API_KEY,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      logTracking("DHL tracking request failed", {
        status: response.status,
      });
      return fetchDhlTrackingViaPublicPage();
    }

    const payload = (await response.json()) as {
      shipments?: DhlShipmentPayload[];
    };
    const snapshot = getDhlSnapshotFromShipment(payload.shipments?.[0]);

    if (!snapshot) {
      logTracking("DHL tracking response incomplete", {
        hasShipment: Boolean(payload.shipments?.[0]),
      });
      return fetchDhlTrackingViaPublicPage();
    }

    logTracking("DHL tracking request succeeded", {
      status: snapshot.status,
      latestEvent: snapshot.latestEvent,
      eventTime: snapshot.eventTime,
    });

    return {
      ok: true as const,
      snapshot,
    };
  } catch (error) {
    logTracking("DHL tracking request threw", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return fetchDhlTrackingViaPublicPage();
  }
}

export async function getTrackingSnapshot() {
  const cached = await readCache();

  if (cached?.lastUpdatedAt) {
    const age = Date.now() - new Date(cached.lastUpdatedAt).getTime();
    const hasInvalidAppleCache = !isReliableAppleSnapshot(cached.apple);
    const hasInvalidDhlCache = !isReliableDhlSnapshot(cached.dhl);

    if (age < CACHE_TTL_MS && !hasInvalidAppleCache && !hasInvalidDhlCache) {
      logTracking("Using cached tracking snapshot", {
        ageMs: age,
      });
      return cached;
    }
  }

  logTracking("Refreshing tracking snapshot");

  const [appleResult, dhlResult] = await Promise.all([
    fetchAppleTracking(),
    fetchDhlTracking(),
  ]);

  const hadAnySuccess = appleResult.ok || dhlResult.ok;

  const snapshot: TrackingSnapshot = {
    lastUpdatedAt:
      hadAnySuccess || !cached?.lastUpdatedAt
        ? new Date().toISOString()
        : cached.lastUpdatedAt,
    apple: appleResult.ok
      ? appleResult.snapshot
      : cached?.apple && isReliableAppleSnapshot(cached.apple)
        ? { ...markStale(cached.apple), error: appleResult.snapshot.error }
        : appleResult.snapshot,
    dhl: dhlResult.ok
      ? dhlResult.snapshot
      : cached?.dhl && isReliableDhlSnapshot(cached.dhl)
        ? { ...markStale(cached.dhl), error: dhlResult.snapshot.error }
        : dhlResult.snapshot,
  };

  if (hadAnySuccess) {
    await writeCache(snapshot);
    logTracking("Tracking snapshot cached", {
      lastUpdatedAt: snapshot.lastUpdatedAt,
      appleOk: appleResult.ok,
      dhlOk: dhlResult.ok,
    });
  }

  if (!hadAnySuccess) {
    logTracking("Tracking snapshot refresh failed for all providers");
  }

  return snapshot;
}
