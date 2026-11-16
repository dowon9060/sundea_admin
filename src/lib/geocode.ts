export type GeocodeResult = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  provider: "naver";
};

export type ReverseGeocodeResult = {
  address: string;
  lat: number;
  lng: number;
  provider: "naver";
};

export async function searchAddress(query: string): Promise<GeocodeResult[]> {
  const { searchNaverAddress } = await import("@/lib/naver-maps");
  return searchNaverAddress(query);
}

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<ReverseGeocodeResult> {
  const { reverseNaverGeocode } = await import("@/lib/naver-maps");
  return reverseNaverGeocode(lat, lng);
}
