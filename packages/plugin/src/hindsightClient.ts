import { initContract, initClient } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

const worklogCountsQuery = z.object({
  offset: z.coerce.number().optional(),
});

const worklogsQuery = z.object({
  start: z.coerce.number(),
  end: z.coerce.number(),
});

const unknownResponse = z.unknown();

// @ts-expect-error - ts-rest's recursive types exceed TypeScript's instantiation depth
export const hindsightContract = c.router({
  getWorklogCounts: {
    method: "GET",
    path: "/worklogs/counts",
    query: worklogCountsQuery,
    responses: {
      200: unknownResponse,
    },
  },
  getWorklogs: {
    method: "GET",
    path: "/worklogs",
    query: worklogsQuery,
    responses: {
      200: unknownResponse,
    },
  },
});

export function createHindsightClient(baseUrl: string) {
  return initClient(hindsightContract, {
    baseUrl,
    baseHeaders: { "Content-Type": "application/json" },
  });
}