export const money = new Intl.NumberFormat("en-SG", {
  style: "currency",
  currency: "SGD",
  maximumFractionDigits: 0,
});

export function compactSgd(value: number) {
  return value >= 1000 ? `S$${(value / 1000).toFixed(1)}K` : money.format(value);
}

export function phoneDigits(phone: string) {
  return String(phone || "").replace(/\D/g, "");
}

export function telHref(phone: string) {
  const digits = phoneDigits(phone);
  return digits ? `tel:+${digits}` : "#";
}

export function whatsappHref(phone: string) {
  const digits = phoneDigits(phone);
  return digits ? `https://wa.me/${digits}` : "#";
}

export function isLiveLlm(source: unknown) {
  return Boolean(source) && !/fallback|cached-demo|error|deterministic/i.test(String(source));
}
