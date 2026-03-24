import { Router } from "express";
import { z } from "zod";

import { getNearbyToilets } from "../services/toiletService.js";

// Route layer responsibility:
// validate external request input, then delegate the actual search logic
// to the service layer.
const nearbyQuerySchema = z.object({
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  radiusMeters: z.coerce.number().positive().max(5000).optional(),
  openNow: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((value) => {
      if (value === undefined) {
        return undefined;
      }

      return value === "true";
    }),
  toiletType: z.enum(["public", "community", "host_opened"]).optional(),
});

export const toiletsRouter = Router();

toiletsRouter.get("/nearby", async (request, response) => {
  // Query params arrive as strings, so zod coercion normalizes them into
  // numbers/booleans before the service sees them.
  const parsed = nearbyQuerySchema.safeParse(request.query);

  if (!parsed.success) {
    return response.status(400).json({
      error: "Invalid query parameters",
      details: parsed.error.flatten(),
    });
  }

  const toilets = await getNearbyToilets(parsed.data);

  return response.json({
    data: toilets,
    meta: {
      count: toilets.length,
      filters: {
        openNow: parsed.data.openNow,
        radiusMeters: parsed.data.radiusMeters ?? 1500,
        toiletType: parsed.data.toiletType,
      },
    },
  });
});
