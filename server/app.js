require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Uploads dizinini oluştur
const uploadsDir = path.join(__dirname, '../public/images/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Veritabanını başlat
require('./config/db');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Statik dosyalar
const publicDir = path.join(__dirname, '../public');
const adminDir = path.join(__dirname, '../admin');
console.log('Public dir:', publicDir, 'exists:', fs.existsSync(publicDir));
console.log('Admin dir:', adminDir, 'exists:', fs.existsSync(adminDir));
console.log('index.html exists:', fs.existsSync(path.join(publicDir, 'index.html')));
app.use(express.static(publicDir));
app.use('/admin', express.static(adminDir));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/blog', require('./routes/blog'));
app.use('/api/payment', require('./routes/payment'));

// SPA fallback - HTML sayfaları için (Express 5 syntax)
app.get('/admin/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin/index.html'));
});

// Ana sayfa fallback
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// HTML sayfalari icin fallback
app.get('*.html', (req, res) => {
  const filePath = path.join(__dirname, '../public', req.path);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).sendFile(path.join(__dirname, '../public/index.html'));
  }
});

// 404 handler
app.use('/api/{*path}', (req, res) => {
  res.status(404).json({ error: 'API endpoint bulunamadı' });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`Sunucu http://${HOST}:${PORT} adresinde çalışıyor`);
});
