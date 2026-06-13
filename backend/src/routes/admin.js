const express = require('express');
const { db } = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const { getActiveSessions, disconnectUser, testConnection } = require('../services/mikrotik.service');

const router = express.Router();
router.use(requireAuth);

// GET /api/admin/dashboard
router.get('/dashboard', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  const totalLeads = db.prepare('SELECT COUNT(*) as count FROM leads WHERE is_validated = 1').get();
  const todayLeads = db.prepare("SELECT COUNT(*) as count FROM leads WHERE is_validated = 1 AND DATE(created_at) = ?").get(today);
  const thisMonthLeads = db.prepare("SELECT COUNT(*) as count FROM leads WHERE is_validated = 1 AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')").get();
  const totalSessions = db.prepare('SELECT COUNT(*) as count FROM sessions').get();

  // Leads por dia (últimos 7 dias)
  const dailyLeads = db.prepare(`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM leads WHERE is_validated = 1
    AND created_at >= datetime('now', '-7 days')
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `).all();

  res.json({
    totalLeads: totalLeads.count,
    todayLeads: todayLeads.count,
    thisMonthLeads: thisMonthLeads.count,
    totalSessions: totalSessions.count,
    dailyLeads
  });
});

// GET /api/admin/leads
router.get('/leads', (req, res) => {
  const { page = 1, limit = 50, search = '', startDate, endDate } = req.query;
  const offset = (page - 1) * limit;

  let where = 'WHERE is_validated = 1';
  const params = [];

  if (search) {
    where += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (startDate) {
    where += ' AND DATE(created_at) >= ?';
    params.push(startDate);
  }
  if (endDate) {
    where += ' AND DATE(created_at) <= ?';
    params.push(endDate);
  }

  const total = db.prepare(`SELECT COUNT(*) as count FROM leads ${where}`).get(...params);
  const leads = db.prepare(`
    SELECT id, name, phone, email, mac_address, ip_address, created_at
    FROM leads ${where}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  res.json({ leads, total: total.count, page: parseInt(page), limit: parseInt(limit) });
});

// GET /api/admin/leads/export — exporta CSV
router.get('/leads/export', (req, res) => {
  const leads = db.prepare(`
    SELECT name, phone, email, mac_address, ip_address, created_at
    FROM leads WHERE is_validated = 1
    ORDER BY created_at DESC
  `).all();

  const headers = 'Nome,Telefone,Email,MAC,IP,Data Cadastro\n';
  const rows = leads.map(l =>
    `"${l.name || ''}","${l.phone}","${l.email || ''}","${l.mac_address || ''}","${l.ip_address || ''}","${l.created_at}"`
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="leads_zip_telecom.csv"');
  res.send('﻿' + headers + rows); // BOM para Excel reconhecer UTF-8
});

// GET /api/admin/sessions
router.get('/sessions', async (req, res) => {
  const dbSessions = db.prepare(`
    SELECT s.*, l.name, l.phone, l.email
    FROM sessions s
    LEFT JOIN leads l ON s.lead_id = l.id
    ORDER BY s.started_at DESC
    LIMIT 100
  `).all();

  let mikrotikSessions = [];
  try {
    mikrotikSessions = await getActiveSessions();
  } catch (_) {}

  res.json({ sessions: dbSessions, activeSessions: mikrotikSessions });
});

// DELETE /api/admin/sessions/:mac — desconecta usuário
router.delete('/sessions/:mac', async (req, res) => {
  try {
    await disconnectUser(req.params.mac);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/settings
router.get('/settings', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  rows.forEach(r => { settings[r.key] = r.value; });
  res.json(settings);
});

// PUT /api/admin/settings
router.put('/settings', (req, res) => {
  const allowed = [
    'hotspot_title', 'hotspot_subtitle', 'hotspot_free_time',
    'otp_expiry_minutes', 'zenvia_from', 'require_name', 'require_email',
    'mikrotik_host', 'mikrotik_port', 'mikrotik_user', 'mikrotik_password',
    'mikrotik_hotspot_server', 'zenvia_token'
  ];

  const update = db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)');
  const updateMany = db.transaction((data) => {
    for (const [key, value] of Object.entries(data)) {
      if (allowed.includes(key) && value !== undefined) {
        update.run(key, String(value));
        // Atualiza variáveis de ambiente em memória para MikroTik/Zenvia
        const envMap = {
          mikrotik_host: 'MIKROTIK_HOST',
          mikrotik_port: 'MIKROTIK_PORT',
          mikrotik_user: 'MIKROTIK_USER',
          mikrotik_password: 'MIKROTIK_PASSWORD',
          mikrotik_hotspot_server: 'MIKROTIK_HOTSPOT_SERVER',
          zenvia_token: 'ZENVIA_TOKEN',
          zenvia_from: 'ZENVIA_FROM',
          otp_expiry_minutes: 'OTP_EXPIRY_MINUTES',
          hotspot_free_time: 'HOTSPOT_FREE_TIME'
        };
        if (envMap[key]) process.env[envMap[key]] = String(value);
      }
    }
  });

  updateMany(req.body);
  res.json({ success: true, message: 'Configurações salvas.' });
});

// POST /api/admin/mikrotik/test
router.post('/mikrotik/test', async (req, res) => {
  const result = await testConnection();
  res.json(result);
});

// DELETE /api/admin/leads/:id
router.delete('/leads/:id', (req, res) => {
  db.prepare('DELETE FROM leads WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
