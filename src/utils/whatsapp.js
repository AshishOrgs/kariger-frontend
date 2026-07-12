export function sanitizeWhatsAppNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export function buildWhatsAppUrl({ phone, message }) {
  const number = sanitizeWhatsAppNumber(phone);
  if (!number) return "";
  return `https://api.whatsapp.com/send?phone=${number}&text=${encodeURIComponent(message || "")}`;
}

export function openWhatsApp({ phone, message }) {
  const url = buildWhatsAppUrl({ phone, message });
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}
