require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Garante que a pasta de dados existe
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const { initDatabase } = require('./config/database');
const hotspotRoutes = require('./routes/hotspot');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../../public')));

// Rotas da API
app.use('/api/hotspot', hotspotRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);

// Rota principal — portal hotspot
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/hotspot/index.html'));
});

// Rota do painel admin
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/admin/index.html'));
});

app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/admin/index.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

initDatabase();

app.listen(PORT, () => {
  console.log(`\n🚀 MG-NET SAL Hotspot rodando na porta ${PORT}`);
  console.log(`   Portal Hotspot: http://localhost:${PORT}/`);
  console.log(`   Painel Admin:   http://localhost:${PORT}/admin`);
  console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;
