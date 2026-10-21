import express from 'express';
import path from 'path';
import fs from 'fs';
import pg from 'pg';

const { Pool } = pg;

const app = express();
const isProd = process.env.NODE_ENV === 'production';
const PORT = parseInt(!isProd ? '3000' : (process.env.PORT || '8080'), 10);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
    // Ensure avatar column exists in database
    pgPool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;').catch(() => {});
    // Ensure chat_messages table exists in database
    pgPool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id VARCHAR(64) PRIMARY KEY,
        sender_id VARCHAR(64),
        sender_name VARCHAR(150) NOT NULL,
        sender_avatar TEXT,
        receiver_id VARCHAR(64) NOT NULL,
        receiver_type VARCHAR(32) NOT NULL DEFAULT 'direct',
        text TEXT NOT NULL,
        attachment JSONB,
        reply_to JSONB,
        timestamp VARCHAR(64) NOT NULL,
        timestamp_fa VARCHAR(32) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'sent',
        read_by JSONB DEFAULT '[]'::jsonb
      );
    `).catch(() => {});
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
          lastLoginAt: r.last_login_at,
          avatar: r.avatar || undefined
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

        let existingFile: any = {};
        if (fs.existsSync(dbFile)) {
          try { existingFile = JSON.parse(fs.readFileSync(dbFile, 'utf-8')); } catch { existingFile = {}; }
        }

        const pgPayload = {
          users,
          groups,
          projects,
          attendance,
          settings,
          activeTimers: existingFile.activeTimers || {},
          sessions: existingFile.sessions || [],
          updatedAt: new Date().toISOString()
        };
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

    // Merge sessions carefully so sessions from different devices don't overwrite each other
    let mergedSessions: any[] = Array.isArray(existing.sessions) ? [...existing.sessions] : [];
    if (Array.isArray(payload.sessions)) {
      for (const incoming of payload.sessions) {
        const idx = mergedSessions.findIndex(s => s.id === incoming.id);
        if (idx >= 0) {
          mergedSessions[idx] = { ...mergedSessions[idx], ...incoming };
        } else {
          mergedSessions.unshift(incoming);
        }
      }
    }

    const merged = {
      ...existing,
      ...payload,
      activeTimers: payload.activeTimers ? { ...existing.activeTimers, ...payload.activeTimers } : existing.activeTimers,
      sessions: mergedSessions,
      updatedAt: new Date().toISOString()
    };

    fs.writeFileSync(dbFile, JSON.stringify(merged, null, 2), 'utf-8');

    // Persist to PostgreSQL if pool is available
    if (pgPool) {
      try {
        if (Array.isArray(payload.users)) {
          for (const u of payload.users) {
            try {
              await pgPool.query(`
                INSERT INTO users (
                  id, username, email, first_name, last_name, mobile, job_title, role,
                  group_ids, is_active, is_archived, must_change_password, temporary_password_expiry,
                  password_hash, created_at, avatar
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, $13, $14, $15, $16)
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
                  password_hash = EXCLUDED.password_hash,
                  avatar = COALESCE(EXCLUDED.avatar, users.avatar);
              `, [
                u.id, u.username, u.email, u.firstName, u.lastName, u.mobile || null,
                u.jobTitle || null, u.role || 'employee', JSON.stringify(u.groupIds || []),
                u.isActive !== false, Boolean(u.isArchived), Boolean(u.mustChangePassword),
                u.temporaryPasswordExpiry ? Number(u.temporaryPasswordExpiry) : null,
                u.passwordHash || 'Employee@2026', u.createdAt || '1405/07/16',
                u.avatar || null
              ]);
            } catch (uErr: any) {
              if (uErr.code === '23505') {
                // If unique conflict on username with different ID, update by username
                try {
                  await pgPool.query(`
                    UPDATE users SET
                      email = $2, first_name = $3, last_name = $4, mobile = $5,
                      job_title = $6, role = $7, group_ids = $8::jsonb, is_active = $9,
                      is_archived = $10, must_change_password = $11, temporary_password_expiry = $12,
                      password_hash = $13,
                      avatar = COALESCE($14, users.avatar)
                    WHERE username = $1;
                  `, [
                    u.username, u.email, u.firstName, u.lastName, u.mobile || null,
                    u.jobTitle || null, u.role || 'employee', JSON.stringify(u.groupIds || []),
                    u.isActive !== false, Boolean(u.isArchived), Boolean(u.mustChangePassword),
                    u.temporaryPasswordExpiry ? Number(u.temporaryPasswordExpiry) : null,
                    u.passwordHash || 'Employee@2026',
                    u.avatar || null
                  ]);
                } catch {}
              }
            }
          }
        }

        if (Array.isArray(payload.groups)) {
          for (const g of payload.groups) {
            try {
              await pgPool.query(`
                INSERT INTO groups (id, name, description, member_user_ids, created_at)
                VALUES ($1, $2, $3, $4::jsonb, $5)
                ON CONFLICT (id) DO UPDATE SET
                  name = EXCLUDED.name,
                  description = EXCLUDED.description,
                  member_user_ids = EXCLUDED.member_user_ids;
              `, [g.id, g.name, g.description || null, JSON.stringify(g.memberUserIds || []), g.createdAt || '1405/07/16']);
            } catch {}
          }
        }

        if (Array.isArray(payload.deletedGroupIds) && payload.deletedGroupIds.length > 0) {
          try {
            await pgPool.query('DELETE FROM groups WHERE id = ANY($1)', [payload.deletedGroupIds]);
          } catch {}
        }

        if (Array.isArray(payload.deletedProjectIds) && payload.deletedProjectIds.length > 0) {
          try {
            await pgPool.query('DELETE FROM projects WHERE id = ANY($1)', [payload.deletedProjectIds]);
          } catch {}
        }

        if (Array.isArray(payload.projects)) {
          for (const p of payload.projects) {
            try {
              await pgPool.query(`
                INSERT INTO projects (id, title, description, group_ids, is_active, created_at)
                VALUES ($1, $2, $3, $4::jsonb, $5, $6)
                ON CONFLICT (id) DO UPDATE SET
                  title = EXCLUDED.title,
                  description = EXCLUDED.description,
                  group_ids = EXCLUDED.group_ids,
                  is_active = EXCLUDED.is_active;
              `, [p.id, p.title, p.description || null, JSON.stringify(p.groupIds || []), p.isActive !== false, p.createdAt || '1405/07/16']);
            } catch {}
          }
        }

        if (Array.isArray(payload.deletedAttendanceIds) && payload.deletedAttendanceIds.length > 0) {
          try {
            await pgPool.query('DELETE FROM attendance_records WHERE id = ANY($1)', [payload.deletedAttendanceIds]);
          } catch {}
        }

        if (Array.isArray(payload.attendance)) {
          for (const a of payload.attendance) {
            try {
              await pgPool.query(`
                INSERT INTO attendance_records (
                  id, user_id, type, project_id, date, gregorian_date,
                  start_time, end_time, duration_minutes, leave_type,
                  special_work_type, mission_destination, notes, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                ON CONFLICT (id) DO UPDATE SET
                  user_id = EXCLUDED.user_id,
                  type = EXCLUDED.type,
                  project_id = EXCLUDED.project_id,
                  date = EXCLUDED.date,
                  gregorian_date = EXCLUDED.gregorian_date,
                  start_time = EXCLUDED.start_time,
                  end_time = EXCLUDED.end_time,
                  duration_minutes = EXCLUDED.duration_minutes,
                  leave_type = EXCLUDED.leave_type,
                  special_work_type = EXCLUDED.special_work_type,
                  mission_destination = EXCLUDED.mission_destination,
                  notes = EXCLUDED.notes;
              `, [
                a.id, a.userId, a.type, a.projectId || null, a.date,
                a.gregorianDate || new Date().toISOString().slice(0, 10),
                a.startTime || '08:00', a.endTime || '17:00',
                a.durationMinutes || 0, a.leaveType || null,
                a.specialWorkType || null, a.missionDestination || null,
                a.notes || null, a.createdAt || '1405/07/16'
              ]);
            } catch {}
          }
        }

        if (payload.settings && typeof payload.settings === 'object') {
          const s = payload.settings;
          try {
            await pgPool.query(`
              INSERT INTO system_settings (
                id, organization_name, organization_logo, primary_color, secondary_color,
                accent_color, temp_password_expiry_minutes, leave_types, special_work_types, blocked_ips
              ) VALUES (1, $1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb)
              ON CONFLICT (id) DO UPDATE SET
                organization_name = EXCLUDED.organization_name,
                organization_logo = EXCLUDED.organization_logo,
                primary_color = EXCLUDED.primary_color,
                secondary_color = EXCLUDED.secondary_color,
                accent_color = EXCLUDED.accent_color,
                temp_password_expiry_minutes = EXCLUDED.temp_password_expiry_minutes,
                leave_types = EXCLUDED.leave_types,
                special_work_types = EXCLUDED.special_work_types,
                blocked_ips = EXCLUDED.blocked_ips;
            `, [
              s.organizationName || 'شرکت مهندسی و نوآوری داده‌پرداز',
              s.organizationLogo || '',
              s.primaryColor || '#2563eb',
              s.secondaryColor || '#0d9488',
              s.accentColor || '#f59e0b',
              s.tempPasswordExpiryMinutes || 60,
              JSON.stringify(s.leaveTypes || []),
              JSON.stringify(s.specialWorkTypes || []),
              JSON.stringify(s.blockedIps || [])
            ]);
          } catch {}
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

// Live Stopwatch Active Timer endpoint across all devices
app.post('/api/active-timer', (req, res) => {
  try {
    const { userId, activeTimer } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    let existing: any = {};
    if (fs.existsSync(dbFile)) {
      try { existing = JSON.parse(fs.readFileSync(dbFile, 'utf-8')); } catch { existing = {}; }
    }

    if (!existing.activeTimers) existing.activeTimers = {};
    if (activeTimer) {
      existing.activeTimers[userId] = activeTimer;
    } else {
      delete existing.activeTimers[userId];
    }

    fs.writeFileSync(dbFile, JSON.stringify(existing, null, 2), 'utf-8');
    return res.json({ success: true, activeTimer: existing.activeTimers[userId] || null });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update active timer' });
  }
});

app.get('/api/active-timer/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    let existing: any = {};
    if (fs.existsSync(dbFile)) {
      try { existing = JSON.parse(fs.readFileSync(dbFile, 'utf-8')); } catch { existing = {}; }
    }
    return res.json({ activeTimer: existing.activeTimers?.[userId] || null });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to get active timer' });
  }
});

function extractClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first.replace(/^::ffff:/, '');
  }
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.length > 0) {
    return realIp.trim().replace(/^::ffff:/, '');
  }
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string' && cfIp.length > 0) {
    return cfIp.trim().replace(/^::ffff:/, '');
  }
  const clientIpHeader = req.headers['x-client-ip'];
  if (typeof clientIpHeader === 'string' && clientIpHeader.length > 0) {
    return clientIpHeader.trim().replace(/^::ffff:/, '');
  }
  if (req.body && req.body.clientIp && typeof req.body.clientIp === 'string') {
    return req.body.clientIp.trim().replace(/^::ffff:/, '');
  }
  let rawIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
  return rawIp.replace(/^::ffff:/, '');
}

// Client IP detection endpoint (assists clients behind Kerio Control / reverse proxy)
app.get('/api/my-ip', (req, res) => {
  const ip = extractClientIp(req);
  res.json({ ip });
});

// Direct avatar update endpoint for instant server persistence
app.post('/api/users/:userId/avatar', async (req, res) => {
  try {
    const { userId } = req.params;
    const { avatar } = req.body;
    let existing: any = {};
    if (fs.existsSync(dbFile)) {
      try { existing = JSON.parse(fs.readFileSync(dbFile, 'utf-8')); } catch { existing = {}; }
    }
    if (Array.isArray(existing.users)) {
      const u = existing.users.find((user: any) => user.id === userId);
      if (u) {
        u.avatar = avatar;
        fs.writeFileSync(dbFile, JSON.stringify(existing, null, 2), 'utf-8');
      }
    }
    if (pgPool) {
      await pgPool.query('UPDATE users SET avatar = $1 WHERE id = $2', [avatar, userId]).catch(() => {});
    }
    res.json({ success: true, avatar });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// User sessions synchronization across devices
app.get('/api/sessions', (req, res) => {
  try {
    let existing: any = {};
    if (fs.existsSync(dbFile)) {
      try { existing = JSON.parse(fs.readFileSync(dbFile, 'utf-8')); } catch { existing = {}; }
    }
    return res.json({ sessions: existing.sessions || [] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to get sessions' });
  }
});

app.post('/api/sessions', (req, res) => {
  try {
    const { session, terminateSessionId, terminateOtherUserId, currentSessionId } = req.body;
    let existing: any = {};
    if (fs.existsSync(dbFile)) {
      try { existing = JSON.parse(fs.readFileSync(dbFile, 'utf-8')); } catch { existing = {}; }
    }
    let sessions: any[] = Array.isArray(existing.sessions) ? existing.sessions : [];

    if (session) {
      if (!session.ip || session.ip === '127.0.0.1' || session.ip === '192.168.1.105') {
        const detected = extractClientIp(req);
        if (detected && detected !== '127.0.0.1') {
          session.ip = detected;
        }
      }
      const idx = sessions.findIndex(s => s.id === session.id);
      if (idx >= 0) sessions[idx] = session;
      else sessions.unshift(session);
    }

    if (terminateSessionId) {
      sessions = sessions.map(s => s.id === terminateSessionId ? { ...s, isActive: false } : s);
    }

    if (terminateOtherUserId && currentSessionId) {
      sessions = sessions.map(s => (s.userId === terminateOtherUserId && s.id !== currentSessionId) ? { ...s, isActive: false } : s);
    }

    existing.sessions = sessions;
    fs.writeFileSync(dbFile, JSON.stringify(existing, null, 2), 'utf-8');
    return res.json({ success: true, sessions });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update sessions' });
  }
});

// --- Internal Messenger API Endpoints ---
app.get('/api/messages', async (req, res) => {
  try {
    const { userId, all } = req.query;
    let messages: any[] = [];

    if (pgPool) {
      try {
        const query = (all === 'true' || !userId)
          ? `SELECT * FROM chat_messages ORDER BY timestamp ASC`
          : `SELECT * FROM chat_messages 
             WHERE receiver_id = 'channel:general' 
                OR receiver_id = $1 
                OR sender_id = $1 
                OR receiver_id LIKE 'group:%'
                OR receiver_type = 'channel'
             ORDER BY timestamp ASC`;
        const result = (all === 'true' || !userId) ? await pgPool.query(query) : await pgPool.query(query, [userId]);
        messages = result.rows.map(r => ({
          id: r.id,
          senderId: r.sender_id,
          senderName: r.sender_name,
          senderAvatar: r.sender_avatar || undefined,
          receiverId: r.receiver_id,
          receiverType: r.receiver_type || 'direct',
          text: r.text || '',
          attachment: r.attachment || undefined,
          replyTo: r.reply_to || undefined,
          timestamp: r.timestamp,
          timestampFa: r.timestamp_fa,
          status: r.status || 'sent',
          readBy: Array.isArray(r.read_by) ? r.read_by : (typeof r.read_by === 'string' ? JSON.parse(r.read_by || '[]') : [])
        }));
        return res.json({ messages });
      } catch (err: any) {
        console.warn('PostgreSQL messages query note (using file fallback):', err.message);
      }
    }

    let existing: any = {};
    if (fs.existsSync(dbFile)) {
      try { existing = JSON.parse(fs.readFileSync(dbFile, 'utf-8')); } catch { existing = {}; }
    }
    messages = Array.isArray(existing.messages) ? existing.messages : [];
    if (userId && all !== 'true') {
      messages = messages.filter(m => 
        m.receiverId === 'channel:general' || 
        m.receiverId === userId || 
        m.senderId === userId || 
        String(m.receiverId).startsWith('group:') ||
        m.receiverType === 'channel'
      );
    }
    return res.json({ messages });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const msg = req.body;
    const hasText = typeof msg?.text === 'string' && msg.text.trim().length > 0;
    const hasAttachment = Boolean(msg?.attachment && (msg.attachment.url || msg.attachment.name));

    // Allow messages that have an attachment even if text is empty
    if (!msg || (!hasText && !hasAttachment) || !msg.senderId || !msg.receiverId) {
      return res.status(400).json({ error: 'Missing required message fields (text or attachment required)' });
    }

    const newMsg = {
      id: msg.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      senderId: String(msg.senderId),
      senderName: msg.senderName || 'کاربر',
      senderAvatar: msg.senderAvatar || undefined,
      receiverId: String(msg.receiverId),
      receiverType: msg.receiverType || (String(msg.receiverId).startsWith('channel:') ? 'channel' : (String(msg.receiverId).startsWith('group:') ? 'group' : 'direct')),
      text: typeof msg.text === 'string' ? msg.text : '',
      attachment: msg.attachment || undefined,
      replyTo: msg.replyTo || undefined,
      timestamp: msg.timestamp || new Date().toISOString(),
      timestampFa: msg.timestampFa || new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      status: msg.status || 'sent',
      readBy: Array.isArray(msg.readBy) ? msg.readBy : [String(msg.senderId)]
    };

    let existing: any = {};
    if (fs.existsSync(dbFile)) {
      try { existing = JSON.parse(fs.readFileSync(dbFile, 'utf-8')); } catch { existing = {}; }
    }
    if (!Array.isArray(existing.messages)) existing.messages = [];
    existing.messages.push(newMsg);
    fs.writeFileSync(dbFile, JSON.stringify(existing, null, 2), 'utf-8');

    if (pgPool) {
      try {
        await pgPool.query(`
          INSERT INTO chat_messages (
            id, sender_id, sender_name, sender_avatar, receiver_id, receiver_type,
            text, attachment, reply_to, timestamp, timestamp_fa, status, read_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11, $12, $13::jsonb)
          ON CONFLICT (id) DO NOTHING;
        `, [
          newMsg.id, newMsg.senderId, newMsg.senderName, newMsg.senderAvatar || null,
          newMsg.receiverId, newMsg.receiverType, newMsg.text,
          newMsg.attachment ? JSON.stringify(newMsg.attachment) : null,
          newMsg.replyTo ? JSON.stringify(newMsg.replyTo) : null,
          newMsg.timestamp, newMsg.timestampFa, newMsg.status,
          JSON.stringify(newMsg.readBy)
        ]);
      } catch (pgErr: any) {
        console.warn('PostgreSQL message insert note:', pgErr.message);
      }
    }

    return res.json({ success: true, message: newMsg });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/messages/read', async (req, res) => {
  try {
    const { userId, conversationId } = req.body;
    if (!userId || !conversationId) {
      return res.status(400).json({ error: 'Missing userId or conversationId' });
    }

    let existing: any = {};
    if (fs.existsSync(dbFile)) {
      try { existing = JSON.parse(fs.readFileSync(dbFile, 'utf-8')); } catch { existing = {}; }
    }

    if (Array.isArray(existing.messages)) {
      let modified = false;
      existing.messages = existing.messages.map((m: any) => {
        const isTarget = (conversationId === 'all' && (m.receiverId === userId || m.receiverId === 'channel:general' || String(m.receiverId).startsWith('group:'))) ||
                         (conversationId === 'channel:general' && m.receiverId === 'channel:general') ||
                         (String(conversationId).startsWith('group:') && m.receiverId === conversationId) ||
                         (String(m.senderId) === String(conversationId) && String(m.receiverId) === String(userId));
        if (isTarget) {
          const readBy = Array.isArray(m.readBy) ? m.readBy : [];
          if (!readBy.includes(userId)) {
            modified = true;
            return { ...m, status: 'read', readBy: [...readBy, userId] };
          }
        }
        return m;
      });
      if (modified) {
        fs.writeFileSync(dbFile, JSON.stringify(existing, null, 2), 'utf-8');
      }
    }

    if (pgPool) {
      try {
        if (conversationId === 'channel:general') {
          await pgPool.query(`
            UPDATE chat_messages
            SET status = 'read',
                read_by = CASE
                  WHEN NOT (COALESCE(read_by, '[]'::jsonb) @> jsonb_build_array($1::text))
                  THEN COALESCE(read_by, '[]'::jsonb) || jsonb_build_array($1::text)
                  ELSE read_by
                END
            WHERE receiver_id = 'channel:general';
          `, [userId]);
        } else if (String(conversationId).startsWith('group:')) {
          await pgPool.query(`
            UPDATE chat_messages
            SET status = 'read',
                read_by = CASE
                  WHEN NOT (COALESCE(read_by, '[]'::jsonb) @> jsonb_build_array($1::text))
                  THEN COALESCE(read_by, '[]'::jsonb) || jsonb_build_array($1::text)
                  ELSE read_by
                END
            WHERE receiver_id = $2;
          `, [userId, conversationId]);
        } else if (conversationId === 'all') {
          await pgPool.query(`
            UPDATE chat_messages
            SET status = 'read',
                read_by = CASE
                  WHEN NOT (COALESCE(read_by, '[]'::jsonb) @> jsonb_build_array($1::text))
                  THEN COALESCE(read_by, '[]'::jsonb) || jsonb_build_array($1::text)
                  ELSE read_by
                END
            WHERE receiver_id = $1 OR receiver_id = 'channel:general' OR receiver_id LIKE 'group:%';
          `, [userId]);
        } else {
          await pgPool.query(`
            UPDATE chat_messages
            SET status = 'read',
                read_by = CASE
                  WHEN NOT (COALESCE(read_by, '[]'::jsonb) @> jsonb_build_array($1::text))
                  THEN COALESCE(read_by, '[]'::jsonb) || jsonb_build_array($1::text)
                  ELSE read_by
                END
            WHERE sender_id = $2 AND receiver_id = $1;
          `, [userId, conversationId]);
        }
      } catch (err: any) {
        console.warn('PostgreSQL update read_by note:', err.message);
      }
    }

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let existing: any = {};
    if (fs.existsSync(dbFile)) {
      try { existing = JSON.parse(fs.readFileSync(dbFile, 'utf-8')); } catch { existing = {}; }
    }
    if (Array.isArray(existing.messages)) {
      existing.messages = existing.messages.filter((m: any) => m.id !== id);
      fs.writeFileSync(dbFile, JSON.stringify(existing, null, 2), 'utf-8');
    }
    if (pgPool) {
      await pgPool.query('DELETE FROM chat_messages WHERE id = $1', [id]).catch(() => {});
    }
    return res.json({ success: true, deletedId: id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// User Messenger Analytics for Management (Supports /api/messenger-user-stats & /api/messages/stats)
const handleMessengerStats = async (req: express.Request, res: express.Response) => {
  try {
    let messages: any[] = [];
    let systemUserIds: string[] = [];

    if (pgPool) {
      try {
        const result = await pgPool.query('SELECT * FROM chat_messages ORDER BY timestamp ASC');
        messages = result.rows.map(r => ({
          id: r.id,
          senderId: r.sender_id,
          senderName: r.sender_name,
          receiverId: r.receiver_id,
          receiverType: r.receiver_type || 'direct',
          text: r.text || '',
          attachment: r.attachment,
          timestamp: r.timestamp,
          timestampFa: r.timestamp_fa,
          status: r.status,
          readBy: Array.isArray(r.read_by) ? r.read_by : (typeof r.read_by === 'string' ? JSON.parse(r.read_by || '[]') : [])
        }));

        const uRes = await pgPool.query('SELECT id FROM users');
        systemUserIds = uRes.rows.map(u => u.id);
      } catch (err: any) {
        console.warn('PostgreSQL stats fallback:', err.message);
      }
    }

    let existing: any = {};
    if (fs.existsSync(dbFile)) {
      try { existing = JSON.parse(fs.readFileSync(dbFile, 'utf-8')); } catch { existing = {}; }
    }

    if (messages.length === 0) {
      messages = Array.isArray(existing.messages) ? existing.messages : [];
    }
    if (systemUserIds.length === 0 && Array.isArray(existing.users)) {
      systemUserIds = existing.users.map((u: any) => u.id);
    }

    const userStats: Record<string, any> = {};

    const getOrInitStats = (uid: string) => {
      if (!userStats[uid]) {
        userStats[uid] = {
          userId: uid,
          sentCount: 0,
          receivedCount: 0,
          lastSentAt: null,
          lastSentAtFa: null,
          lastReceivedAt: null,
          lastReceivedAtFa: null,
          unreadCount: 0,
          totalFilesSent: 0,
          totalFileSizeBytes: 0,
          breakdown: {
            direct: { messagesCount: 0, filesCount: 0, sizeBytes: 0 },
            groups: { messagesCount: 0, filesCount: 0, sizeBytes: 0 },
            channels: { messagesCount: 0, filesCount: 0, sizeBytes: 0 }
          }
        };
      }
      return userStats[uid];
    };

    // Pre-initialize for all registered users
    for (const uid of systemUserIds) {
      getOrInitStats(uid);
    }

    const formatTimestampWithWeekday = (ts: string, fallbackFa?: string) => {
      try {
        const d = new Date(ts);
        if (!isNaN(d.getTime())) {
          const dateFa = d.toLocaleDateString('fa-IR', { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' });
          const timeFa = d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
          return `${dateFa} ساعت ${timeFa}`;
        }
      } catch {}
      return fallbackFa || ts;
    };

    for (const m of messages) {
      const sStats = getOrInitStats(m.senderId);
      sStats.sentCount++;
      sStats.lastSentAt = m.timestamp;
      sStats.lastSentAtFa = formatTimestampWithWeekday(m.timestamp, m.timestampFa);

      const isChannel = m.receiverId === 'channel:general' || m.receiverType === 'channel' || String(m.receiverId).startsWith('channel:');
      const isGroup = m.receiverType === 'group' || String(m.receiverId).startsWith('group:');
      const category: 'channels' | 'groups' | 'direct' = isChannel ? 'channels' : (isGroup ? 'groups' : 'direct');
      const targetBreakdown = sStats.breakdown[category];
      targetBreakdown.messagesCount++;

      if (m.attachment) {
        sStats.totalFilesSent++;
        targetBreakdown.filesCount++;

        let bytes = 0;
        if (typeof m.attachment.sizeBytes === 'number') {
          bytes = m.attachment.sizeBytes;
        } else if (typeof m.attachment.size === 'string') {
          const match = m.attachment.size.match(/([0-9.]+)\s*(kb|mb|b)?/i);
          if (match) {
            const val = parseFloat(match[1]);
            const unit = (match[2] || 'kb').toLowerCase();
            if (unit === 'mb') bytes = Math.round(val * 1024 * 1024);
            else if (unit === 'b') bytes = Math.round(val);
            else bytes = Math.round(val * 1024);
          }
        } else if (typeof m.attachment.url === 'string' && m.attachment.url.startsWith('data:')) {
          bytes = Math.round((m.attachment.url.length * 3) / 4);
        }
        sStats.totalFileSizeBytes += bytes;
        targetBreakdown.sizeBytes += bytes;
      }

      // Received and unread tracking
      const readBy = Array.isArray(m.readBy) ? m.readBy : [];
      if (!isChannel && !isGroup) {
        const rStats = getOrInitStats(m.receiverId);
        rStats.receivedCount++;
        rStats.lastReceivedAt = m.timestamp;
        rStats.lastReceivedAtFa = formatTimestampWithWeekday(m.timestamp, m.timestampFa);
        if (!readBy.includes(m.receiverId)) {
          rStats.unreadCount++;
        }
      } else {
        // Broadcast to all users
        for (const uid of systemUserIds) {
          if (uid !== m.senderId && !readBy.includes(uid)) {
            getOrInitStats(uid).unreadCount++;
          }
        }
      }
    }

    return res.json({ success: true, stats: userStats, totalMessages: messages.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

app.get('/api/messenger-user-stats', handleMessengerStats);
app.get('/api/messages/stats', handleMessengerStats);

// Delete Attendance Record Endpoint
app.delete('/api/attendance/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let existing: any = {};
    if (fs.existsSync(dbFile)) {
      try { existing = JSON.parse(fs.readFileSync(dbFile, 'utf-8')); } catch { existing = {}; }
    }
    if (Array.isArray(existing.attendance)) {
      existing.attendance = existing.attendance.filter((a: any) => a.id !== id);
      fs.writeFileSync(dbFile, JSON.stringify(existing, null, 2), 'utf-8');
    }
    if (pgPool) {
      await pgPool.query('DELETE FROM attendance_records WHERE id = $1', [id]).catch(() => {});
    }
    return res.json({ success: true, deletedId: id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Delete Project Endpoint
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let existing: any = {};
    if (fs.existsSync(dbFile)) {
      try { existing = JSON.parse(fs.readFileSync(dbFile, 'utf-8')); } catch { existing = {}; }
    }
    if (Array.isArray(existing.projects)) {
      existing.projects = existing.projects.filter((p: any) => p.id !== id);
      fs.writeFileSync(dbFile, JSON.stringify(existing, null, 2), 'utf-8');
    }
    if (pgPool) {
      await pgPool.query('DELETE FROM projects WHERE id = $1', [id]).catch(() => {});
    }
    return res.json({ success: true, deletedId: id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Delete Group Endpoint
app.delete('/api/groups/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let existing: any = {};
    if (fs.existsSync(dbFile)) {
      try { existing = JSON.parse(fs.readFileSync(dbFile, 'utf-8')); } catch { existing = {}; }
    }
    if (Array.isArray(existing.groups)) {
      existing.groups = existing.groups.filter((g: any) => g.id !== id);
      fs.writeFileSync(dbFile, JSON.stringify(existing, null, 2), 'utf-8');
    }
    if (pgPool) {
      await pgPool.query('DELETE FROM groups WHERE id = $1', [id]).catch(() => {});
    }
    return res.json({ success: true, deletedId: id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Application Version Endpoint
const SERVER_APP_VERSION = 'v2.0.12';
app.get('/api/version', (req, res) => {
  res.json({
    version: SERVER_APP_VERSION,
    releaseDate: '1405/07/29',
    timestamp: Date.now()
  });
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

async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT} (${isProd ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
