import type { BusinessStatus, StoreCategory, StoreStatus } from "@/lib/types";

export const CATEGORY_LABELS: Record<StoreCategory, string> = {
  sundae: "순대차",
  chicken: "통닭",
  other: "타코야끼",
};

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
