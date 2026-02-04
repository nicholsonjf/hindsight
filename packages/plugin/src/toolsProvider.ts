import { text, tool, ToolsProviderController } from "@lmstudio/sdk";
import { z } from "zod";
import { configSchematics } from "./configSchematics";
import { createHindsightClient } from "./hindsightClient";

export async function toolsProvider(ctl: ToolsProviderController) {
  const config = ctl.getPluginConfig(configSchematics);
  const client = createHindsightClient(config.get("hindsightApiUrl"));
  const logAvailability = tool({
    name: "available_hindsight_logs",
    description: text`
      Returns counts of available Hindsight worklog entries. Use this to discover
      what activity data is available before querying for specific details.
      The offset parameter specifies how many days to look back (min: 1, max: 365).
      If the user doesn't provide a specific number of days, the default is 14.
    `,
    parameters: {
      offset: z.coerce.number().int().optional().describe("Number of days to look back (default: 14)"),
    },
    implementation: async ({ offset }, { warn }) => {
      try {
        const response = await client.getWorklogCounts({
          query: { offset },
        });

        if (response.status === 200) {
          return { success: true, data: response.body };
        }

        warn(`Hindsight API returned status ${response.status}`);
        return { success: false, error: `API returned status ${response.status}` };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        warn(`Failed to fetch Hindsight worklog counts: ${message}`);
        return { success: false, error: message };
      }
    },
  });

  const getLogs = tool({
    name: "get_hindsight_logs",
    description: text`
      Returns Hindsight worklog entries for a date range.

      Parameters start and end must be in ISO 8601 UTC format: YYYY-MM-DDTHH:MM:SSZ

      Date conversion rules:
      - The first date provided by the user is the start date
      - The second date provided is the end date
      - Convert the start date to the FIRST second of that day (00:00:00Z)
      - Convert the end date to the LAST second of that day (23:59:59Z)
      - If the user provides only one date, use that day's first second as start and last second as end
    `,
    parameters: {
      start: z.string().describe("Start of the date range in ISO 8601 UTC format (YYYY-MM-DDTHH:MM:SSZ)"),
      end: z.string().describe("End of the date range in ISO 8601 UTC format (YYYY-MM-DDTHH:MM:SSZ)"),
    },
    implementation: async ({ start, end }, { warn }) => {
      try {
        // Parse the UTC dates but interpret them as local dates
        // This matches how getWorklogCountsByDay groups by local date
        const startDate = new Date(start);
        const endDate = new Date(end);

        // Create local midnight for the start date
        const localStart = new Date(
          startDate.getUTCFullYear(),
          startDate.getUTCMonth(),
          startDate.getUTCDate(),
          0, 0, 0, 0
        );

        // Create local end-of-day for the end date
        const localEnd = new Date(
          endDate.getUTCFullYear(),
          endDate.getUTCMonth(),
          endDate.getUTCDate(),
          23, 59, 59, 999
        );

        const startTimestamp = Math.floor(localStart.getTime() / 1000);
        const endTimestamp = Math.floor(localEnd.getTime() / 1000);

        const response = await client.getWorklogs({
          query: { start: startTimestamp, end: endTimestamp },
        });

        if (response.status === 200) {
          return { success: true, data: response.body };
        }

        warn(`Hindsight API returned status ${response.status}`);
        return { success: false, error: `API returned status ${response.status}` };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        warn(`Failed to fetch Hindsight worklogs: ${message}`);
        return { success: false, error: message };
      }
    },
  });

  return [logAvailability, getLogs];
}
