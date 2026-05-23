import { onRequest } from "firebase-functions/v2/https";

export const api = onRequest(
  {
    region: "asia-east1",
  },
  (request, response) => {
    const path = request.path.replace(/^\/api\/?/, "");

    if (path === "status" || path === "") {
      response.status(200).json({
        ok: true,
        projectId: "digital-signage-menu-pim",
        environment: "dev",
        service: "functions",
      });
      return;
    }

    response.status(404).json({
      ok: false,
      error: "Not found",
    });
  },
);
