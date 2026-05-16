import { createFileRoute } from "@tanstack/react-router";
import { CORS_HEADERS, jsonResponse, optionsResponse } from "@/server/api/key-auth.server";

export const Route = createFileRoute("/api/public/v1/health")({
  server: {
    handlers: {
      OPTIONS: async () => optionsResponse(),
      GET: async () =>
        jsonResponse(200, {
          status: "ok",
          service: "grow-public-api",
          version: "v1",
          time: new Date().toISOString(),
        }),
    },
  },
});

// Re-export so tree-shaking doesn't drop CORS_HEADERS if unused elsewhere.
export { CORS_HEADERS };