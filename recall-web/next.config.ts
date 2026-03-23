import type { NextConfig } from "next";

const ALLOWED_EXTENSION_ORIGINS = [
  "chrome-extension://higfndgibhkdcibmjdjhfnlhgckbjfif",
];

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: ["http://localhost:3000", ...ALLOWED_EXTENSION_ORIGINS].join(","),
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,POST,PUT,DELETE,OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
