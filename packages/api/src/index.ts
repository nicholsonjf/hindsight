import express from 'express';
import { createExpressEndpoints } from '@ts-rest/express';
import { contract } from './contract.js';
import { router } from './routes.js';
import { initDatabase } from './database.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
initDatabase();

// Parse JSON request bodies
app.use(express.json());

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
});
