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

  return [logAvailability];
}
