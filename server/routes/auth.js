const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Kayıt
router.post('/register', (req, res) => {
  const { name, email, password, phone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Ad, e-posta ve şifre zorunludur' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(400).json({ error: 'Bu e-posta adresi zaten kayıtlı' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)'
  ).run(name, email, hashedPassword, phone || null);

  const token = jwt.sign(
    { id: result.lastInsertRowid, email, role: 'user' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.status(201).json({
    message: 'Kayıt başarılı',
    token,
    user: { id: result.lastInsertRowid, name, email, role: 'user' }
  });
});

// Giriş
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'E-posta ve şifre zorunludur' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'E-posta veya şifre hatalı' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    message: 'Giriş başarılı',
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
});

// Profil bilgisi
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, name, email, phone, address, city, role, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
  res.json(user);
});

// Profil güncelle
router.put('/me', authMiddleware, (req, res) => {
  const { name, phone, address, city } = req.body;
  db.prepare('UPDATE users SET name = ?, phone = ?, address = ?, city = ? WHERE id = ?')
    .run(name, phone || null, address || null, city || null, req.user.id);
  res.json({ message: 'Profil güncellendi' });
});

module.exports = router;
