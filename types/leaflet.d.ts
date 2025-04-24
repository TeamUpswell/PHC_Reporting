declare module "leaflet" {
  export * from "@types/leaflet";
}

// in vercel.json
{
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next",
      "config": {
        "installCommand": "npm install --save-dev @types/leaflet && npm install"
      }
    }
  ],
  "devDependencies": {
    "@types/leaflet": "^1.9.8"
    // other dependencies...
  }
}
