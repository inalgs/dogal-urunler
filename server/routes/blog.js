const express = require('express');
const db = require('../config/db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../public/images/uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'blog-' + Date.now() + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Tüm blog yazıları (yayınlanmış)
router.get('/', (req, res) => {
  const posts = db.prepare(`
    SELECT b.*, u.name as author_name FROM blog_posts b
    LEFT JOIN users u ON b.author_id = u.id
    WHERE b.is_published = 1 ORDER BY b.created_at DESC
  `).all();
  res.json(posts);
});

// Tek yazı
router.get('/:slug', (req, res) => {
  const post = db.prepare(`
    SELECT b.*, u.name as author_name FROM blog_posts b
    LEFT JOIN users u ON b.author_id = u.id WHERE b.slug = ?
  `).get(req.params.slug);
  if (!post) return res.status(404).json({ error: 'Yazı bulunamadı' });
  res.json(post);
});

// Admin: Tüm yazılar (yayınlanmamışlar dahil)
router.get('/admin/all', authMiddleware, adminMiddleware, (req, res) => {
  const posts = db.prepare(`
    SELECT b.*, u.name as author_name FROM blog_posts b
    LEFT JOIN users u ON b.author_id = u.id ORDER BY b.created_at DESC
  `).all();
  res.json(posts);
});

// Admin: Yazı ekle
router.post('/', authMiddleware, adminMiddleware, upload.single('image'), (req, res) => {
  const { title, content, summary, is_published } = req.body;
  const slug = title.toLowerCase()
    .replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const image = req.file ? `/images/uploads/${req.file.filename}` : null;

  const result = db.prepare(
    'INSERT INTO blog_posts (title, slug, content, summary, image, author_id, is_published) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(title, slug, content, summary || null, image, req.user.id, is_published ? 1 : 0);

  res.status(201).json({ message: 'Yazı eklendi', id: result.lastInsertRowid });
});

// Admin: Yazı güncelle
router.put('/:id', authMiddleware, adminMiddleware, upload.single('image'), (req, res) => {
  const { title, content, summary, is_published } = req.body;
  const image = req.file ? `/images/uploads/${req.file.filename}` : undefined;

  let query = 'UPDATE blog_posts SET title = ?, content = ?, summary = ?, is_published = ?';
  const params = [title, content, summary || null, is_published ? 1 : 0];

  if (image) {
    query += ', image = ?';
    params.push(image);
  }
  query += ' WHERE id = ?';
  params.push(parseInt(req.params.id));

  db.prepare(query).run(...params);
  res.json({ message: 'Yazı güncellendi' });
});

// Admin: Yazı sil
router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
  db.prepare('DELETE FROM blog_posts WHERE id = ?').run(parseInt(req.params.id));
  res.json({ message: 'Yazı silindi' });
});

module.exports = router;
