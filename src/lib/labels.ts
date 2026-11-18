import type { BusinessStatus, StoreCategory, StoreStatus } from "@/lib/types";

export const CATEGORY_LABELS: Record<StoreCategory, string> = {
  sundae: "순대차",
  bungeoppang: "붕어빵",
  dakkochi: "닭꼬치",
  mandu: "만두",
  takoyaki: "타코야키",
  chicken: "치킨·통닭",
  gopchang: "곱창",
  hotteok: "호떡",
  hoe: "회",
  other: "기타",
};

export const CATEGORY_OPTIONS: StoreCategory[] = [
  "sundae",
  "bungeoppang",
  "dakkochi",
  "mandu",
  "takoyaki",
  "chicken",
  "gopchang",
  "hotteok",
  "hoe",
  "other",
];

export const STATUS_LABELS: Record<StoreStatus, string> = {
  active: "활성",
  inactive: "비활성",
};

export const BUSINESS_STATUS_LABELS: Record<BusinessStatus, string> = {
  expected: "출몰 예상",
  confirmed_open: "영업 확인",
  unknown: "미확인",
};

export const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
