declare module "leaflet" {
  // Add a more comprehensive extension to ensure _getIconUrl is allowed
  import * as L from "@types/leaflet";

  declare module "@types/leaflet" {
    namespace Icon {
      interface Default {
        prototype: any; // Allow any properties on prototype
      }
    }
  }

  export = L;
}

// Add this inside your useEffect for icon fixes
useEffect(() => {
  // Only run on the client side
  if (typeof window === "undefined") return;

  // Use type assertion to avoid TypeScript errors
  const DefaultIcon = L.Icon.Default;
  const prototype = DefaultIcon.prototype as any;
  if (prototype._getIconUrl) {
    delete prototype._getIconUrl;
  }

  // Rest of your code...
}, []);
