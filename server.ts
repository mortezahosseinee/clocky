import express from 'express';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '20mb' }));

// Persistent shared data file for cross-device/cross-browser multi-user synchronization
const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
  } catch (err) {
    console.error('Failed to create data directory:', err);
  }
}
const dbFile = path.join(dataDir, 'clocky-db.json');

// Get synced shared data across all clients
app.get('/api/sync', (req, res) => {
  try {
    if (fs.existsSync(dbFile)) {
      const content = fs.readFileSync(dbFile, 'utf-8');
      return res.json(JSON.parse(content));
    }
    return res.json({});
  } catch (err) {
    console.error('Error reading sync db file:', err);
    return res.status(500).json({ error: 'Failed to read sync data' });
  }
});

// Post changes to shared server storage
app.post('/api/sync', (req, res) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    let existing: any = {};
    if (fs.existsSync(dbFile)) {
      try {
        existing = JSON.parse(fs.readFileSync(dbFile, 'utf-8'));
      } catch {
        existing = {};
      }
    }

    const merged = {
      ...existing,
      ...payload,
      updatedAt: new Date().toISOString()
    };

    fs.writeFileSync(dbFile, JSON.stringify(merged, null, 2), 'utf-8');
    return res.json({ success: true, timestamp: merged.updatedAt });
  } catch (err) {
    console.error('Error writing sync db file:', err);
    return res.status(500).json({ error: 'Failed to write sync data' });
  }
});

// API health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    postgresConfigured: Boolean(process.env.SQL_HOST),
    redisConfigured: Boolean(process.env.REDIS_HOST)
  });
});

// Serve frontend static assets in production
const distPath = path.join(process.cwd(), 'dist');
app.use(express.static(distPath));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
