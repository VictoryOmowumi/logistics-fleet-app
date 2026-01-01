"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { useTheme } from "next-themes";
import type { Driver } from "@/types";

const iconUrl =
  "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png";
const iconRetinaUrl =
  "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png";
const shadowUrl =
  "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png";

const defaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const selectedIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [30, 46],
  iconAnchor: [15, 46],
});

type DriverMarker = {
  driver: Driver;
  lat: number;
  lng: number;
};

function MapCenterUpdater({
  center,
  zoom = 12,
}: {
  center: [number, number];
  zoom?: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);

  return null;
}

export interface DispatchMapProps {
  drivers: Driver[];
  selectedDriverId?: string | null;
  onDriverClick?: (driverId: string) => void;
}

export default function DispatchMap({
  drivers,
  selectedDriverId,
  onDriverClick,
}: DispatchMapProps) {
  const { resolvedTheme } = useTheme();

  const markers: DriverMarker[] = drivers
    .map((driver) => {
      const coords = (driver as any)?.location?.coordinates;
      if (!coords || coords.length !== 2) return null;
      const [lng, lat] = coords;
      if (
        typeof lat !== "number" ||
        typeof lng !== "number" ||
        Number.isNaN(lat) ||
        Number.isNaN(lng)
      ) {
        return null;
      }
      return { driver, lat, lng };
    })
    .filter((m): m is DriverMarker => m !== null);

  const fallbackCenter: [number, number] = [32.7767, -96.797]; // Dallas-ish
  const selectedMarker =
    selectedDriverId && markers.find((m) => m.driver.id === selectedDriverId);

  const center: [number, number] = selectedMarker
    ? [selectedMarker.lat, selectedMarker.lng]
    : markers.length
    ? [markers[0].lat, markers[0].lng]
    : fallbackCenter;

  const isDark = resolvedTheme === "dark";
  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const tileAttribution = isDark
    ? '&copy; <a href="https://carto.com/attributions">CARTO</a>, &copy; OpenStreetMap'
    : "&copy; OpenStreetMap contributors";

  return (
    <MapContainer
      center={center}
      zoom={12}
      style={{
        height: "100%",
        width: "100%",
      }}
      className="z-0"
    >
      <TileLayer url={tileUrl} attribution={tileAttribution} />

      <MapCenterUpdater center={center} zoom={13} />

      {markers.map(({ driver, lat, lng }) => {
        const isSelected = driver.id === selectedDriverId;

        return (
          <Marker
            key={driver.id}
            position={[lat, lng]}
            icon={isSelected ? selectedIcon : defaultIcon}
            eventHandlers={{
              click: () => onDriverClick?.(driver.id),
            }}
          >
            <Popup>
              <div className="text-xs">
                <strong>{driver.name}</strong>
                <br />
                Status: {(driver as any).status ?? "N/A"}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
