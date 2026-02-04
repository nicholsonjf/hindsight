# Worklog API Server

A REST API server for storing and retrieving work logs with Unix timestamp-based querying. Built with TypeScript, Express, and SQLite for simplicity and portability.

## Features

- **Create Worklogs**: Store work log entries with Unix timestamps
- **Query by Time Range**: Retrieve logs within a specific time range
- **Daily Count Analytics**: Get worklog counts per day for time series analysis
- **Type-Safe API**: Built with ts-rest and Zod for full type safety
- **Persistent Storage**: SQLite database for reliable data persistence
- **Input Validation**: Comprehensive validation with descriptive error messages

## Technology Stack

- **Runtime**: Node.js with Express
- **Language**: TypeScript
- **Database**: SQLite via better-sqlite3
- **Validation**: Zod schemas
- **API Contract**: ts-rest for type-safe endpoints

## Quick Start

### Prerequisites

- Node.js 22.x or higher
- npm

### Setup and Run

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Or compile and run
npm run build
npm start
```

## API Endpoints

### POST /worklogs

Create a new worklog entry.

**Request Body:**
```json
{
  "timestamp": 1640995200,
  "log": "Completed initial setup"
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "timestamp": 1640995200,
  "log": "Completed initial setup"
}
```

**Validation Rules:**
- `timestamp`: Required, must be an integer (Unix timestamp)
- `log`: Required, must be a non-empty string

### GET /worklogs

Retrieve worklogs within a time range.

**Query Parameters:**
- `start`: Required, integer (Unix timestamp for range start)
- `end`: Required, integer (Unix timestamp for range end)

**Example Request:**
```bash
GET /worklogs?start=1640995000&end=1640996000
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "timestamp": 1640995200,
    "log": "Completed initial setup"
  },
  {
    "id": 2,
    "timestamp": 1640995300,
    "log": "Fixed bug in authentication"
  }
]
```

**Notes:**
- Time range is inclusive on both bounds (start <= timestamp <= end)
- Returns empty array if no logs match the range
- Results are returned in insertion order

### GET /worklogs/counts

Get the number of worklogs per day over a time period.

**Query Parameters:**
- `offset`: Optional, integer (number of days in the past to retrieve counts for). Min: 1, Max: 365, Default: 14

**Example Request:**
```bash
GET /worklogs/counts?offset=7
```

**Response (200 OK):**
```json
{
  "counts": [
    {
      "date": "2022-01-01",
      "count": 5
    },
    {
      "date": "2022-01-02",
      "count": 0
    },
    {
      "date": "2022-01-03",
      "count": 3
    }
  ],
  "period": {
    "start": 1640995000,
    "end": 1641600000
  }
}
```

**Notes:**
- Returns counts for all days in the range, including days with 0 worklogs
- Dates are formatted as YYYY-MM-DD in local timezone
- The range starts from `offset` days ago at local midnight until now
- Useful for generating time series charts and analytics

## Example Usage

### Using curl

Create a worklog entry:
```bash
curl -X POST http://localhost:3000/worklogs \
  -H 'Content-Type: application/json' \
  -d '{"timestamp": 1640995200, "log": "Completed initial setup"}'
```

Query worklogs:
```bash
curl 'http://localhost:3000/worklogs?start=1640995000&end=1640996000'
```

Get worklog counts (defaults to past 14 days):
```bash
curl 'http://localhost:3000/worklogs/counts'
```

Get worklog counts for the past 30 days:
```bash
curl 'http://localhost:3000/worklogs/counts?offset=30'
```

### Using JavaScript/TypeScript

```typescript
// Create a worklog
const response = await fetch('http://localhost:3000/worklogs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    timestamp: Date.now() / 1000 | 0,
    log: 'Completed task'
  })
});
const worklog = await response.json();

// Query worklogs
const start = 1640995000;
const end = 1640996000;
const logsResponse = await fetch(
  `http://localhost:3000/worklogs?start=${start}&end=${end}`
);
const worklogs = await logsResponse.json();

// Get worklog counts (defaults to past 14 days)
const countsResponse = await fetch('http://localhost:3000/worklogs/counts');
const counts = await countsResponse.json();

// Get worklog counts for the past 30 days
const counts30Response = await fetch('http://localhost:3000/worklogs/counts?offset=30');
const counts30 = await counts30Response.json();
```

## Error Handling

All validation errors return 400 status with descriptive error messages:

```json
{
  "message": "Validation error details"
}
```

Common validation errors:
- Missing required fields (timestamp or log)
- Invalid data types (non-integer timestamp, non-string log)
- Empty log string
- Missing query parameters (start or end)

## Database

The application uses SQLite for data persistence. The database file (`worklogs.db`) is created automatically on first run.

**Schema:**
```sql
CREATE TABLE worklogs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  log TEXT NOT NULL
);
```

Data persists across server restarts.

## Development

### Project Structure

```
.
├── src/
│   ├── index.ts         # Server entry point
│   ├── contract.ts      # ts-rest API contract
│   ├── database.ts      # Database initialization
│   └── routes.ts        # Route handlers
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript configuration
└── README.md            # This file
```

## Contributing

This project follows TypeScript best practices:
- Strict type checking
- No implicit any
- Proper error handling
- RESTful API conventions

## License

MIT
