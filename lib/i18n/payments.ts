import type { AppLocale } from "@/stores/locale-store";

const labels = {
  en: {
    CASH: "Cash",
    KBZPAY: "KBZPay",
    WAVEPAY: "WavePay",
    AYAPAY: "AYAPay",
    BANK: "Bank",
    CREDIT: "Credit",
  },
  mm: {
    CASH: "ငွေသား",
    KBZPAY: "KBZPay",
    WAVEPAY: "WavePay",
    AYAPAY: "AYAPay",
    BANK: "ဘဏ်",
    CREDIT: "အကြွေး",
  },
} as const;

export function paymentLabel(locale: AppLocale, method: string): string {
  const table = labels[locale];
  const key = method as keyof typeof table;
  return table[key] ?? method;
}
