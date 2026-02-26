import express from 'express';
import cors from 'cors';
import { createExpressEndpoints } from '@ts-rest/express';
import { contract } from './contract.js';
import { router } from './routes.js';
import { initDatabase } from './database.js';

const app = express();
const PORT = process.env.PORT || 3000;
const VERBOSE = process.env.VERBOSE === '1';

// Initialize database
initDatabase();

// Enable CORS for all origins (web dashboard runs on different port)
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Verbose request logging middleware
if (VERBOSE) {
  app.use((req, res, next) => {
    const start = Date.now();
    const timestamp = new Date().toISOString();

    // Log request
    console.log(`[${timestamp}] --> ${req.method} ${req.url}`);
    if (Object.keys(req.query).length > 0) {
      console.log(`    Query: ${JSON.stringify(req.query)}`);
    }
    if (req.body && Object.keys(req.body).length > 0) {
      console.log(`    Body: ${JSON.stringify(req.body)}`);
    }

    // Capture response
    const originalSend = res.send;
    res.send = function (body) {
      const duration = Date.now() - start;
      console.log(`[${timestamp}] <-- ${req.method} ${req.url} ${res.statusCode} (${duration}ms)`);
      return originalSend.call(this, body);
    };

    next();
  });
  console.log('Verbose logging enabled - all requests will be logged');
}

// Runtime config for clients that need to mirror .env settings.
app.get('/config', (_req, res) => {
  res.json({
    visionModel: process.env.VISION_MODEL || 'qwen/qwen3-vl-4b',
  });
});

// Create ts-rest endpoints
createExpressEndpoints(contract, router, app);

// Start server
app.listen(PORT, () => {
  console.log(`✓ Worklog API Server running on http://localhost:${PORT}`);
  console.log('');
  console.log('Available endpoints:');
  console.log(`  POST http://localhost:${PORT}/worklogs`);
  console.log(`  GET  http://localhost:${PORT}/worklogs?start=<timestamp>&end=<timestamp>`);
  console.log(`  GET  http://localhost:${PORT}/worklogs/counts?offset=<days>  (default: 14)`);
  console.log(`  GET  http://localhost:${PORT}/config`);
});
