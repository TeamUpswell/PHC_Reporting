import React, { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { HealthcareCenter } from "../types";

interface MapContainerProps {
  centers: HealthcareCenter[];
  onCenterSelect?: (center: HealthcareCenter) => void;
  onTreatmentToggle?: (centerId: string, isTreatment: boolean) => Promise<void>;
  showTreatmentOnly?: boolean; // Add this new prop
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
      <span>Treatment Area</span>
    </div>
    <div className="flex items-center">
      <div className="w-5 h-5 rounded-full bg-red-500 mr-2"></div>
      <span>Standard Center</span>
    </div>
  </div>
);

// Add a MapUpdater component to force map to update
const MapUpdater = ({ center }: { center: [number, number] }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // Check if map container exists and is properly initialized
    if (!map.getContainer() || !map.getContainer().offsetParent) {
      return;
    }

    map.setView(center);

    // Use a longer delay and check if map is still valid
    const timeoutId = setTimeout(() => {
      try {
        // Check if map is still mounted before invalidating
        if (map.getContainer() && map.getContainer().offsetParent) {
          map.invalidateSize();
        }
      } catch (error) {
        console.warn("Map invalidateSize failed:", error);
      }
    }, 200); // Increased delay

    // Cleanup timeout on unmount
    return () => clearTimeout(timeoutId);
  }, [map, center]);

  return null;
};

// Create a Filter Control component that will appear in the top-right corner
const FilterControl = ({
  showTreatmentOnly,
  onToggle,
}: {
  showTreatmentOnly: boolean;
  onToggle: () => void;
}) => (
  <div
    style={{
      position: "absolute",
      top: "20px",
      right: "20px",
      backgroundColor: "white",
      padding: "10px",
      borderRadius: "5px",
      boxShadow: "0 1px 5px rgba(0,0,0,0.2)",
      zIndex: 1000,
    }}
  >
    <label className="flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={showTreatmentOnly}
        onChange={onToggle}
        className="mr-2 h-4 w-4"
      />
      <span className="text-sm font-medium">Show treatment centers only</span>
    </label>
  </div>
);

// Update the MapMarkers component to filter centers based on the prop
const MapMarkers: React.FC<MapContainerProps> = ({
  centers,
  onCenterSelect,
  onTreatmentToggle,
  showTreatmentOnly = false, // Default to showing all centers
}) => {
  const map = useMap();
  const markersRef = useRef<L.Marker[]>([]);

  // Remove all existing markers when component unmounts or dependencies change
  useEffect(() => {
    return () => {
      if (markersRef.current) {
        markersRef.current.forEach((marker) => {
          if (marker) marker.remove();
        });
        markersRef.current = [];
      }
    };
  }, []);

  // Create the markers outside of React's state system to avoid issues
  useEffect(() => {
    // First clean up any existing markers
    if (markersRef.current) {
      markersRef.current.forEach((marker) => {
        if (marker) marker.remove();
      });
    }
    markersRef.current = [];

    if (!map) return;

    // Use a small timeout to ensure the map is fully initialized
    setTimeout(() => {
      // Filter centers if showTreatmentOnly is true
      const centersToShow = showTreatmentOnly
        ? centers.filter((center) => center.is_treatment_area)
        : centers;

      // Create marker elements for each center
      centersToShow.forEach((center) => {
        if (!center.latitude || !center.longitude) return;

        try {
          // Simplify marker creation
          const icon = center.is_treatment_area
            ? L.divIcon({
                className: "custom-marker treatment-marker",
                html: `<div style="background-color: #10B981; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white;"></div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10],
              })
            : L.divIcon({
                className: "custom-marker standard-marker",
                html: `<div style="background-color: #EF4444; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white;"></div>`,
                iconSize: [18, 18],
                iconAnchor: [9, 9],
              });

          // Create a simple marker with the icon
          const marker = L.marker(
            [Number(center.latitude), Number(center.longitude)],
            {
              icon: icon,
              interactive: true,
              bubblingMouseEvents: false,
            }
          );

          // Create popup content with a clickable link
          const popupContent = document.createElement("div");
          popupContent.className = "map-popup p-3";

          // Create the popup HTML content
          popupContent.innerHTML = `
            <h3 class="font-bold text-lg mb-2">${center.name}</h3>
            <p class="text-sm text-gray-600 mb-1">${
              center.address || "No address provided"
            }</p>
            ${
              center.lga ? `<p class="text-sm mb-1">LGA: ${center.lga}</p>` : ""
            }
            ${
              center.state
                ? `<p class="text-sm mb-1">State: ${center.state}</p>`
                : ""
            }
            
            <div class="flex items-center mt-2 mb-2">
              <input 
                type="checkbox" 
                id="treatment-toggle-${center.id}" 
                class="treatment-toggle mr-2" 
                ${center.is_treatment_area ? "checked" : ""}
              />
              <label for="treatment-toggle-${
                center.id
              }" class="text-sm cursor-pointer">
                Treatment Area
              </label>
            </div>
            
            <div class="mt-3">
              <a 
                href="/center/${center.id}" 
                class="inline-block px-3 py-2 w-full text-center bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium text-sm rounded"
                style="text-decoration: none; cursor: pointer;"
              >
                View Details
              </a>
            </div>
          `;

          // Create and bind popup with specific options
          const popup = L.popup({
            closeButton: true,
            className: "custom-popup",
            maxWidth: 300,
            autoPan: true, // Enable auto-panning to keep popup in view
            autoPanPaddingTopLeft: L.point(50, 50), // Add padding from the edges
            autoPanPaddingBottomRight: L.point(50, 50), // Add padding from the edges
            keepInView: true, // Keep the popup within the map view
            closeOnClick: false, // Prevent closing when clicking elsewhere
            closeOnEscapeKey: true, // Allow closing with Escape key
          }).setContent(popupContent);

          marker.bindPopup(popup);

          // Add event listener to the checkbox after popup opens
          marker.on("popupopen", function () {
            const checkbox = document.getElementById(
              `treatment-toggle-${center.id}`
            );
            if (checkbox && onTreatmentToggle) {
              // Remove any existing event listeners to avoid duplicates
              const newCheckbox = checkbox.cloneNode(true);
              checkbox.parentNode?.replaceChild(newCheckbox, checkbox);

              newCheckbox.addEventListener("change", async function (e) {
                // Prevent default behavior and stop propagation
                e.preventDefault();
                e.stopPropagation();

                // Save map center and zoom before any operations
                const currentCenter = map.getCenter();
                const currentZoom = map.getZoom();
                const currentLatLng = marker.getLatLng();

                // Disable map dragging temporarily
                const wasMovable = map.dragging.enabled();
                map.dragging.disable();

                // Get the current state of the checkbox
                const isChecked = (e.target as HTMLInputElement).checked;

                try {
                  // Call the handler to update the treatment status
                  await onTreatmentToggle(center.id, isChecked);

                  // Update UI without closing popup or moving map
                  const newIcon = isChecked
                    ? L.divIcon({
                        className: "custom-marker treatment-marker",
                        html: `<div style="background-color: #10B981; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white;"></div>`,
                        iconSize: [20, 20],
                        iconAnchor: [10, 10],
                      })
                    : L.divIcon({
                        className: "custom-marker standard-marker",
                        html: `<div style="background-color: #EF4444; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white;"></div>`,
                        iconSize: [18, 18],
                        iconAnchor: [9, 9],
                      });

                  // Update the icon without moving anything
                  marker.setIcon(newIcon);
                  marker.setLatLng(currentLatLng);

                  // Update label
                  const label = (e.target as HTMLInputElement)
                    .nextElementSibling;
                  if (label) {
                    if (isChecked) {
                      label.classList.add("text-green-600", "font-medium");
                      label.classList.remove("text-gray-500");
                      label.textContent = "Treatment Area ✓";
                    } else {
                      label.classList.add("text-gray-500");
                      label.classList.remove("text-green-600", "font-medium");
                      label.textContent = "Treatment Area";
                    }
                  }

                  // After everything is done, ensure the map hasn't moved
                  map.setView(currentCenter, currentZoom, { animate: false });
                } catch (error) {
                  console.error("Failed to update treatment status:", error);
                  // Reset checkbox if the update failed
                  (newCheckbox as HTMLInputElement).checked =
                    center.is_treatment_area || false; // Add "|| false" to ensure it's always a boolean
                  alert("Failed to update treatment status. Please try again.");
                } finally {
                  // Re-enable map dragging if it was enabled before
                  if (wasMovable) {
                    map.dragging.enable();
                  }

                  // Force popup to stay open and make sure it's properly positioned
                  setTimeout(() => {
                    marker.openPopup();
                    map.setView(currentCenter, currentZoom, { animate: false });
                  }, 50);
                }

                // Return false to prevent any default behavior
                return false;
              });
            }
          });

          // Update the marker click handler to force the map to recenter
          marker.on("click", function () {
            // First, pan the map to center on this marker
            map.panTo([Number(center.latitude), Number(center.longitude)], {
              animate: true,
              duration: 0.5,
            });

            // Add a small delay before opening the popup to ensure smooth animation
            setTimeout(() => {
              marker.openPopup();
            }, 100);
          });

          // Add mouseover effect for better feedback
          marker.on("mouseover", function () {
            marker.setZIndexOffset(1000);

            // Type-safe access to the icon element
            const icon = marker.getElement();
            if (icon && icon instanceof HTMLElement) {
              icon.style.transform += " scale(1.2)";
              icon.style.transition = "transform 0.2s";
            }
          });

          marker.on("mouseout", function () {
            marker.setZIndexOffset(0);

            // Type-safe access to the icon element
            const icon = marker.getElement();
            if (icon && icon instanceof HTMLElement) {
              icon.style.transform = icon.style.transform.replace(
                " scale(1.2)",
                ""
              );
            }
          });

          // Add to map and store reference
          marker.addTo(map);
          markersRef.current.push(marker);

          // Force marker to update in the DOM
          setTimeout(() => {
            const icon = marker.getElement();
            if (icon && icon instanceof HTMLElement) {
              icon.style.zIndex = "1000";
              icon.style.pointerEvents = "auto";
            }
          }, 100);
        } catch (error) {
          console.error("Error creating marker:", error);
        }
      });
    }, 100);
  }, [map, centers, onCenterSelect, onTreatmentToggle, showTreatmentOnly]); // Add showTreatmentOnly to dependencies

  return null;
};

// Main component that renders the map container
const MapContent: React.FC<MapContainerProps> = (props) => {
  const [showTreatmentOnly, setShowTreatmentOnly] = useState(false);

  // Find the center of the map
  const getMapCenter = (): [number, number] => {
    // Default to Nigeria's approximate center if no centers
    const defaultCenter: [number, number] = [9.082, 8.6753];

    if (props.centers.length === 0) {
      return defaultCenter;
    }

    // Get centers with valid lat/lng
    const validCenters = props.centers.filter(
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

  // Fix: Return the MapContainer directly instead of wrapping it in another div
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

      {/* Use filtered centers based on showTreatmentOnly */}
      <MapMarkers
        {...props}
        centers={
          showTreatmentOnly
            ? props.centers.filter((center) => center.is_treatment_area)
            : props.centers
        }
      />

      <MapUpdater center={getMapCenter()} />
      <Legend />

      {/* Add FilterControl as a child of MapContainer */}
      <div className="leaflet-top leaflet-right">
        <div className="leaflet-control leaflet-bar p-2 bg-white rounded shadow-md">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showTreatmentOnly}
              onChange={() => setShowTreatmentOnly(!showTreatmentOnly)}
              className="mr-2 h-4 w-4"
            />
            <span className="text-sm font-medium whitespace-nowrap">
              Treatment centers only
            </span>
          </label>
        </div>
      </div>
    </MapContainer>
  );
};

export default MapContent;
// Updated popup behavior
