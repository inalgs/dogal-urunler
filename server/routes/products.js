const express = require('express');
const db = require('../config/db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Multer ayarı - 4 görsel desteği
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../public/images/uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1000) + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const imageFields = [
  { name: 'image', maxCount: 1 },
  { name: 'image2', maxCount: 1 },
  { name: 'image3', maxCount: 1 },
  { name: 'image4', maxCount: 1 }
];

// Tüm ürünleri listele
router.get('/', (req, res) => {
  const { category, search, sort, limit } = req.query;
  let query = `SELECT p.*, c.name as category_name FROM products p
               LEFT JOIN categories c ON p.category_id = c.id WHERE p.is_active = 1`;
  const params = [];

  if (category) {
    query += ' AND c.slug = ?';
    params.push(category);
  }
  if (search) {
    query += ' AND (p.name LIKE ? OR p.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (sort === 'price_asc') query += ' ORDER BY p.price ASC';
  else if (sort === 'price_desc') query += ' ORDER BY p.price DESC';
  else if (sort === 'newest') query += ' ORDER BY p.created_at DESC';
  else query += ' ORDER BY p.is_featured DESC, p.created_at DESC';

  if (limit) {
    query += ' LIMIT ?';
    params.push(parseInt(limit));
  }

  const products = db.prepare(query).all(...params);
  res.json(products);
});

// Öne çıkan ürünler
router.get('/featured', (req, res) => {
  const products = db.prepare(
    `SELECT p.*, c.name as category_name FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     WHERE p.is_active = 1 AND p.is_featured = 1 ORDER BY p.created_at DESC LIMIT 8`
  ).all();
  res.json(products);
});

// Kategoriler
router.get('/categories', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories').all();
  res.json(categories);
});

// Tek ürün
router.get('/:slug', (req, res) => {
  const product = db.prepare(
    `SELECT p.*, c.name as category_name FROM products p
     LEFT JOIN categories c ON p.category_id = c.id WHERE p.slug = ?`
  ).get(req.params.slug);
  if (!product) return res.status(404).json({ error: 'Ürün bulunamadı' });
  res.json(product);
});

// Admin: Ürün ekle
router.post('/', authMiddleware, adminMiddleware, upload.fields(imageFields), (req, res) => {
  const { name, description, price, old_price, stock, category_id, weight, is_featured, ingredients, nutrition } = req.body;
  const slug = name.toLowerCase()
    .replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const getImg = (field) => req.files?.[field]?.[0] ? `/images/uploads/${req.files[field][0].filename}` : null;

  const result = db.prepare(
    `INSERT INTO products (name, slug, description, price, old_price, stock, category_id, image, image2, image3, image4, weight, is_featured, ingredients, nutrition)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(name, slug, description, parseFloat(price), old_price ? parseFloat(old_price) : null,
    parseInt(stock) || 0, category_id ? parseInt(category_id) : null,
    getImg('image'), getImg('image2'), getImg('image3'), getImg('image4'),
    weight || null, is_featured ? 1 : 0, ingredients || null, nutrition || null);

  res.status(201).json({ message: 'Ürün eklendi', id: result.lastInsertRowid });
});

// Admin: Ürün güncelle
router.put('/:id', authMiddleware, adminMiddleware, upload.fields(imageFields), (req, res) => {
  const { name, description, price, old_price, stock, category_id, weight, is_active, is_featured, ingredients, nutrition } = req.body;

  const getImg = (field) => req.files?.[field]?.[0] ? `/images/uploads/${req.files[field][0].filename}` : undefined;

  let query = `UPDATE products SET name = ?, description = ?, price = ?, old_price = ?,
               stock = ?, category_id = ?, weight = ?, is_active = ?, is_featured = ?, ingredients = ?, nutrition = ?`;
  const params = [name, description, parseFloat(price), old_price ? parseFloat(old_price) : null,
    parseInt(stock) || 0, category_id ? parseInt(category_id) : null, weight || null,
    is_active !== undefined ? parseInt(is_active) : 1, is_featured ? 1 : 0,
    ingredients || null, nutrition || null];

  ['image', 'image2', 'image3', 'image4'].forEach(field => {
    const img = getImg(field);
    if (img) {
      query += `, ${field} = ?`;
      params.push(img);
    }
  });

  query += ' WHERE id = ?';
  params.push(parseInt(req.params.id));

  db.prepare(query).run(...params);
  res.json({ message: 'Ürün güncellendi' });
});

// Admin: Ürün sil
router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(parseInt(req.params.id));
  res.json({ message: 'Ürün silindi' });
});

// Admin: Kategori ekle
router.post('/categories', authMiddleware, adminMiddleware, (req, res) => {
  const { name, description } = req.body;
  const slug = name.toLowerCase()
    .replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const result = db.prepare('INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)')
    .run(name, slug, description || null);
  res.status(201).json({ message: 'Kategori eklendi', id: result.lastInsertRowid });
});

module.exports = router;
