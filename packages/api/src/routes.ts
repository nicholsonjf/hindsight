import { initServer } from '@ts-rest/express';
import { contract } from './contract.js';
import * as database from './database.js';

const s = initServer();

export const router = s.router(contract, {
  createWorklog: async ({ body }) => {
    try {
      const worklog = database.createWorklog(body);
      return {
        status: 201,
        body: worklog,
      };
    } catch (error) {
      return {
        status: 400,
        body: {
          message: error instanceof Error ? error.message : 'Failed to create worklog',
        },
      };
    }
  },

  getWorklogs: async ({ query }) => {
    try {
      const worklogs = database.getWorklogs(query.start, query.end);
      return {
        status: 200,
        body: worklogs,
      };
    } catch (error) {
      return {
        status: 400,
        body: {
          message: error instanceof Error ? error.message : 'Failed to retrieve worklogs',
        },
      };
    }
  },

  getWorklogCounts: async ({ query }) => {
    try {
      const { offset } = query;

      // Calculate time range based on offset (days in the past)
      const now = Math.floor(Date.now() / 1000);
      const end = now;

      // Calculate start: offset days ago at local midnight
      const offsetDate = new Date();
      offsetDate.setDate(offsetDate.getDate() - offset);
      offsetDate.setHours(0, 0, 0, 0);
      const start = Math.floor(offsetDate.getTime() / 1000);

      // Get counts from database
      const dbCounts = database.getWorklogCountsByDay(start, end);

      // Create a map for quick lookup
      const countMap = new Map(dbCounts.map((row) => [row.day, row.count]));

      // Generate all days in the range and fill in missing days with count: 0
      const counts: { date: string; count: number }[] = [];
      const startDate = new Date(start * 1000);
      const endDate = new Date(end * 1000);

      // Start from the beginning of the start day (local time)
      const currentDate = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate()
      );
      const endDay = new Date(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate()
      );

      while (currentDate <= endDay) {
        // Format as YYYY-MM-DD in local time
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        counts.push({
          date: dateStr,
          count: countMap.get(dateStr) ?? 0,
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return {
        status: 200,
        body: {
          counts,
          period: { start, end },
        },
      };
    } catch (error) {
      return {
        status: 400,
        body: {
          message: error instanceof Error ? error.message : 'Failed to retrieve worklog counts',
        },
      };
    }
  },
});
