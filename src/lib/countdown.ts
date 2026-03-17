const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
export type CountdownStatus = "countdown" | "imminent" | "arrived";

export type DeliveryTarget = {
  date: string;
  timeZone: string;
  utcOffset: string;
};

export type CountdownSnapshot = {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  status: CountdownStatus;
};

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function getFormatter(timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function getTargetStartTimestamp(target: DeliveryTarget) {
  return Date.parse(`${target.date}T00:00:00${target.utcOffset}`);
}

function getOffsetMilliseconds(utcOffset: string) {
  const sign = utcOffset.startsWith("-") ? -1 : 1;
  const [hours, minutes] = utcOffset.slice(1).split(":").map(Number);

  return sign * (hours * HOUR + minutes * MINUTE);
}

function getNextDayStartTimestamp(target: DeliveryTarget) {
  const [year, month, day] = target.date.split("-").map(Number);

  return (
    Date.UTC(year, month - 1, day + 1, 0, 0, 0) -
    getOffsetMilliseconds(target.utcOffset)
  );
}

export function getKoreanDateLabel(date: string) {
  return `${date.replaceAll("-", ".")}.`;
}

export function getCountdownSnapshot(
  nowTimestamp: number,
  target: DeliveryTarget,
): CountdownSnapshot {
  const formatter = getFormatter(target.timeZone);
  const zonedDate = formatter.format(new Date(nowTimestamp));
  const targetStart = getTargetStartTimestamp(target);
  const nextDayStart = getNextDayStartTimestamp(target);

  if (zonedDate > target.date || nowTimestamp >= nextDayStart) {
    return {
      days: "00",
      hours: "00",
      minutes: "00",
      seconds: "00",
      status: "arrived",
    };
  }

  if (zonedDate === target.date || nowTimestamp >= targetStart) {
    return {
      days: "00",
      hours: "00",
      minutes: "00",
      seconds: "00",
      status: "imminent",
    };
  }

  const difference = Math.max(targetStart - nowTimestamp, 0);

  return {
    days: pad(Math.floor(difference / DAY)),
    hours: pad(Math.floor((difference % DAY) / HOUR)),
    minutes: pad(Math.floor((difference % HOUR) / MINUTE)),
    seconds: pad(Math.floor((difference % MINUTE) / SECOND)),
    status: "countdown",
  };
}
