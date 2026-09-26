const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_TA = [
  "ஜன",
  "பிப்",
  "மார்",
  "ஏப்",
  "மே",
  "ஜூன்",
  "ஜூலை",
  "ஆக",
  "செப்",
  "அக்",
  "நவ",
  "டிச",
];

/** Indian grouping, e.g. ₹1,25,000. */
export function money(value, { compact = false, decimals = false } = {}) {
  const amount = Number(value) || 0;

  if (compact && Math.abs(amount) >= 100000) {
    return `₹${(amount / 100000).toFixed(amount % 100000 === 0 ? 0 : 1)}L`;
  }
  if (compact && Math.abs(amount) >= 1000) {
    return `₹${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}K`;
  }

  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

/** Trims trailing zeros so 2.50 kg reads as "2.5" and 3.00 as "3". */
export function quantity(value) {
  const amount = Number(value) || 0;
  if (Number.isInteger(amount)) return String(amount);
  return String(Number(amount.toFixed(3)));
}

export function formatNumber(value) {
  return (Number(value) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function toDate(input) {
  const date = input instanceof Date ? input : new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(input, language = "en") {
  const date = toDate(input);
  if (!date) return "";
  const months = language === "ta" ? MONTHS_TA : MONTHS_EN;
  return `${String(date.getDate()).padStart(2, "0")} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatTime(input) {
  const date = toDate(input);
  if (!date) return "";
  const hours = date.getHours() % 12 || 12;
  const meridiem = date.getHours() >= 12 ? "PM" : "AM";
  return `${hours}:${String(date.getMinutes()).padStart(2, "0")} ${meridiem}`;
}

export function formatDateTime(input, language = "en") {
  const date = toDate(input);
  if (!date) return "";
  return `${formatDate(date, language)}, ${formatTime(date)}`;
}

/** Short axis label for charts: "26 Sep". */
export function formatDayLabel(isoDay, language = "en") {
  const date = toDate(isoDay);
  if (!date) return isoDay;
  const months = language === "ta" ? MONTHS_TA : MONTHS_EN;
  return `${date.getDate()} ${months[date.getMonth()]}`;
}

export function formatHour(hour) {
  const value = Number(hour) || 0;
  const display = value % 12 || 12;
  return `${display}${value >= 12 ? "pm" : "am"}`;
}

export function toInputDate(input = new Date()) {
  const date = toDate(input) || new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function greetingKey(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "dashboard.greetingMorning";
  if (hour < 17) return "dashboard.greetingAfternoon";
  return "dashboard.greetingEvening";
}

export function initials(text = "") {
  return text
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] || "")
    .join("")
    .toUpperCase();
}
