import express from 'express';
import path from 'path';
import fs from 'fs';
import pg from 'pg';

const { Pool } = pg;

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

// Optional PostgreSQL 16 Pool Connection
let pgPool: pg.Pool | null = null;
if (process.env.SQL_HOST) {
  try {
    pgPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER || 'appuser',
      password: process.env.SQL_PASSWORD || 'Secr3tPostgresPass!',
      database: process.env.SQL_DB_NAME || 'attendance_db',
      port: parseInt(process.env.SQL_PORT || '5432', 10),
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000
    });
    pgPool.on('error', (err) => {
      console.warn('PostgreSQL client notice (using file fallback):', err.message);
    });
  } catch (err) {
    console.warn('Could not initialize PostgreSQL connection:', err);
  }
}

// Get synced shared data across all clients
app.get('/api/sync', async (req, res) => {
  // 1. Try reading from PostgreSQL if available
  if (pgPool) {
    try {
      const usersRes = await pgPool.query('SELECT * FROM users ORDER BY created_at ASC');
      if (usersRes.rows && usersRes.rows.length > 0) {
        const groupsRes = await pgPool.query('SELECT * FROM groups').catch(() => ({ rows: [] }));
        const projectsRes = await pgPool.query('SELECT * FROM projects').catch(() => ({ rows: [] }));
        const attRes = await pgPool.query('SELECT * FROM attendance_records').catch(() => ({ rows: [] }));
        const settingsRes = await pgPool.query('SELECT * FROM system_settings WHERE id = 1').catch(() => ({ rows: [] }));

        const users = usersRes.rows.map(r => ({
          id: r.id,
          username: r.username,
          email: r.email,
          firstName: r.first_name,
          lastName: r.last_name,
          mobile: r.mobile || undefined,
          jobTitle: r.job_title || undefined,
          role: r.role || 'employee',
          groupIds: Array.isArray(r.group_ids) ? r.group_ids : (typeof r.group_ids === 'string' ? JSON.parse(r.group_ids || '[]') : []),
          isActive: r.is_active !== false,
          isArchived: Boolean(r.is_archived),
          mustChangePassword: Boolean(r.must_change_password),
          temporaryPasswordExpiry: r.temporary_password_expiry ? Number(r.temporary_password_expiry) : undefined,
          passwordHash: r.password_hash,
          createdAt: r.created_at,
          lastLoginAt: r.last_login_at
        }));

        const groups = groupsRes.rows.map(r => ({
          id: r.id,
          name: r.name,
          description: r.description || '',
          memberUserIds: Array.isArray(r.member_user_ids) ? r.member_user_ids : (typeof r.member_user_ids === 'string' ? JSON.parse(r.member_user_ids || '[]') : []),
          createdAt: r.created_at
        }));

        const projects = projectsRes.rows.map(r => ({
          id: r.id,
          title: r.title,
          description: r.description || '',
          groupIds: Array.isArray(r.group_ids) ? r.group_ids : (typeof r.group_ids === 'string' ? JSON.parse(r.group_ids || '[]') : []),
          isActive: r.is_active !== false,
          createdAt: r.created_at
        }));

        const attendance = attRes.rows.map(r => ({
          id: r.id,
          userId: r.user_id,
          type: r.type,
          projectId: r.project_id || undefined,
          date: r.date,
          gregorianDate: r.gregorian_date,
          startTime: r.start_time,
          endTime: r.end_time,
          durationMinutes: r.duration_minutes || 0,
          leaveType: r.leave_type || undefined,
          specialWorkType: r.special_work_type || undefined,
          missionDestination: r.mission_destination || undefined,
          notes: r.notes || undefined,
          createdAt: r.created_at
        }));

        let settings = undefined;
        if (settingsRes.rows && settingsRes.rows[0]) {
          const s = settingsRes.rows[0];
          settings = {
            organizationName: s.organization_name || '',
            organizationLogo: s.organization_logo || '',
            primaryColor: s.primary_color || '#2563eb',
            secondaryColor: s.secondary_color || '#0d9488',
            accentColor: s.accent_color || '#f59e0b',
            tempPasswordExpiryMinutes: s.temp_password_expiry_minutes || 60,
            leaveTypes: s.leave_types,
            specialWorkTypes: s.special_work_types,
            blockedIps: s.blocked_ips
          };
        }

        const pgPayload = { users, groups, projects, attendance, settings, updatedAt: new Date().toISOString() };
        try {
          fs.writeFileSync(dbFile, JSON.stringify(pgPayload, null, 2), 'utf-8');
        } catch {}
        return res.json(pgPayload);
      }
    } catch (pgErr: any) {
      console.warn('PostgreSQL query note (using JSON fallback):', pgErr.message);
    }
  }

  // 2. Fallback to local JSON file storage
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

// Post changes to shared server storage (persisted to file & PostgreSQL)
app.post('/api/sync', async (req, res) => {
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

    // Persist to PostgreSQL if pool is available
    if (pgPool) {
      try {
        if (Array.isArray(payload.users)) {
          for (const u of payload.users) {
            await pgPool.query(`
              INSERT INTO users (
                id, username, email, first_name, last_name, mobile, job_title, role,
                group_ids, is_active, is_archived, must_change_password, temporary_password_expiry,
                password_hash, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
              ON CONFLICT (id) DO UPDATE SET
                username = EXCLUDED.username,
                email = EXCLUDED.email,
                first_name = EXCLUDED.first_name,
                last_name = EXCLUDED.last_name,
                mobile = EXCLUDED.mobile,
                job_title = EXCLUDED.job_title,
                role = EXCLUDED.role,
                group_ids = EXCLUDED.group_ids,
                is_active = EXCLUDED.is_active,
                is_archived = EXCLUDED.is_archived,
                must_change_password = EXCLUDED.must_change_password,
                temporary_password_expiry = EXCLUDED.temporary_password_expiry,
                password_hash = EXCLUDED.password_hash;
            `, [
              u.id, u.username, u.email, u.firstName, u.lastName, u.mobile || null,
              u.jobTitle || null, u.role || 'employee', JSON.stringify(u.groupIds || []),
              u.isActive !== false, Boolean(u.isArchived), Boolean(u.mustChangePassword),
              u.temporaryPasswordExpiry ? Number(u.temporaryPasswordExpiry) : null,
              u.passwordHash || 'Employee@2026', u.createdAt || '1405/07/16'
            ]);
          }
        }

        if (Array.isArray(payload.groups)) {
          for (const g of payload.groups) {
            await pgPool.query(`
              INSERT INTO groups (id, name, description, member_user_ids, created_at)
              VALUES ($1, $2, $3, $4, $5)
              ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                member_user_ids = EXCLUDED.member_user_ids;
            `, [g.id, g.name, g.description || null, JSON.stringify(g.memberUserIds || []), g.createdAt || '1405/07/16']);
          }
        }

        if (Array.isArray(payload.projects)) {
          for (const p of payload.projects) {
            await pgPool.query(`
              INSERT INTO projects (id, title, description, group_ids, is_active, created_at)
              VALUES ($1, $2, $3, $4, $5, $6)
              ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                group_ids = EXCLUDED.group_ids,
                is_active = EXCLUDED.is_active;
            `, [p.id, p.title, p.description || null, JSON.stringify(p.groupIds || []), p.isActive !== false, p.createdAt || '1405/07/16']);
          }
        }
      } catch (pgWriteErr: any) {
        console.warn('PostgreSQL write warning (data safely preserved in clocky-db.json):', pgWriteErr.message);
      }
    }

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
