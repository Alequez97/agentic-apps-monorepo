export const BG = "#f8fafc";
export const CARD_BG = "#ffffff";
export const BORDER = "#e2e8f0";
export const TEXT_PRIMARY = "#0f172a";
export const TEXT_SECONDARY = "#64748b";
export const TEXT_MUTED = "#94a3b8";
export const ACCENT = "#6366f1";

export function fmtDate(ts) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getStatusTone(status) {
  if (status === "complete") return "green";
  if (status === "failed" || status === "validation_failed") return "red";
  if (status === "analyzing") return "blue";
  return "gray";
}

export function getValidationMeta(validation) {
  if (!validation) {
    return { label: "Not run", palette: "gray" };
  }

  if (validation.shouldContinue) {
    return { label: "Passed", palette: "green" };
  }

  return { label: "Rejected", palette: "red" };
}
