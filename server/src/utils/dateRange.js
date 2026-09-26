export function startOfToday(now = new Date()) {
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function startOfMonth(now = new Date()) {
  const date = startOfToday(now);
  date.setDate(1);
  return date;
}

export function startOfWeek(now = new Date()) {
  const date = startOfToday(now);
  date.setDate(date.getDate() - 7);
  return date;
}

/**
 * Translates the range keys used by the UI filters into a Mongo date filter.
 * Supported: today | yesterday | week | month | all | custom (with from/to).
 */
export function resolveRange({ range = "all", from = "", to = "" } = {}) {
  const today = startOfToday();

  switch (range) {
    case "today":
      return { $gte: today };
    case "yesterday": {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { $gte: yesterday, $lt: today };
    }
    case "week":
      return { $gte: startOfWeek() };
    case "month":
      return { $gte: startOfMonth() };
    case "custom": {
      const filter = {};
      if (from) {
        const start = new Date(from);
        if (!Number.isNaN(start.getTime())) {
          start.setHours(0, 0, 0, 0);
          filter.$gte = start;
        }
      }
      if (to) {
        const end = new Date(to);
        if (!Number.isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999);
          filter.$lte = end;
        }
      }
      return Object.keys(filter).length ? filter : null;
    }
    default:
      return null;
  }
}

export function dayKey(date) {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}
