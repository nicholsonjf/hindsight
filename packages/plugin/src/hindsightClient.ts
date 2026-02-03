import { initContract, initClient } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

export const hindsightContract = c.router({
  getWorklogCounts: {
    method: "GET",
    path: "/worklogs/counts",
    query: z.object({
      offset: z.coerce.number().optional(),
    }),
    responses: {
      200: z.unknown(),
    },
  },
  getWorklogs: {
    method: "GET",
    path: "/worklogs",
    query: z.object({
      start: z.coerce.number(),
      end: z.coerce.number(),
    }),
    responses: {
      200: z.unknown(),
    },
  },
});

export function createHindsightClient(baseUrl: string) {
  return initClient(hindsightContract, {
    baseUrl,
    baseHeaders: { "Content-Type": "application/json" },
  });
}