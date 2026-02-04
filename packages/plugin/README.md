# Hindsight LM Studio Plugin

An LM Studio plugin that allows users to query activity logs recorded by the Hindsight application. Provides tools for discovering available log data and retrieving logs for specific date ranges.

## Features

- Query available worklog counts by date
- Retrieve worklogs for specific date ranges
- Configurable API endpoint

## Requirements

- LM Studio with plugin support
- Hindsight API server running (default: `http://localhost:3000`)

## Installation

```bash
npm install
npm run dev   # Development mode
npm run push  # Publish to LM Studio registry
```

## Configuration

The plugin exposes one configuration option in LM Studio:

| Setting | Default | Description |
|---------|---------|-------------|
| `hindsightApiUrl` | `http://localhost:3000` | Base URL for the Hindsight API server |

## Tools

The plugin exposes two tools to LM Studio:

### `available_hindsight_logs`

Returns counts of available worklog entries by date. Use this to discover what activity data is available before querying for specific details.

**Parameters:**
- `offset` (optional): Number of days to look back (1-365, default: 14)

**Example response:**
```json
{
  "success": true,
  "data": {
    "counts": [
      { "date": "2024-01-15", "count": 12 },
      { "date": "2024-01-16", "count": 8 }
    ],
    "period": { "start": 1705276800, "end": 1705449600 }
  }
}
```

### `get_hindsight_logs`

Returns worklog entries for a specific date range.

**Parameters:**
- `start`: Start of date range in ISO 8601 UTC format (YYYY-MM-DDTHH:MM:SSZ)
- `end`: End of date range in ISO 8601 UTC format (YYYY-MM-DDTHH:MM:SSZ)

**Example response:**
```json
{
  "success": true,
  "data": [
    { "id": 1, "timestamp": 1705320000, "log": "Working on feature implementation" },
    { "id": 2, "timestamp": 1705323600, "log": "Code review and documentation" }
  ]
}
```

## Project Structure

```
.
├── src/
│   ├── index.ts           # Entry point, registers tools provider
│   ├── configSchematics.ts # Plugin configuration schema
│   ├── toolsProvider.ts   # Tool definitions
│   └── hindsightClient.ts # API client using ts-rest
├── package.json
└── README.md
```

## Development

The plugin uses:
- `@lmstudio/sdk` for plugin development
- `@ts-rest/core` for type-safe API client
- `zod` for parameter validation

Tools are defined using the fluent `tool()` API with Zod schemas for parameter validation.

## License

Part of the Hindsight activity tracking system.
