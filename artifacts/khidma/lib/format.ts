import type { Locale } from "./i18n";

export function formatPrice(amount: number, locale: Locale): string {
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString(locale === "ar" ? "ar-SA" : "en-US");
  return `${sign}${formatted}`;
}

export function formatRelative(ts: number, locale: Locale): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (locale === "ar") {
    if (minutes < 1) return "الآن";
    if (minutes < 60) return `قبل ${minutes} د`;
    if (hours < 24) return `قبل ${hours} س`;
    if (days < 7) return `قبل ${days} يوم`;
    return new Date(ts).toLocaleDateString("ar-SA");
  }
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-US");
}

export function formatTime(ts: number, locale: Locale): string {
  return new Date(ts).toLocaleTimeString(locale === "ar" ? "ar-SA" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(ts: number, locale: Locale): string {
  return new Date(ts).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
