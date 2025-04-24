/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  webpack: (config) => {
    // This is to handle leaflet's CSS and image imports
    config.module.rules.push({
      test: /\.(png|jpg|jpeg|gif|svg|woff|woff2|eot|ttf)$/i,
      type: "asset/resource",
    });
    return config;
  },
};
