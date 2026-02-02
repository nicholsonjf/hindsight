# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LM Studio plugin that allows users to ask questions about activities recorded by the Hindsight application. Uses the `@lmstudio/sdk` for plugin development and Zod for parameter validation.

## Development Commands

```bash
npm run dev    # Run plugin in development mode (lms dev)
npm run push   # Publish plugin to LM Studio registry (lms push)
```

## Architecture

The plugin follows LM Studio's plugin architecture:

- **src/index.ts** - Entry point that registers configuration schematics and tools provider with the plugin context
- **src/configSchematics.ts** - Plugin configuration schema (defines `hindsightDir` setting with default `~/.hindsight`)
- **src/toolsProvider.ts** - Defines tools exposed to LM Studio (currently `available_hindsight_logs`)

## Key Patterns

- Configuration accessed via `ctl.getPluginConfig(configSchematics)`
- Tools defined using the fluent `tool()` API with Zod schemas for parameter validation
- Multi-line descriptions use the `text` template function from the SDK
