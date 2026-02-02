# Hindsight Screenshot Capture Script

A macOS shell script that continuously captures screenshots at user-defined intervals and passes each screenshot to a Node.js summarization program. This is the capture component of the Hindsight activity tracking system.

## Overview

This script automates the process of:
1. Capturing screenshots at regular intervals
2. Passing each screenshot to a Node.js summarization program (`summarize.ts`)
3. Cleaning up screenshots after successful processing
4. Running continuously until interrupted

## Requirements

- **macOS**: Uses the native `screencapture` command
- **Node.js**: Required to run the summarization script
- **Bash**: Standard on macOS

## Quick Start

1. **Setup the environment:**
   ```bash
   ./init.sh
   ```

2. **Run with defaults** (1-minute interval, `./screenshots/` directory):
   ```bash
   ./capture.sh
   ```

3. **Custom configuration:**
   ```bash
   # Custom directory
   ./capture.sh /path/to/screenshots/

   # Custom directory and interval (in minutes)
   ./capture.sh /path/to/screenshots/ 2

   # Short interval for testing (0.1 = 6 seconds)
   ./capture.sh ./screenshots/ 0.1
   ```

4. **Stop the script:**
   Press `Ctrl+C`

## Usage

```
./capture.sh [directory] [frequency]

Arguments:
  directory   Path where screenshots will be saved (default: ./screenshots/)
  frequency   Interval between captures in minutes (default: 1)

Flags:
  --help      Display this help message
```

## How It Works

### Screenshot Capture
- Uses `screencapture -x -m -D 1 -t png`
  - `-x`: Silent mode (no camera sound)
  - `-m`: Main display only
  - `-D 1`: Display 1
  - `-t png`: PNG format
- Files are named with Unix timestamps (e.g., `1699900000.png`)

### Processing Flow
1. Capture screenshot → `[timestamp].png`
2. Run `node summarize.ts [screenshot_path]`
3. If successful → delete screenshot
4. If failed → preserve screenshot for debugging and exit
5. Wait for specified interval
6. Repeat

### Error Handling
- Validates that `screencapture` and `node` commands exist before starting
- If `screencapture` fails: prints error, exits with code 1
- If `summarize.ts` fails: prints error, preserves screenshot, exits with code 1
- All errors include informative messages about what went wrong

## Development

### Project Structure
```
.
├── capture.sh          # Main capture script
├── summarize.ts        # Screenshot summarization program
├── init.sh            # Development environment setup
├── feature_list.json  # Comprehensive test cases
├── README.md          # This file
└── screenshots/       # Default output directory (created automatically)
```

### Testing

The project includes 30 comprehensive test cases in `feature_list.json` covering:
- Basic functionality (default arguments, custom paths, custom intervals)
- Screenshot naming and capture flags
- Directory creation and path handling
- Summarization integration
- Error handling (missing dependencies, failed commands)
- Edge cases (fractional intervals, concurrent execution, signal handling)
- User experience (help text, progress feedback, error messages)

To run manual tests:
1. Create test fixtures as needed
2. Run the script with appropriate parameters
3. Verify behavior matches expected outcomes in `feature_list.json`

### Mock summarize.ts

For testing, a mock `summarize.ts` is created by `init.sh`:
```typescript
// Mock summarize.ts for testing
const screenshotPath = process.argv[2];

if (!screenshotPath) {
    console.error('Error: No screenshot path provided');
    process.exit(1);
}

console.log(`Processing screenshot: ${screenshotPath}`);

setTimeout(() => {
    console.log(`Successfully processed: ${screenshotPath}`);
    process.exit(0);
}, 500);
```

You can modify this to test different scenarios (failures, delays, etc.).

## Success Criteria

### Functionality
- ✓ Script runs continuously until `Ctrl+C`
- ✓ Screenshots saved with correct timestamp filenames
- ✓ `summarize.ts` receives correct file path
- ✓ Screenshot deleted only after successful summarization
- ✓ Directory created automatically if missing
- ✓ Defaults work when no arguments provided

### Error Handling
- ✓ Clear error message if `screencapture` fails
- ✓ Clear error message if `node` fails
- ✓ Screenshot preserved on failure for debugging
- ✓ Non-zero exit code on any failure

## Implementation Progress

See `feature_list.json` for detailed test cases and current implementation status. Features are marked with `"passes": true` when fully implemented and tested.

## Contributing

This is a production-quality implementation with comprehensive testing. When making changes:
1. Review relevant test cases in `feature_list.json`
2. Implement the feature
3. Test thoroughly against all applicable test cases
4. Update `"passes": true` for completed features
5. Commit with descriptive messages

## License

Part of the Hindsight activity tracking system.
