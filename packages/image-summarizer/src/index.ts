import { LMStudioClient } from "lmstudio-js";
import dotenv from "dotenv";
import { existsSync } from "fs";
import { basename, dirname, resolve } from "path";
import { fileURLToPath } from "url";

// Load environment variables from workspace root .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workspaceRoot = resolve(__dirname, '../../..');
dotenv.config({ path: resolve(workspaceRoot, '.env') });

// Exit codes
const EXIT_CODE_LM_STUDIO_UNAVAILABLE = 1;
const EXIT_CODE_MODEL_LOAD_FAILED = 2;
const EXIT_CODE_IMAGE_NOT_FOUND = 3;
const EXIT_CODE_SUMMARIZATION_FAILED = 4;
const EXIT_CODE_API_CALL_FAILED = 5;
const EXIT_CODE_MISSING_ARGUMENTS = 6;

// The summarization prompt
const SUMMARIZATION_PROMPT = "You're an expert at summarizing what a person is doing on their computer. Summarize what this user is working on in this screenshot in one sentence.";

/**
 * Extract unix timestamp from image filename
 * Expected format: [timestamp].[extension] (e.g., "1706745600.png")
 */
function extractTimestamp(imagePath: string): number {
  const filename = basename(imagePath);
  const timestampStr = filename.split('.')[0];
  const timestamp = parseInt(timestampStr, 10);

  if (isNaN(timestamp)) {
    console.error(`Error: Could not extract valid timestamp from filename: ${filename}`);
    process.exit(EXIT_CODE_IMAGE_NOT_FOUND);
  }

  return timestamp;
}

/**
 * Post summary to worklog API
 */
async function postToWorklogAPI(timestamp: number, summary: string, screenshotPath: string): Promise<number> {
  try {
    const response = await fetch('http://localhost:3000/worklogs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        timestamp,
        log: summary,
        screenshot_path: screenshotPath
      })
    });

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}: ${response.statusText}`);
    }

    return response.status;
  } catch (error) {
    console.error(`Error: Failed to post to worklog API: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(EXIT_CODE_API_CALL_FAILED);
  }
}

/**
 * Main application logic
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Error: Missing required arguments');
    console.error('Usage: node dist/index.js <image-path> <model-name>');
    console.error('Example: node dist/index.js ./test-images/1706745600.png qwen/qwen3-vl-4b');
    process.exit(EXIT_CODE_MISSING_ARGUMENTS);
  }

  const imagePath = args[0];
  const modelName = args[1];

  // Validate image file exists
  if (!existsSync(imagePath)) {
    console.error(`Error: Image file not found: ${imagePath}`);
    process.exit(EXIT_CODE_IMAGE_NOT_FOUND);
  }

  // Extract timestamp from filename
  const timestamp = extractTimestamp(imagePath);

  // Initialize LM Studio client
  let client: LMStudioClient;
  try {
    client = new LMStudioClient({
      baseUrl: 'ws://127.0.0.1:1234'
    });
  } catch (error) {
    console.error(`Error: Failed to connect to LM Studio: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(EXIT_CODE_LM_STUDIO_UNAVAILABLE);
  }

  // Load the model
  let model;
  try {
    model = await client.llm.model(modelName);
  } catch (error) {
    // Check if this is a connection error (LM Studio unavailable) vs model loading error
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('connect') || errorMessage.includes('WebSocket')) {
      console.error(`Error: Failed to connect to LM Studio: ${errorMessage}`);
      process.exit(EXIT_CODE_LM_STUDIO_UNAVAILABLE);
    }
    console.error(`Error: Failed to load model '${modelName}': ${errorMessage}`);
    process.exit(EXIT_CODE_MODEL_LOAD_FAILED);
  }

  // Prepare the image
  let preparedImage;
  try {
    preparedImage = await client.files.prepareImage(imagePath);
  } catch (error) {
    console.error(`Error: Failed to prepare image: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(EXIT_CODE_SUMMARIZATION_FAILED);
  }

  // Send image with prompt and get summary
  let summary: string;
  try {
    const response = await model.respond([
      {
        role: 'user',
        content: SUMMARIZATION_PROMPT,
        images: [preparedImage]
      }
    ]);

    summary = response.content.trim();

    if (!summary) {
      throw new Error('Received empty summary from model');
    }
  } catch (error) {
    console.error(`Error: Failed to generate summary: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(EXIT_CODE_SUMMARIZATION_FAILED);
  }

  // Post to worklog API (include absolute path to screenshot)
  const absoluteImagePath = resolve(imagePath);
  const statusCode = await postToWorklogAPI(timestamp, summary, absoluteImagePath);

  // Output success information
  console.log(`Success! API Response: ${statusCode}`);
  console.log(`Summary: ${summary}`);
}

// Run the application
main().catch((error) => {
  console.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
