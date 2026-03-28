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
app.use(express.static(path.join(__dirname, '../public')));
app.use('/admin', express.static(path.join(__dirname, '../admin')));

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

// 404 handler
app.use('/api/{*path}', (req, res) => {
  res.status(404).json({ error: 'API endpoint bulunamadı' });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`Sunucu http://${HOST}:${PORT} adresinde çalışıyor`);
});
