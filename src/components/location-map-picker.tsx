"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER: [number, number] = [37.5665, 126.978];
const DEFAULT_ZOOM = 16;

type Props = {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
};

export function LocationMapPicker({ lat, lng, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const hasPoint = lat != null && lng != null;
    const map = L.map(containerRef.current, {
      center: hasPoint ? [lat, lng] : DEFAULT_CENTER,
      zoom: hasPoint ? DEFAULT_ZOOM : 12,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const icon = L.divIcon({
      className: "",
      html: `<div style="width:18px;height:18px;border-radius:9999px;background:#c2410c;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    const marker = L.marker(hasPoint ? [lat, lng] : DEFAULT_CENTER, {
      draggable: true,
      icon,
    }).addTo(map);

    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      onChangeRef.current(Number(pos.lat.toFixed(6)), Number(pos.lng.toFixed(6)));
    });

    map.on("click", (e: L.LeafletMouseEvent) => {
      const nextLat = Number(e.latlng.lat.toFixed(6));
      const nextLng = Number(e.latlng.lng.toFixed(6));
      marker.setLatLng([nextLat, nextLng]);
      onChangeRef.current(nextLat, nextLng);
    });

    mapRef.current = map;
    markerRef.current = marker;

    const resizeTimer = window.setTimeout(() => {
      map.invalidateSize();
    }, 80);

    return () => {
      window.clearTimeout(resizeTimer);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // mount once; external lat/lng sync handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker || lat == null || lng == null) return;
    const current = marker.getLatLng();
    if (
      Math.abs(current.lat - lat) < 0.000001 &&
      Math.abs(current.lng - lng) < 0.000001
    ) {
      return;
    }
    marker.setLatLng([lat, lng]);
    map.setView([lat, lng], Math.max(map.getZoom(), DEFAULT_ZOOM));
  }, [lat, lng]);

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div ref={containerRef} className="h-72 w-full" />
      <p className="border-t border-border bg-stone-50 px-3 py-2 text-xs text-muted">
        지도를 클릭하거나 핀을 드래그하면 좌표와 주소가 갱신됩니다. 저장을 눌러야
        앱에 반영됩니다.
      </p>
    </div>
  );
}
