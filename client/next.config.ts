import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a minimal, self-contained server bundle (.next/standalone) —
  // this is what the Dockerfile copies into the production image, instead
  // of shipping the full node_modules tree.
  output: "standalone",

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Prevents this app from being framed by another site
          // (clickjacking protection).
          { key: "X-Frame-Options", value: "DENY" },
          // Stops the browser from guessing content types away from what
          // the server declared.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Sends the full URL as a referrer only to same-origin
          // requests; cross-origin requests only get the origin.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
          // A real Content-Security-Policy is deliberately NOT included
          // here — it needs to be built against this app's actual script/
          // font/API origins and tested end-to-end (a wrong CSP silently
          // breaks things like next/font or the Stripe redirect), which is
          // worth doing as its own careful pass rather than guessing here.
        ],
      },
    ];
  },
};

export default nextConfig;
