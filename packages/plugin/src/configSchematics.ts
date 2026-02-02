import { createConfigSchematics } from "@lmstudio/sdk";

export const configSchematics = createConfigSchematics()
  .field(
    "hindsightApiUrl",
    "string",
    {
      displayName: "Hindsight API URL",
      hint: "The base URL for the Hindsight API server.",
    },
    "http://localhost:3000",
  )
  .build();
