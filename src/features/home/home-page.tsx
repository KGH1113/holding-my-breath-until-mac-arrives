"use client";

import { useEffect, useState } from "react";
import {
  type CountdownStatus,
  type DeliveryTarget,
  getCountdownSnapshot,
  getKoreanDateLabel,
} from "@/lib/countdown";
import type { Locale } from "@/lib/i18n";
import type { TrackingSnapshot } from "@/lib/tracking";

const SECOND = 1_000;

const deliveryTarget: DeliveryTarget = {
  date: "2026-03-24",
  timeZone: "Asia/Seoul",
  utcOffset: "+09:00",
};

type TimePart = {
  key: "days" | "hours" | "minutes" | "seconds";
  label: string;
};

type CopySet = {
  eyebrow: string;
  title: string;
  madeByButtonLabel: string;
  trackingButtonLabel: string;
  profileTitle: string;
  profileLabelRole: string;
  profileLabelLocation: string;
  profileLabelLink: string;
  profileLabelEmail: string;
  profileLinkText: string;
  profileEmailPlaceholder: string;
  closeLabel: string;
  specsTitle: string;
  totalLabel: string;
  expectedDeliveryLabel: string;
  timezoneNote: string;
  shipmentTitle: string;
  shipmentUnavailableLabel: string;
  shipmentStaleLabel: string;
  shipmentLastUpdatedLabel: string;
  shipmentLatestEventLabel: string;
  shipmentOpenLinkLabel: string;
  shipmentStatusLabel: string;
  timeParts: TimePart[];
  specs: readonly string[][];
  dateLabel: string;
};

const orderPrice = "₩ 4,169,000";

const ownerProfile = {
  name: "KGH (강구현)",
  role: "Full Stack Dev",
  location: "Seoul, South Korea",
  githubUrl: "https://github.com/KGH1113",
  emailPlaceholder: "gangguhyeon1113@gmail.com",
} as const;

const copyByLocale: Record<
  Locale,
  {
    countdown: CopySet;
    imminent: CopySet;
    arrived: CopySet;
  }
> = {
  en: {
    countdown: {
      eyebrow: "Holding my breath",
      title: "Countdown to the new MacBook.",
      madeByButtonLabel: "Made By",
      trackingButtonLabel: "Tracking",
      profileTitle: "About the owner",
      profileLabelRole: "Role",
      profileLabelLocation: "Location",
      profileLabelLink: "GitHub",
      profileLabelEmail: "Email",
      profileLinkText: "@KGH1113",
      profileEmailPlaceholder: ownerProfile.emailPlaceholder,
      closeLabel: "Close",
      specsTitle: "Order configuration",
      totalLabel: "Total",
      expectedDeliveryLabel: "Expected delivery date",
      timezoneNote: "Timer follows Asia/Seoul time",
      shipmentTitle: "Live shipment",
      shipmentUnavailableLabel: "Unavailable",
      shipmentStaleLabel: "stale",
      shipmentLastUpdatedLabel: "Last updated",
      shipmentLatestEventLabel: "Latest",
      shipmentOpenLinkLabel: "Open",
      shipmentStatusLabel: "Status",
      timeParts: [
        { key: "days", label: "Days" },
        { key: "hours", label: "Hours" },
        { key: "minutes", label: "Minutes" },
        { key: "seconds", label: "Seconds" },
      ],
      specs: [
        [
          "Apple M5 Pro chip with 18-core CPU, 20-core GPU, and 16-core Neural Engine",
          "48GB unified memory",
          "96W USB-C power adapter",
          "1TB SSD storage",
        ],
        [
          "Three Thunderbolt 5 ports, HDMI, SDXC card slot, headphone jack, and MagSafe 3",
          "35.9cm Liquid Retina XDR display with standard display option",
          "Magic Keyboard (US)",
        ],
      ],
      dateLabel: deliveryTarget.date,
    },
    imminent: {
      eyebrow: "Today is the day",
      title: "The Mac could arrive any minute now.",
      madeByButtonLabel: "Made By",
      trackingButtonLabel: "Tracking",
      profileTitle: "About the owner",
      profileLabelRole: "Role",
      profileLabelLocation: "Location",
      profileLabelLink: "GitHub",
      profileLabelEmail: "Email",
      profileLinkText: "@KGH1113",
      profileEmailPlaceholder: ownerProfile.emailPlaceholder,
      closeLabel: "Close",
      specsTitle: "Order configuration",
      totalLabel: "Total",
      expectedDeliveryLabel: "Expected delivery date",
      timezoneNote:
        "Timer follows Asia/Seoul time so the countdown behaves the same everywhere.",
      shipmentTitle: "Live shipment",
      shipmentUnavailableLabel: "Unavailable",
      shipmentStaleLabel: "stale",
      shipmentLastUpdatedLabel: "Last updated",
      shipmentLatestEventLabel: "Latest",
      shipmentOpenLinkLabel: "Open",
      shipmentStatusLabel: "Status",
      timeParts: [
        { key: "days", label: "Days" },
        { key: "hours", label: "Hours" },
        { key: "minutes", label: "Minutes" },
        { key: "seconds", label: "Seconds" },
      ],
      specs: [
        [
          "Apple M5 Pro chip with 18-core CPU, 20-core GPU, and 16-core Neural Engine",
          "48GB unified memory",
          "96W USB-C power adapter",
          "1TB SSD storage",
        ],
        [
          "Three Thunderbolt 5 ports, HDMI, SDXC card slot, headphone jack, and MagSafe 3",
          "35.9cm Liquid Retina XDR display with standard display option",
          "Magic Keyboard (US)",
        ],
      ],
      dateLabel: deliveryTarget.date,
    },
    arrived: {
      eyebrow: "Mission accomplished",
      title: "The Mac has landed.",
      madeByButtonLabel: "Made By",
      trackingButtonLabel: "Tracking",
      profileTitle: "About the owner",
      profileLabelRole: "Role",
      profileLabelLocation: "Location",
      profileLabelLink: "GitHub",
      profileLabelEmail: "Email",
      profileLinkText: "@KGH1113",
      profileEmailPlaceholder: ownerProfile.emailPlaceholder,
      closeLabel: "Close",
      specsTitle: "Order configuration",
      totalLabel: "Total",
      expectedDeliveryLabel: "Expected delivery date",
      timezoneNote:
        "Timer follows Asia/Seoul time so the countdown behaves the same everywhere.",
      shipmentTitle: "Live shipment",
      shipmentUnavailableLabel: "Unavailable",
      shipmentStaleLabel: "stale",
      shipmentLastUpdatedLabel: "Last updated",
      shipmentLatestEventLabel: "Latest",
      shipmentOpenLinkLabel: "Open",
      shipmentStatusLabel: "Status",
      timeParts: [
        { key: "days", label: "Days" },
        { key: "hours", label: "Hours" },
        { key: "minutes", label: "Minutes" },
        { key: "seconds", label: "Seconds" },
      ],
      specs: [
        [
          "Apple M5 Pro chip with 18-core CPU, 20-core GPU, and 16-core Neural Engine",
          "48GB unified memory",
          "96W USB-C power adapter",
          "1TB SSD storage",
        ],
        [
          "Three Thunderbolt 5 ports, HDMI, SDXC card slot, headphone jack, and MagSafe 3",
          "35.9cm Liquid Retina XDR display with standard display option",
          "Magic Keyboard (US)",
        ],
      ],
      dateLabel: deliveryTarget.date,
    },
  },
  ko: {
    countdown: {
      eyebrow: "숨 참고 기다리는 중",
      title: "새 맥북 도착까지\n카운트다운",
      madeByButtonLabel: "Made By",
      trackingButtonLabel: "Tracking",
      profileTitle: "페이지 주인",
      profileLabelRole: "역할",
      profileLabelLocation: "위치",
      profileLabelLink: "GitHub",
      profileLabelEmail: "이메일",
      profileLinkText: "@KGH1113",
      profileEmailPlaceholder: ownerProfile.emailPlaceholder,
      closeLabel: "닫기",
      specsTitle: "주문한 사양",
      totalLabel: "총액",
      expectedDeliveryLabel: "배송 예정일",
      timezoneNote: "타이머는 Asia/Seoul 기준으로 계산됨",
      shipmentTitle: "실시간 배송 상태",
      shipmentUnavailableLabel: "확인 불가",
      shipmentStaleLabel: "이전 정보",
      shipmentLastUpdatedLabel: "마지막 업데이트",
      shipmentLatestEventLabel: "최근 정보",
      shipmentOpenLinkLabel: "열기",
      shipmentStatusLabel: "상태",
      timeParts: [
        { key: "days", label: "일" },
        { key: "hours", label: "시간" },
        { key: "minutes", label: "분" },
        { key: "seconds", label: "초" },
      ],
      specs: [
        [
          "Apple M5 Pro 칩(18코어 CPU, 20코어 GPU, 16코어 Neural Engine)",
          "48GB 통합 메모리",
          "96W USB-C 전원 어댑터",
          "1TB SSD 저장 장치",
        ],
        [
          "Thunderbolt 5 포트 3개, HDMI 포트, SDXC 카드 슬롯, 헤드폰 잭, MagSafe 3",
          "35.9cm Liquid Retina XDR 디스플레이, 스탠다드 디스플레이",
          "Magic Keyboard(영어/미국)",
        ],
      ],
      dateLabel: getKoreanDateLabel(deliveryTarget.date),
    },
    imminent: {
      eyebrow: "오늘이 그날",
      title: "맥이 이제 정말 곧 도착할 수 있다.",
      madeByButtonLabel: "Made By",
      trackingButtonLabel: "Tracking",
      profileTitle: "페이지 주인",
      profileLabelRole: "역할",
      profileLabelLocation: "위치",
      profileLabelLink: "GitHub",
      profileLabelEmail: "이메일",
      profileLinkText: "@KGH1113",
      profileEmailPlaceholder: ownerProfile.emailPlaceholder,
      closeLabel: "닫기",
      specsTitle: "내가 주문한 정확한 사양.",
      totalLabel: "총액",
      expectedDeliveryLabel: "배송 예정일",
      timezoneNote:
        "타이머는 Asia/Seoul 기준으로 계산되어 어디서 봐도 같은 상태를 보여준다.",
      shipmentTitle: "실시간 배송 상태",
      shipmentUnavailableLabel: "확인 불가",
      shipmentStaleLabel: "이전 정보",
      shipmentLastUpdatedLabel: "마지막 업데이트",
      shipmentLatestEventLabel: "최근 정보",
      shipmentOpenLinkLabel: "열기",
      shipmentStatusLabel: "상태",
      timeParts: [
        { key: "days", label: "일" },
        { key: "hours", label: "시간" },
        { key: "minutes", label: "분" },
        { key: "seconds", label: "초" },
      ],
      specs: [
        [
          "Apple M5 Pro 칩(18코어 CPU, 20코어 GPU, 16코어 Neural Engine)",
          "48GB 통합 메모리",
          "96W USB-C 전원 어댑터",
          "1TB SSD 저장 장치",
        ],
        [
          "Thunderbolt 5 포트 3개, HDMI 포트, SDXC 카드 슬롯, 헤드폰 잭, MagSafe 3",
          "35.9cm Liquid Retina XDR 디스플레이, 스탠다드 디스플레이",
          "Magic Keyboard(영어/미국)",
        ],
      ],
      dateLabel: getKoreanDateLabel(deliveryTarget.date),
    },
    arrived: {
      eyebrow: "임무 완료",
      title: "맥이 도착했다.",
      madeByButtonLabel: "Made By",
      trackingButtonLabel: "Tracking",
      profileTitle: "페이지 주인",
      profileLabelRole: "역할",
      profileLabelLocation: "위치",
      profileLabelLink: "GitHub",
      profileLabelEmail: "이메일",
      profileLinkText: "@KGH1113",
      profileEmailPlaceholder: ownerProfile.emailPlaceholder,
      closeLabel: "닫기",
      specsTitle: "내가 주문한 정확한 사양.",
      totalLabel: "총액",
      expectedDeliveryLabel: "배송 예정일",
      timezoneNote:
        "타이머는 Asia/Seoul 기준으로 계산되어 어디서 봐도 같은 상태를 보여준다.",
      shipmentTitle: "실시간 배송 상태",
      shipmentUnavailableLabel: "확인 불가",
      shipmentStaleLabel: "이전 정보",
      shipmentLastUpdatedLabel: "마지막 업데이트",
      shipmentLatestEventLabel: "최근 정보",
      shipmentOpenLinkLabel: "열기",
      shipmentStatusLabel: "상태",
      timeParts: [
        { key: "days", label: "일" },
        { key: "hours", label: "시간" },
        { key: "minutes", label: "분" },
        { key: "seconds", label: "초" },
      ],
      specs: [
        [
          "Apple M5 Pro 칩(18코어 CPU, 20코어 GPU, 16코어 Neural Engine)",
          "48GB 통합 메모리",
          "96W USB-C 전원 어댑터",
          "1TB SSD 저장 장치",
        ],
        [
          "Thunderbolt 5 포트 3개, HDMI 포트, SDXC 카드 슬롯, 헤드폰 잭, MagSafe 3",
          "35.9cm Liquid Retina XDR 디스플레이, 스탠다드 디스플레이",
          "Magic Keyboard(영어/미국)",
        ],
      ],
      dateLabel: getKoreanDateLabel(deliveryTarget.date),
    },
  },
};

function getStatusCopy(locale: Locale, status: CountdownStatus) {
  return copyByLocale[locale][status];
}

type HomePageProps = {
  locale: Locale;
  tracking: TrackingSnapshot;
};

function formatUpdatedAt(timestamp: string | null, locale: Locale) {
  if (!timestamp) {
    return null;
  }

  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function getLocalizedDhlStatus(status: string, locale: Locale) {
  const normalized = status.trim().toLowerCase();

  const matches = (keywords: string[]) =>
    keywords.some((keyword) => normalized.includes(keyword));

  const isInTransit = matches(["in transit", "운송", "이동 중", "다음 연결"]);
  const isDelivered = matches(["delivered", "배송 완료", "배달 완료"]);
  const isInfoReceived = matches([
    "shipment information received",
    "발송 정보는 등록",
    "아직 dhl에 인계되지",
  ]);
  const isCustoms = matches(["customs", "통관"]);
  const isPickedUp = matches(["picked up", "접수", "픽업"]);
  const isException = matches(["exception", "지연", "보류", "문제"]);

  if (locale === "ko") {
    if (isDelivered) return "배송 완료";
    if (isCustoms) return "통관 진행 중";
    if (isInfoReceived) return "배송 정보 접수됨";
    if (isPickedUp) return "픽업 완료";
    if (isException) return "예외 발생";
    if (isInTransit) return "운송 중";
    return status;
  }

  if (isDelivered) return "Delivered";
  if (isCustoms) return "In customs processing";
  if (isInfoReceived) return "Shipment information received";
  if (isPickedUp) return "Picked up";
  if (isException) return "Exception";
  if (isInTransit) return "In transit";
  return status;
}

export function HomePage({ locale, tracking }: HomePageProps) {
  const [nowTimestamp, setNowTimestamp] = useState<number | null>(null);
  const [activeLocale, setActiveLocale] = useState<Locale>(locale);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);

  useEffect(() => {
    setNowTimestamp(Date.now());

    const intervalId = window.setInterval(() => {
      setNowTimestamp(Date.now());
    }, SECOND);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    setActiveLocale(locale);
  }, [locale]);

  useEffect(() => {
    if (!isProfileModalOpen && !isTrackingModalOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsProfileModalOpen(false);
        setIsTrackingModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isProfileModalOpen, isTrackingModalOpen]);

  const snapshot =
    nowTimestamp === null
      ? {
          days: "--",
          hours: "--",
          minutes: "--",
          seconds: "--",
          status: "countdown" as const,
        }
      : getCountdownSnapshot(nowTimestamp, deliveryTarget);
  const copy = getStatusCopy(activeLocale, snapshot.status);
  const lastUpdatedAt = formatUpdatedAt(tracking.lastUpdatedAt, activeLocale);

  return (
    <>
      <main className="flex min-h-dvh items-center justify-center bg-black px-0 md:px-4">
        <section className="flex h-auto w-full flex-col overflow-hidden border-y border-white/12 bg-[linear-gradient(180deg,rgba(8,8,10,0.98),rgba(2,2,4,0.98))] shadow-[0_32px_80px_rgba(0,0,0,0.48)] md:h-[min(920px,calc(100dvh-32px))] md:w-[min(1180px,100%)] md:rounded-[32px] md:border">
          <div
            aria-hidden="true"
            className='relative min-h-[220px] bg-[#050505] bg-[image:linear-gradient(180deg,rgba(0,0,0,0.06),rgba(0,0,0,0.72)),url("/macbook-hero.png")] bg-cover bg-center bg-no-repeat md:min-h-0 md:flex-1'
          >
            <div className="absolute inset-x-0 bottom-0 h-2/5 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.92))]" />
          </div>

          <div className="flex min-h-0 flex-col gap-5 p-4 md:h-[500px] md:flex-none md:flex-row md:p-7">
            <div className="contents md:flex md:min-h-0 md:flex-[1.18] md:flex-col md:justify-between md:gap-[18px]">
              <div className="order-1 flex min-h-[140px] flex-col gap-3 md:min-h-[156px]">
                <div className="flex items-center justify-between gap-4">
                  <p className="m-0 text-[0.84rem] font-bold uppercase tracking-[0.14em] text-white/68">
                    {copy.eyebrow}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      className="min-w-[78px] whitespace-nowrap rounded-full border border-white/12 bg-white/3 px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-white/62 transition hover:text-white"
                      onClick={() => setIsTrackingModalOpen(true)}
                      type="button"
                    >
                      {copy.trackingButtonLabel}
                    </button>
                    <button
                      className="min-w-[78px] whitespace-nowrap rounded-full border border-white/12 bg-white/3 px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-white/62 transition hover:text-white"
                      onClick={() => setIsProfileModalOpen(true)}
                      type="button"
                    >
                      {copy.madeByButtonLabel}
                    </button>
                    <div className="inline-flex rounded-full border border-white/12 bg-white/5 p-1">
                      {(["en", "ko"] as const).map((language) => {
                        const isActive = activeLocale === language;

                        return (
                          <button
                            className={`rounded-full px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-[0.14em] transition ${
                              isActive
                                ? "bg-white text-black"
                                : "text-white/68 hover:text-white"
                            }`}
                            key={language}
                            onClick={() => setActiveLocale(language)}
                            type="button"
                          >
                            {language === "en" ? "ENG" : "KOR"}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <h1
                  className={`m-0 min-h-[1.9em] max-w-[12ch] bg-[linear-gradient(90deg,#e4f6f0,#9dcfca_31%,#6b95ac_68%,#45657d)] bg-clip-text text-[clamp(2.15rem,4.4vw,4.5rem)] leading-[0.92] tracking-[-0.06em] text-transparent ${
                    activeLocale === "ko"
                      ? "max-w-none whitespace-pre-line leading-[1.04] md:text-[clamp(1.95rem,3.9vw,4rem)]"
                      : ""
                  }`}
                >
                  {copy.title}
                </h1>
              </div>

              <section
                className="order-3 min-h-0 rounded-3xl border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_28%),linear-gradient(180deg,rgba(12,12,14,0.92),rgba(8,8,10,0.92))] px-4 py-5 md:px-5 md:py-[18px]"
                aria-labelledby="order-specs-title"
              >
                <div className="mb-3.5">
                  <h2
                    id="order-specs-title"
                    className="m-0 text-[0.82rem] font-normal uppercase tracking-[0.1em] text-white/68"
                  >
                    {copy.specsTitle}
                  </h2>
                </div>

                <div className="flex flex-col gap-y-2 md:flex-row md:gap-x-[18px] md:gap-y-0">
                  {copy.specs.map((column, columnIndex) => (
                    <ul
                      className="m-0 flex min-w-0 flex-1 list-none flex-col gap-y-2 p-0"
                      key={`spec-column-${columnIndex + 1}`}
                    >
                      {column.map((spec) => (
                        <li
                          className="relative pl-[18px] text-[0.86rem] leading-[1.4] text-white/82 before:absolute before:left-0 before:top-[0.58rem] before:h-[7px] before:w-[7px] before:rounded-full before:bg-sky-300 before:shadow-[0_0_18px_rgba(125,211,252,0.45)] before:content-['']"
                          key={spec}
                        >
                          {spec}
                        </li>
                      ))}
                    </ul>
                  ))}
                </div>

                <div className="mt-2 flex w-full min-w-0 items-baseline justify-end gap-2 pt-3 text-right">
                  <span className="block text-[0.78rem] font-bold uppercase tracking-[0.12em] text-white/56">
                    {copy.totalLabel}
                  </span>
                  <strong className="block min-w-0 whitespace-nowrap text-[clamp(1rem,1.4vw,1.28rem)] tracking-[-0.04em] tabular-nums">
                    {orderPrice}
                  </strong>
                </div>
              </section>
            </div>

            <div className="order-2 flex min-h-0 flex-col gap-3.5 rounded-3xl border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_32%),linear-gradient(180deg,rgba(18,18,22,0.96),rgba(10,10,12,0.92))] p-4 backdrop-blur-[12px] md:w-[min(300px,41%)] md:flex-[0.82] md:p-[22px]">
              <div className="flex flex-col gap-1.5 text-[0.82rem] uppercase tracking-[0.1em] text-white/68">
                <p className="m-0">{copy.expectedDeliveryLabel}</p>
              </div>
              <div className="flex flex-col gap-1.5 text-[clamp(0.92rem,1.5vw,1.02rem)] leading-[1.4] tabular-nums">
                <span>{copy.dateLabel}</span>
              </div>

              <div aria-live="polite" className="grid grid-cols-2 gap-2.5">
                {copy.timeParts.map((part) => (
                  <article
                    className="flex min-h-[126px] flex-col justify-between rounded-[20px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent_36%),rgba(255,255,255,0.02)] p-[14px]"
                    key={part.key}
                  >
                    <strong className="text-[clamp(2rem,4vw,3.1rem)] leading-[0.95] tracking-[-0.06em] tabular-nums">
                      {snapshot[part.key]}
                    </strong>
                    <span className="mt-auto block text-[0.8rem] font-bold uppercase tracking-[0.08em]">
                      {part.label}
                    </span>
                  </article>
                ))}
              </div>

              <p className="m-0 border-t border-white/12 pt-1.5 text-[0.84rem] leading-[1.45] text-white/68">
                {copy.timezoneNote}
              </p>
            </div>
          </div>
        </section>
      </main>

      {isProfileModalOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/72 p-4 backdrop-blur-sm"
          role="dialog"
        >
          <button
            aria-label={copy.closeLabel}
            className="absolute inset-0 cursor-default"
            onClick={() => setIsProfileModalOpen(false)}
            type="button"
          />
          <div className="relative z-10 w-full max-w-md rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(18,18,22,0.98),rgba(8,8,10,0.98))] p-5 shadow-[0_32px_80px_rgba(0,0,0,0.48)] md:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="m-0 text-[0.78rem] font-bold uppercase tracking-[0.12em] text-white/56">
                  {copy.profileTitle}
                </p>
                <p className="mt-2 text-[1.15rem] font-semibold tracking-[-0.03em] text-white">
                  {ownerProfile.name}
                </p>
              </div>
              <button
                aria-label={copy.closeLabel}
                className="rounded-full border border-white/12 bg-white/4 px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-white/68 transition hover:text-white"
                onClick={() => setIsProfileModalOpen(false)}
                type="button"
              >
                {copy.closeLabel}
              </button>
            </div>

            <div className="flex flex-col gap-3 text-[0.92rem] leading-[1.5] text-white/82">
              <div className="border-t border-white/8 pt-3">
                <span className="mr-2 text-[0.75rem] font-bold uppercase tracking-[0.12em] text-white/50">
                  {copy.profileLabelRole}
                </span>
                <span>{ownerProfile.role}</span>
              </div>
              <div className="border-t border-white/8 pt-3">
                <span className="mr-2 text-[0.75rem] font-bold uppercase tracking-[0.12em] text-white/50">
                  {copy.profileLabelLocation}
                </span>
                <span>{ownerProfile.location}</span>
              </div>
              <div className="border-t border-white/8 pt-3">
                <span className="mr-2 text-[0.75rem] font-bold uppercase tracking-[0.12em] text-white/50">
                  {copy.profileLabelLink}
                </span>
                <a
                  className="underline decoration-white/20 underline-offset-4 transition hover:decoration-white/60"
                  href={ownerProfile.githubUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {copy.profileLinkText}
                </a>
              </div>
              <div className="border-t border-white/8 pt-3">
                <span className="mr-2 text-[0.75rem] font-bold uppercase tracking-[0.12em] text-white/50">
                  {copy.profileLabelEmail}
                </span>
                <a
                  className="underline decoration-white/20 underline-offset-4 transition hover:decoration-white/60"
                  href={`mailto:${copy.profileEmailPlaceholder}`}
                >
                  {copy.profileEmailPlaceholder}
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isTrackingModalOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/72 p-4 backdrop-blur-sm"
          role="dialog"
        >
          <button
            aria-label={copy.closeLabel}
            className="absolute inset-0 cursor-default"
            onClick={() => setIsTrackingModalOpen(false)}
            type="button"
          />
          <div className="relative z-10 w-full max-w-lg rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(18,18,22,0.98),rgba(8,8,10,0.98))] p-5 shadow-[0_32px_80px_rgba(0,0,0,0.48)] md:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="m-0 text-[0.78rem] font-bold uppercase tracking-[0.12em] text-white/56">
                  {copy.shipmentTitle}
                </p>
                {lastUpdatedAt ? (
                  <p className="mt-2 text-[0.85rem] leading-[1.4] text-white/52">
                    {copy.shipmentLastUpdatedLabel} {lastUpdatedAt}
                  </p>
                ) : null}
              </div>
              <button
                aria-label={copy.closeLabel}
                className="rounded-full border border-white/12 bg-white/4 px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-white/68 transition hover:text-white"
                onClick={() => setIsTrackingModalOpen(false)}
                type="button"
              >
                {copy.closeLabel}
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {(
                [
                  { label: "Apple", data: tracking.apple },
                  { label: "DHL", data: tracking.dhl },
                ] as const
              ).map(({ label, data }) => (
                <section
                  className="rounded-3xl border border-white/10 bg-white/[0.02] p-4"
                  key={label}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="m-0 text-[0.8rem] font-bold uppercase tracking-[0.12em] text-white/58">
                        {label}
                      </p>
                      {data.isStale ? (
                        <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[0.65rem] uppercase tracking-[0.12em] text-white/45">
                          {copy.shipmentStaleLabel}
                        </span>
                      ) : null}
                    </div>
                    <a
                      className="shrink-0 text-[0.76rem] font-medium text-white/68 underline decoration-white/15 underline-offset-4 transition hover:decoration-white/50"
                      href={data.sourceUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {copy.shipmentOpenLinkLabel}
                    </a>
                  </div>
                  <div className="flex flex-col gap-2 text-[0.92rem] leading-[1.5] text-white/82">
                    <p className="m-0">
                      <span className="mr-2 text-[0.73rem] font-bold uppercase tracking-[0.12em] text-white/46">
                        {copy.shipmentStatusLabel}
                      </span>
                      <span>
                        {label === "DHL"
                          ? getLocalizedDhlStatus(
                              data.status || copy.shipmentUnavailableLabel,
                              activeLocale,
                            )
                          : data.status || copy.shipmentUnavailableLabel}
                      </span>
                    </p>
                    <p className="m-0">
                      <span className="mr-2 text-[0.73rem] font-bold uppercase tracking-[0.12em] text-white/46">
                        {copy.shipmentLatestEventLabel}
                      </span>
                      <span>{data.latestEvent}</span>
                    </p>
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
