// Add a new type declaration file specifically for extending Leaflet
import * as L from "leaflet";

declare module "leaflet" {
  namespace Icon {
    interface Default {
      prototype: {
        _getIconUrl?: any;
        [key: string]: any;
      };
    }
  }
}
