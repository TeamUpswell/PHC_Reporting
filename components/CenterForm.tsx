import React, { useState, useEffect, useRef } from "react";
import { supabase, HealthcareCenter } from "../lib/supabase";

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
  onSave: () => void;
  onCancel?: () => void;
}

const CenterForm: React.FC<CenterFormProps> = ({
  center,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState<Partial<HealthcareCenter>>({
    area: "",
    name: "",
    lga: "",
    address: "",
    phone: "",
    vaccination_days: "",
    working_hours: "",
    latitude: null,
    longitude: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressSearchResults, setAddressSearchResults] = useState([]);
  const addressInputRef = useRef(null);

  useEffect(() => {
    if (center) {
      setFormData(center);
    }
  }, [center]);

  useEffect(() => {
    // Skip if we're in server-side rendering
    if (typeof window === 'undefined') return;
    
    // Check if Google Maps API is available
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      console.warn("Google Maps API not available. Address autocomplete disabled.");
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
          if (place && place.geometry && place.geometry.location) {
            setFormData((prev) => ({
              ...prev,
              address: place.formatted_address || prev.address,
              latitude: place.geometry.location.lat(),
              longitude: place.geometry.location.lng(),
            }));
          }
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

      onSave();
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
          <label className="block text-gray-700 font-medium mb-2">Name</label>
          <input
            type="text"
            name="name"
            value={formData.name || ""}
            onChange={handleInputChange}
            className="w-full border rounded-lg px-3 py-2"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">Area</label>
          <input
            type="text"
            name="area"
            value={formData.area || ""}
            onChange={handleInputChange}
            className="w-full border rounded-lg px-3 py-2"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">LGA</label>
          <input
            type="text"
            name="lga"
            value={formData.lga || ""}
            onChange={handleInputChange}
            className="w-full border rounded-lg px-3 py-2"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">Phone</label>
          <input
            type="text"
            name="phone"
            value={formData.phone || ""}
            onChange={handleInputChange}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>

        <div className="mb-4 md:col-span-2">
          <label className="block text-gray-700 font-medium mb-2">
            Address
          </label>
          <input
            ref={addressInputRef}
            type="text"
            name="address"
            value={formData.address || ""}
            onChange={handleInputChange}
            className="w-full border rounded-lg px-3 py-2"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">
            Vaccination Days
          </label>
          <input
            type="text"
            name="vaccination_days"
            value={formData.vaccination_days || ""}
            onChange={handleInputChange}
            className="w-full border rounded-lg px-3 py-2"
            placeholder="e.g., Monday, Wednesday"
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">
            Working Hours
          </label>
          <input
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
      </div>

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
