import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { HealthcareCenter } from "../types"; // Updated import
import dynamic from "next/dynamic"; // Add this import near the top with your other imports

// Add this dynamic import to prevent SSR issues with the map
const Map = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => (
    <div className="h-72 bg-gray-100 rounded-lg flex items-center justify-center">
      Loading map...
    </div>
  ),
});

declare global {
  interface Window {
    google: {
      maps: {
        places: {
          Autocomplete: new (
            input: HTMLInputElement
          ) => google.maps.places.Autocomplete;
        };
      };
    };
  }
}

interface CenterFormProps {
  center?: HealthcareCenter;
  onSave: (center: HealthcareCenter) => void;
  onCancel: () => void;
}

const CenterForm: React.FC<CenterFormProps> = ({
  center,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState<Partial<HealthcareCenter>>({
    name: "",
    area: "",
    address: "",
    state: "",
    lga: "",
    contact_name: "",
    contact_phone: "",
    vaccination_days: "",
    working_hours: "",
    latitude: undefined, // Changed from null to undefined
    longitude: undefined, // Changed from null to undefined
    is_treatment_area: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressSearchResults, setAddressSearchResults] = useState([]);
  const addressInputRef = useRef(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (center) {
      setFormData(center);
    }
  }, [center]);

  useEffect(() => {
    // Skip if we're in server-side rendering
    if (typeof window === "undefined") return;

    // Check if Google Maps API is available
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      console.warn(
        "Google Maps API not available. Address autocomplete disabled."
      );
      return;
    }

    // Initialize autocomplete when reference is available
    if (addressInputRef.current) {
      try {
        const autocomplete = new google.maps.places.Autocomplete(
          addressInputRef.current
        );
        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();

          if (!place) {
            console.warn("No place selected");
            return;
          }

          // Extract geometry safely
          const geometry = place.geometry;
          if (!geometry || !geometry.location) {
            console.warn("Place selected with incomplete location data");
            return;
          }

          // Now these are guaranteed to be non-null
          const lat = geometry.location.lat();
          const lng = geometry.location.lng();

          setFormData((prev) => ({
            ...prev,
            address: place.formatted_address || prev.address,
            latitude: lat,
            longitude: lng,
          }));
        });
      } catch (err) {
        console.error("Error initializing Google Places Autocomplete:", err);
      }
    }
  }, []); // Empty dependency array to run once

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value ? parseFloat(value) : null,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (center?.id) {
        // Update existing center
        const { error } = await supabase
          .from("healthcare_centers")
          .update(formData)
          .eq("id", center.id);

        if (error) throw error;
      } else {
        // Add new center
        const { error } = await supabase
          .from("healthcare_centers")
          .insert([formData]);

        if (error) throw error;
      }

      onSave(formData as HealthcareCenter);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">
        {center ? "Edit Healthcare Center" : "Add New Healthcare Center"}
      </h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="mb-4">
          <label
            htmlFor="center-name"
            className="block text-gray-700 font-medium mb-2"
          >
            Name
          </label>
          <input
            id="center-name"
            type="text"
            name="name"
            value={formData.name || ""}
            onChange={handleInputChange}
            className="w-full border rounded-lg px-3 py-2"
            required
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="center-area"
            className="block text-gray-700 font-medium mb-2"
          >
            Area
          </label>
          <input
            id="center-area"
            type="text"
            name="area"
            value={formData.area || ""}
            onChange={handleInputChange}
            className="w-full border rounded-lg px-3 py-2"
            required
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="center-lga"
            className="block text-gray-700 font-medium mb-2"
          >
            LGA
          </label>
          <input
            id="center-lga"
            type="text"
            name="lga"
            value={formData.lga || ""}
            onChange={handleInputChange}
            className="w-full border rounded-lg px-3 py-2"
            required
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="center-phone"
            className="block text-gray-700 font-medium mb-2"
          >
            Phone
          </label>
          <input
            id="center-phone"
            type="text"
            name="phone"
            value={formData.phone || ""}
            onChange={handleInputChange}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>

        <div className="mb-4 md:col-span-2">
          <label
            htmlFor="center-address"
            className="block text-gray-700 font-medium mb-2"
          >
            Address
          </label>
          <input
            ref={addressInputRef}
            id="center-address"
            type="text"
            name="address"
            value={formData.address || ""}
            onChange={handleInputChange}
            className="w-full border rounded-lg px-3 py-2"
            required
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="vaccination-days"
            className="block text-gray-700 font-medium mb-2"
          >
            Vaccination Days
          </label>
          <input
            id="vaccination-days"
            type="text"
            name="vaccination_days"
            value={formData.vaccination_days || ""}
            onChange={handleInputChange}
            className="w-full border rounded-lg px-3 py-2"
            placeholder="e.g., Monday, Wednesday"
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="working-hours"
            className="block text-gray-700 font-medium mb-2"
          >
            Working Hours
          </label>
          <input
            id="working-hours"
            type="text"
            name="working_hours"
            value={formData.working_hours || ""}
            onChange={handleInputChange}
            className="w-full border rounded-lg px-3 py-2"
            placeholder="e.g., 9:00 AM - 5:00 PM"
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">
            Latitude
          </label>
          <input
            type="number"
            name="latitude"
            value={formData.latitude || ""}
            onChange={handleNumberChange}
            className="w-full border rounded-lg px-3 py-2"
            step="0.000001"
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">
            Longitude
          </label>
          <input
            type="number"
            name="longitude"
            value={formData.longitude || ""}
            onChange={handleNumberChange}
            className="w-full border rounded-lg px-3 py-2"
            step="0.000001"
          />
        </div>

        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="is_treatment_area"
              checked={formData.is_treatment_area || false}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  is_treatment_area: e.target.checked,
                })
              }
              className="mr-2 h-5 w-5 text-blue-600"
            />
            <span className="text-gray-700">Treatment Area</span>
          </label>
          <p className="mt-1 text-sm text-gray-500">
            Indicates if this center is in a designated treatment area
          </p>
        </div>

        <div className="mb-4">
          <label htmlFor="new-password" className="block text-gray-700 mb-2">
            New Password
          </label>
          <input
            id="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full px-3 py-2 border rounded ${
              password && password.length < 6 ? "border-red-500" : ""
            }`}
            required
            minLength={6}
            placeholder="Enter new password"
            aria-describedby="password-requirements"
          />
        </div>

        <div className="mb-6">
          <label htmlFor="confirm-password" className="block text-gray-700 mb-2">
            Confirm Password
          </label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            required
            placeholder="Confirm your new password"
          />
        </div>
      </div>

      {/* Add a map to show the location if coordinates are available */}
      {formData.latitude && formData.longitude ? (
        <div className="mt-6 bg-white shadow-md rounded-lg overflow-hidden">
          <h2 className="text-lg font-medium px-4 py-3 bg-gray-50 border-b">
            Center Location
          </h2>
          <div className="h-72">
            <Map
              centers={[formData as HealthcareCenter]}
              height="100%"
              onCenterSelect={() => {}}
            />
          </div>
        </div>
      ) : (
        <div className="mt-6 p-4 bg-gray-50 text-gray-500 rounded-lg text-center">
          No location coordinates available
        </div>
      )}

      <div className="flex justify-end space-x-4 mt-6">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          disabled={loading}
        >
          {loading ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
};

export default CenterForm;
