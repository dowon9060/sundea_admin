export type StoreCategory =
  | "sundae"
  | "bungeoppang"
  | "dakkochi"
  | "mandu"
  | "takoyaki"
  | "chicken"
  | "other";
export type StoreStatus = "active" | "inactive";
export type BusinessStatus = "expected" | "confirmed_open" | "unknown";

export type AdminStoreListItem = {
  id: string;
  name: string;
  category: StoreCategory;
  description: string | null;
  photo_url: string | null;
  status: StoreStatus;
  business_status: BusinessStatus;
  created_at: string;
  lat: number | null;
  lng: number | null;
  address: string | null;
  location_note: string | null;
  location_updated_at: string | null;
  region: string | null;
  menu_summary: string | null;
  like_count?: number;
};

export type AdminStoreListResponse = {
  items: AdminStoreListItem[];
  total: number;
  page: number;
  limit: number;
};

export type AdminMenu = {
  id: number;
  store_id: string;
  name: string;
  price: number;
  photo_url: string | null;
  is_available: number;
  sort_order: number;
};

export type AdminHour = {
  id: number;
  store_id: string;
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
  day_label: string;
};

export type AdminStoreDetail = AdminStoreListItem & {
  distance_m?: number | null;
  location_stale?: boolean;
  menus: AdminMenu[];
  hours: AdminHour[];
};

export type RegionCount = {
  name: string;
  count: number;
};

export type RegistrationRequest = {
  id: string;
  name: string;
  category: StoreCategory | null;
  menu: string;
  today_hours: string;
  location_text: string;
  lat: number | null;
  lng: number | null;
  has_photo_menu: boolean;
  has_photo_location: boolean;
  has_photo_truck: boolean;
  status: string;
  created_at: string;
  notified_at: string | null;
};

export type CreateStorePayload = {
  name: string;
  category: StoreCategory;
  lat: number;
  lng: number;
  address: string;
  description?: string | null;
  photo_url?: string | null;
  location_note?: string | null;
  business_status?: BusinessStatus;
  status?: StoreStatus;
  menus?: Array<{ name: string; price: number }>;
  hours?: Array<{
    day_of_week: number;
    open_time?: string | null;
    close_time?: string | null;
    is_closed: boolean;
  }>;
};

export type UpdateStorePayload = Partial<{
  name: string;
  category: StoreCategory;
  description: string | null;
  photo_url: string | null;
  status: StoreStatus;
  business_status: BusinessStatus;
  lat: number;
  lng: number;
  address: string;
  location_note: string | null;
  menus: Array<{ name: string; price: number }>;
}>;
