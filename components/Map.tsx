import React, { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";

interface HealthcareCenter {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  state: string; // Added state property
  area: string; // Keep area for backwards compatibility
  // other fields...
}

interface MapProps {
  centers: HealthcareCenter[];
  height?: string;
  onCenterSelect?: (centerId: string) => void;
}

const Map: React.FC<MapProps> = ({
  centers = [],
  height = "500px",
  onCenterSelect,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loaderRef = useRef<Loader | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  // Use a new container for Google Maps to attach to
  useEffect(() => {
    // Create a container for Google Maps to use that's separate from React's control
    if (mapRef.current && !mapContainerRef.current) {
      const container = document.createElement("div");
      container.style.width = "100%";
      container.style.height = "100%";
      mapRef.current.appendChild(container);
      mapContainerRef.current = container;
    }

    return () => {
      // Don't remove the container, just let React handle its parent
    };
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Validate centers data
    const validCenters = centers.filter(
      (center) =>
        typeof center?.latitude === "number" &&
        typeof center?.longitude === "number" &&
        !isNaN(center.latitude) &&
        !isNaN(center.longitude)
    );

    if (validCenters.length === 0) {
      console.warn("No valid centers with coordinates to display on map");
      setError("No location data available");
      return;
    }

    // Load Google Maps API
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setError("Google Maps API key not found");
      return;
    }

    if (!loaderRef.current) {
      loaderRef.current = new Loader({
        apiKey,
        version: "weekly",
      });
    }

    let isMounted = true;
    loaderRef.current
      .load()
      .then(() => {
        if (!isMounted || !mapContainerRef.current) return;

        // Clear previous markers
        if (markersRef.current) {
          markersRef.current.forEach((marker) => marker.setMap(null));
          markersRef.current = [];
        }

        // Calculate center point of all centers
        const bounds = new google.maps.LatLngBounds();
        validCenters.forEach((center) => {
          bounds.extend({ lat: center.latitude, lng: center.longitude });
        });

        // Initialize map or reuse existing
        if (!googleMapRef.current) {
          const map = new google.maps.Map(mapContainerRef.current, {
            center: bounds.isEmpty() ? { lat: 0, lng: 0 } : bounds.getCenter(),
            zoom: 8,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
          });
          googleMapRef.current = map;
        }

        const map = googleMapRef.current;

        // Fit map to show all markers
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds);
        }

        // Add markers for each center
        validCenters.forEach((center) => {
          const marker = new google.maps.Marker({
            position: { lat: center.latitude, lng: center.longitude },
            map,
            title: center.name,
          });

          if (onCenterSelect) {
            marker.addListener("click", () => {
              if (isMounted && onCenterSelect) {
                onCenterSelect(center.id);
              }
            });
          }

          markersRef.current.push(marker);
        });

        if (isMounted) {
          setIsLoaded(true);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Error loading Google Maps:", err);
          setError("Failed to load Google Maps");
        }
      });

    // Cleanup
    return () => {
      isMounted = false;

      // Clear all markers but don't destroy the map
      if (markersRef.current) {
        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current = [];
      }
    };
  }, [centers, onCenterSelect]);

  // Complete cleanup on unmount
  useEffect(() => {
    return () => {
      if (googleMapRef.current) {
        // Just remove references but don't manipulate DOM
        googleMapRef.current = null;
      }
      markersRef.current = [];
    };
  }, []);

  if (error) {
    return (
      <div
        style={{ height, width: "100%" }}
        className="flex items-center justify-center bg-gray-100 border rounded"
      >
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div style={{ height, width: "100%" }} className="relative">
      <div
        ref={mapRef}
        style={{ height: "100%", width: "100%" }}
        className="rounded border"
      >
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <p className="text-gray-500">Loading map...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Map;
