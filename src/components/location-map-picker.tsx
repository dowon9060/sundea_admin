"use client";

import { useEffect, useRef } from "react";
import { loadNaverMaps } from "@/lib/naver-maps";

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };
const DEFAULT_ZOOM = 16;

type Props = {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  heightClass?: string;
};

export function LocationMapPicker({
  lat,
  lng,
  onChange,
  heightClass = "h-72",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<naver.maps.Map | null>(null);
  const markerRef = useRef<naver.maps.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const listenersRef = useRef<naver.maps.MapEventListener[]>([]);

  const pointRef = useRef({ lat, lng });

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    pointRef.current = { lat, lng };
  }, [lat, lng]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const maps = await loadNaverMaps();
        if (cancelled || !containerRef.current) return;

        const point = pointRef.current;
        const hasPoint = point.lat != null && point.lng != null;
        const center = new maps.LatLng(
          hasPoint ? point.lat! : DEFAULT_CENTER.lat,
          hasPoint ? point.lng! : DEFAULT_CENTER.lng,
        );

        const map = new maps.Map(containerRef.current, {
          center,
          zoom: hasPoint ? DEFAULT_ZOOM : 12,
          zoomControl: true,
          zoomControlOptions: {
            position: maps.Position.TOP_RIGHT,
          },
        });

        const marker = new maps.Marker({
          position: center,
          map,
          draggable: true,
          icon: {
            content:
              '<div style="width:18px;height:18px;border-radius:9999px;background:#c2410c;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>',
            anchor: new maps.Point(9, 9),
          },
        });

        const emit = (nextLat: number, nextLng: number) => {
          onChangeRef.current(
            Number(nextLat.toFixed(6)),
            Number(nextLng.toFixed(6)),
          );
        };

        const readLatLng = (coord: naver.maps.Coord) => {
          if (coord instanceof maps.LatLng) {
            return { lat: coord.lat(), lng: coord.lng() };
          }
          const point = coord as naver.maps.Point;
          return { lat: point.y, lng: point.x };
        };

        listenersRef.current = [
          maps.Event.addListener(marker, "dragend", () => {
            const pos = readLatLng(marker.getPosition());
            emit(pos.lat, pos.lng);
          }),
          maps.Event.addListener(map, "click", (e: naver.maps.PointerEvent) => {
            const pos = readLatLng(e.coord);
            const next = new maps.LatLng(pos.lat, pos.lng);
            marker.setPosition(next);
            emit(pos.lat, pos.lng);
          }),
        ];

        mapRef.current = map;
        markerRef.current = marker;
      } catch {
        // 상위 AddressLocationFields에서 메시지 표시
      }
    })();

    return () => {
      cancelled = true;
      if (listenersRef.current.length > 0 && window.naver?.maps) {
        window.naver.maps.Event.removeListener(listenersRef.current);
      }
      listenersRef.current = [];
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker || lat == null || lng == null || !window.naver?.maps) {
      return;
    }
    const maps = window.naver.maps;
    const current = marker.getPosition();
    const curLat =
      current instanceof maps.LatLng ? current.lat() : (current as naver.maps.Point).y;
    const curLng =
      current instanceof maps.LatLng ? current.lng() : (current as naver.maps.Point).x;
    if (Math.abs(curLat - lat) < 0.000001 && Math.abs(curLng - lng) < 0.000001) {
      return;
    }
    const next = new maps.LatLng(lat, lng);
    marker.setPosition(next);
    map.setCenter(next);
    if (map.getZoom() < DEFAULT_ZOOM) map.setZoom(DEFAULT_ZOOM);
  }, [lat, lng]);

  return (
    <div className="relative z-0 overflow-hidden rounded-md border border-border">
      <div ref={containerRef} className={`${heightClass} w-full`} />
      <p className="border-t border-border bg-stone-50 px-3 py-2 text-xs text-muted">
        지도를 클릭하거나 핀을 드래그하면 위치와 주소가 함께 바뀝니다.
      </p>
    </div>
  );
}
