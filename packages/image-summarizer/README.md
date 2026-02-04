# Screenshot Summarizer CLI

A TypeScript command-line tool that sends screenshots to LM Studio for AI-powered summarization, then logs the summary to a worklog API. The tool accepts an image path and model name as arguments, extracts a timestamp from the image filename, and posts the generated summary to a local API endpoint.

## Prerequisites

### 1. Environment Setup

Create a `.env` file in the project root (hindsight directory):

```bash
LM_API_TOKEN=your_token_here
```

### 2. LM Studio SDK

This package uses the **lmstudio-js SDK** as a local file dependency (not from npm, as the npm package contains a bug). The SDK is cloned to `lmstudio-js/` at the project root by `install.sh`.

### 3. Worklog API

Ensure the API server is running at `http://localhost:3000/worklogs` that accepts POST requests with the following JSON format:

```json
{
  "timestamp": 1706745600,
  "log": "AI-generated summary text"
}
```

## Quick Start

Install dependencies and build:

```bash
npm install
npm run build
```

## Usage

### Start LM Studio

```bash
lms server start
```

Ensure the `qwen/qwen3-vl-4b` model is loaded in LM Studio.

### Run the Application

```bash
node dist/index.js <image-path> <model-name>
```

**Example:**

```bash
node dist/index.js ./test-images/1706745600.png qwen/qwen3-vl-4b
```

### Image Filename Format

Image files must follow the naming convention:
```
[unix_timestamp].[extension]
```

Examples:
- `1706745600.png`
- `1706745600.jpg`

The unix timestamp is extracted from the filename and sent to the worklog API along with the summary.

## Development

### Building

```bash
npm run build
```

This compiles TypeScript from `src/` to JavaScript in `dist/`.

### Running During Development

```bash
npm start
```

This builds and runs the application.

## Error Codes

The application uses specific exit codes for different failure scenarios:

- **Exit Code 1**: LM Studio connection failed
- **Exit Code 2**: Model failed to load
- **Exit Code 3**: Image file not found
- **Exit Code 4**: Image summarization failed
- **Exit Code 5**: Worklog API call failed
- **Exit Code 6**: Missing required arguments

All errors are written to stderr.

## Testing

All tests use the model: `qwen/qwen3-vl-4b`

**Test successful execution:**
```bash
node dist/index.js ./test-images/1706745600.png qwen/qwen3-vl-4b
```

**Test missing arguments:**
```bash
node dist/index.js
# Expected: Exit code 6
```

**Test invalid image path:**
```bash
node dist/index.js ./nonexistent.png qwen/qwen3-vl-4b
# Expected: Exit code 3
```

## Project Structure

```
.
├── src/
│   └── index.ts          # Main application code
├── dist/                 # Compiled JavaScript output
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md             # This file
```

## Important Notes

- **DO NOT** install `@lmstudio/sdk` from npm (it has a bug)
- **ONLY** use the local file dependency: `"lmstudio-js": "file:../../lmstudio-js/publish/sdk"`
- The lmstudio-js SDK must be built before use (handled by `install.sh`)
- All image filenames must contain a unix timestamp
