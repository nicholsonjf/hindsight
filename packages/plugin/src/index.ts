import { type PluginContext } from "@lmstudio/sdk";
import { configSchematics } from "./configSchematics";
import { toolsProvider } from "./toolsProvider";

// This is the entry point of the plugin. The main function is to register different components of
// the plugin, such as preprocessor, toolsProvider, etc.
//
// You do not need to modify this file unless you want to add more components to the plugin, and/or
// add custom initialization logic.

export async function main(context: PluginContext) {
  // Register the configuration schematics.
  context.withConfigSchematics(configSchematics);
  // Register the tools provider.
  context.withToolsProvider(toolsProvider);
}
