import { initContract } from '@ts-rest/core';
import { z } from 'zod';

const c = initContract();

// Zod schema for the worklog entity
export const worklogSchema = z.object({
  id: z.number().int().positive(),
  timestamp: z.number().int(),
  log: z.string().min(1),
});

// Zod schema for creating a worklog (without id)
export const createWorklogSchema = z.object({
  timestamp: z.number().int(),
  log: z.string().min(1),
});

// Zod schema for GET query parameters
export const getWorklogsQuerySchema = z.object({
  start: z.coerce.number().int(),
  end: z.coerce.number().int(),
});

// Zod schema for GET /worklogs/counts query parameters
export const getWorklogCountsQuerySchema = z.object({
  offset: z.coerce.number().int().min(1).max(365).default(14),
});

// Zod schema for worklog counts response
export const worklogCountsResponseSchema = z.object({
  counts: z.array(
    z.object({
      date: z.string(),
      count: z.number().int().nonnegative(),
    })
  ),
  period: z.object({
    start: z.number().int(),
    end: z.number().int(),
  }),
});

// Define the API contract
export const contract = c.router({
  createWorklog: {
    method: 'POST',
    path: '/worklogs',
    responses: {
      201: worklogSchema,
      400: z.object({ message: z.string() }),
    },
    body: createWorklogSchema,
    summary: 'Create a new worklog entry',
  },
  getWorklogs: {
    method: 'GET',
    path: '/worklogs',
    responses: {
      200: z.array(worklogSchema),
      400: z.object({ message: z.string() }),
    },
    query: getWorklogsQuerySchema,
    summary: 'Retrieve worklogs within a time range',
  },
  getWorklogCounts: {
    method: 'GET',
    path: '/worklogs/counts',
    responses: {
      200: worklogCountsResponseSchema,
      400: z.object({ message: z.string() }),
    },
    query: getWorklogCountsQuerySchema,
    summary: 'Get worklog counts per day over a time period',
  },
});

// Export types derived from the contract
export type Worklog = z.infer<typeof worklogSchema>;
export type CreateWorklogRequest = z.infer<typeof createWorklogSchema>;
export type GetWorklogsQuery = z.infer<typeof getWorklogsQuerySchema>;
export type GetWorklogCountsQuery = z.infer<typeof getWorklogCountsQuerySchema>;
export type WorklogCountsResponse = z.infer<typeof worklogCountsResponseSchema>;
