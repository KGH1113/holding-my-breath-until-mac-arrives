import "server-only";

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

const CACHE_TTL_MS = 5 * 60 * 1_000;
const CACHE_TTL_SECONDS = Math.floor(CACHE_TTL_MS / 1_000);
const TRACKING_CACHE_KEY =
  process.env.TRACKING_CACHE_KEY ?? "tracking:snapshot:v1";
const REDIS_REST_URL =
  process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? null;
const REDIS_REST_TOKEN =
  process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? null;

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
let cacheMode: "unknown" | "redis" | "memory" = "unknown";

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

  if (!REDIS_REST_URL || !REDIS_REST_TOKEN) {
    cacheMode = "memory";
    logTracking("Redis cache not configured, falling back to memory", {
      redisConfigured: false,
    });
    return memoryCache;
  }

  try {
    const response = await fetch(
      `${REDIS_REST_URL}/get/${encodeURIComponent(TRACKING_CACHE_KEY)}`,
      {
        headers: {
          Authorization: `Bearer ${REDIS_REST_TOKEN}`,
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(`Redis GET failed with ${response.status}`);
    }

    const payload = (await response.json()) as { result?: string | null };
    const raw = payload.result;

    cacheMode = "redis";
    logTracking("Using redis tracking cache", {
      cacheKey: TRACKING_CACHE_KEY,
    });

    if (!raw) {
      return memoryCache;
    }

    return JSON.parse(raw) as CachedTrackingSnapshot;
  } catch (error) {
    cacheMode = "memory";
    logTracking("Redis tracking cache unavailable, falling back to memory", {
      cacheKey: TRACKING_CACHE_KEY,
      error: error instanceof Error ? error.message : "Unknown error",
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

  if (!REDIS_REST_URL || !REDIS_REST_TOKEN) {
    cacheMode = "memory";
    logTracking("Redis cache not configured, stored snapshot in memory", {
      redisConfigured: false,
    });
    return;
  }

  try {
    const value = JSON.stringify(snapshot);
    const response = await fetch(
      `${REDIS_REST_URL}/set/${encodeURIComponent(TRACKING_CACHE_KEY)}/${encodeURIComponent(value)}?EX=${CACHE_TTL_SECONDS}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${REDIS_REST_TOKEN}`,
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(`Redis SET failed with ${response.status}`);
    }

    cacheMode = "redis";
    logTracking("Stored tracking snapshot in redis cache", {
      cacheKey: TRACKING_CACHE_KEY,
    });
  } catch (error) {
    cacheMode = "memory";
    logTracking("Redis cache write failed, using memory cache", {
      cacheKey: TRACKING_CACHE_KEY,
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
  return snapshot.status !== "Unavailable";
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
    return {
      ok: false as const,
      snapshot: defaultProviderState(
        DHL_TRACKING_PAGE_URL,
        "Missing DHL_API_KEY environment variable.",
      ),
    };
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
      return {
        ok: false as const,
        snapshot: defaultProviderState(
          DHL_TRACKING_PAGE_URL,
          `DHL API request failed with ${response.status}.`,
        ),
      };
    }

    const payload = (await response.json()) as {
      shipments?: DhlShipmentPayload[];
    };
    const snapshot = getDhlSnapshotFromShipment(payload.shipments?.[0]);

    if (!snapshot) {
      logTracking("DHL tracking response incomplete", {
        hasShipment: Boolean(payload.shipments?.[0]),
      });
      return {
        ok: false as const,
        snapshot: defaultProviderState(
          DHL_TRACKING_PAGE_URL,
          "DHL API response did not include a usable shipment status.",
        ),
      };
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
    return {
      ok: false as const,
      snapshot: defaultProviderState(
        DHL_TRACKING_PAGE_URL,
        error instanceof Error ? error.message : "Unknown DHL API error.",
      ),
    };
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
