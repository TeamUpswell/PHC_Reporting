import React, { useEffect } from "react";
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
}

const Map: React.FC<MapProps> = ({ centers, height = "400px" }) => {
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
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
      shadowUrl:
        "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    });
  }, []);

  return (
    <div
      style={{
        height,
        width: "100%",
        position: "relative",
        overflow: "hidden", // Add this
      }}
      className="rounded-lg shadow-md"
    >
      <MapWithNoSSR centers={centers} />
    </div>
  );
};

export default Map;
