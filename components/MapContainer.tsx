import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  Circle,
  CircleMarker,
} from "react-leaflet";
import L from "leaflet";
import { HealthcareCenter } from "../types";
import { useEffect } from "react";
import Link from "next/link";

interface MapContainerProps {
  centers: HealthcareCenter[];
}

// Update the legend dots to match the size
const Legend = () => (
  <div
    style={{
      position: "absolute",
      bottom: "20px",
      left: "20px",
      backgroundColor: "white",
      padding: "10px",
      borderRadius: "5px",
      boxShadow: "0 1px 5px rgba(0,0,0,0.2)",
      zIndex: 1000,
    }}
  >
    <div className="text-sm font-medium mb-2">Legend</div>
    <div className="flex items-center mb-1">
      <div className="w-5 h-5 rounded-full bg-green-500 mr-2"></div>
      {/* Changed from w-4 h-4 to w-5 h-5 */}
      <span>Treatment Area</span>
    </div>
    <div className="flex items-center">
      <div className="w-5 h-5 rounded-full bg-red-500 mr-2"></div>
      {/* Changed from w-4 h-4 to w-5 h-5 */}
      <span>Standard Center</span>
    </div>
  </div>
);

// Add a MapUpdater component to force map to update
const MapUpdater = ({ center }: { center: [number, number] }) => {
  const map = useMap();

  useEffect(() => {
    map.setView(center);
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, [map, center]);

  return null;
};

const MapContent: React.FC<MapContainerProps> = ({ centers }) => {
  // Create custom icons for treatment and non-treatment areas
  const treatmentIcon = L.divIcon({
    className: "custom-marker treatment-marker",
    html: `<div style="background-color: #10B981; width: 18px; height: 18px; border-radius: 50%; border: 2px solid white;"></div>`, // Increased from 14px to 18px
    iconSize: [18, 18], // Increased from [14, 14]
    iconAnchor: [9, 9], // Increased from [7, 7] (should be half the size)
  });

  const standardIcon = L.divIcon({
    className: "custom-marker standard-marker",
    html: `<div style="background-color: #EF4444; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white;"></div>`, // Increased from 12px to 16px
    iconSize: [16, 16], // Increased from [12, 12]
    iconAnchor: [8, 8], // Increased from [6, 6] (should be half the size)
  });

  // Fix Leaflet's default icon path issues
  useEffect(() => {
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

  // Find the center of the map
  const getMapCenter = () => {
    // Default to Nigeria's approximate center if no centers
    const defaultCenter: [number, number] = [9.082, 8.6753];

    if (centers.length === 0) {
      return defaultCenter;
    }

    // Get centers with valid lat/lng
    const validCenters = centers.filter(
      (c) =>
        c.latitude !== undefined &&
        c.latitude !== null &&
        c.longitude !== undefined &&
        c.longitude !== null
    );

    if (validCenters.length === 0) {
      return defaultCenter;
    }

    // Calculate average position
    const sumLat = validCenters.reduce((sum, c) => sum + Number(c.latitude), 0);
    const sumLng = validCenters.reduce(
      (sum, c) => sum + Number(c.longitude),
      0
    );

    return [sumLat / validCenters.length, sumLng / validCenters.length] as [
      number,
      number
    ];
  };

  return (
    <MapContainer
      center={getMapCenter()}
      zoom={6}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      <MapUpdater center={getMapCenter()} />

      {/* Your dynamic markers - now using latitude and longitude fields */}
      {centers.map((center) => {
        try {
          // Check if center has valid lat/lng
          if (!center.latitude || !center.longitude) {
            return null;
          }

          const lat = Number(center.latitude);
          const lng = Number(center.longitude);

          // Validate that lat/lng are valid numbers and within range
          if (
            isNaN(lat) ||
            isNaN(lng) ||
            lat < -90 ||
            lat > 90 ||
            lng < -180 ||
            lng > 180
          ) {
            console.log(
              "Invalid coordinates for center:",
              center.id,
              center.name,
              lat,
              lng
            );
            return null;
          }

          return (
            <Marker
              key={center.id}
              position={[lat, lng]}
              icon={center.is_treatment_area ? treatmentIcon : standardIcon}
            >
              <Popup>
                <div className="min-w-[200px]">
                  <h3 className="font-bold text-lg">{center.name}</h3>
                  <p className="text-gray-600 text-sm mb-2">{center.address}</p>

                  {/* Show additional details if available */}
                  {center.state && (
                    <p className="text-sm text-gray-700">{center.state}</p>
                  )}

                  <div className="flex items-center mt-1 mb-2">
                    {center.is_treatment_area ? (
                      <span className="flex items-center text-green-600 font-medium text-sm">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                        Treatment Area
                      </span>
                    ) : (
                      <span className="flex items-center text-red-600 font-medium text-sm">
                        <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
                        Standard Center
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex space-x-2">
                    <Link
                      href={`/center/${center.id}`}
                      className="bg-gray-700 hover:bg-gray-800 text-white text-sm py-1 px-3 rounded transition-colors duration-200"
                    >
                      View Details
                    </Link>

                    <Link
                      href={`/center/edit/${center.id}`}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm py-1 px-3 rounded transition-colors duration-200"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        } catch (error) {
          console.error("Error rendering marker for center:", center.id, error);
          return null;
        }
      })}

      <Legend />
    </MapContainer>
  );
};

export default MapContent;
