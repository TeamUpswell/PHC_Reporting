import React, { useState, useEffect } from "react";
import { HealthcareCenter } from "../types";
import dynamic from "next/dynamic";
import L from "leaflet";

// Dynamically import the Leaflet components with no SSR
const MapWithNoSSR = dynamic(() => import("./MapContainer"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-100">
      Loading map...
    </div>
  ),
});

interface MapProps {
  centers: HealthcareCenter[];
  height?: string;
  onCenterSelect?: (center: HealthcareCenter) => void;
  onTreatmentToggle?: (centerId: string, isTreatment: boolean) => Promise<void>;
}

const Map: React.FC<MapProps> = ({
  centers,
  height = "500px",
  onCenterSelect,
  onTreatmentToggle,
}) => {
  useEffect(() => {
    console.log("Centers passed to map:", centers);
    console.log(
      "Centers with valid coordinates:",
      centers.filter(
        (c) =>
          c.coordinates &&
          Array.isArray(c.coordinates) &&
          c.coordinates.length === 2
      )
    );
  }, [centers]);

  useEffect(() => {
    // Fix Leaflet's default icon path issues
    // Use type assertion to avoid TypeScript errors
    const DefaultIcon = L.Icon.Default;
    const prototype = DefaultIcon.prototype as any;
    if (prototype._getIconUrl) {
      delete prototype._getIconUrl;
    }

    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
      shadowUrl:
        "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    });
  }, []);

  return (
    <div style={{ height, position: "relative" }}>
      <MapWithNoSSR
        centers={centers}
        onCenterSelect={onCenterSelect}
        onTreatmentToggle={onTreatmentToggle}
      />
    </div>
  );
};

export default Map;
