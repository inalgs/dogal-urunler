const express = require('express');
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Sepeti getir
router.get('/', authMiddleware, (req, res) => {
  const items = db.prepare(`
    SELECT ci.id, ci.quantity, p.id as product_id, p.name, p.price, p.image, p.stock, p.slug
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    WHERE ci.user_id = ?
  `).all(req.user.id);

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  res.json({ items, total });
});

// Sepete ekle
router.post('/', authMiddleware, (req, res) => {
  const { product_id, quantity } = req.body;

  const product = db.prepare('SELECT id, stock FROM products WHERE id = ? AND is_active = 1').get(product_id);
  if (!product) return res.status(404).json({ error: 'Ürün bulunamadı' });

  const existing = db.prepare('SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?')
    .get(req.user.id, product_id);

  if (existing) {
    const newQty = existing.quantity + (quantity || 1);
    if (newQty > product.stock) return res.status(400).json({ error: 'Yeterli stok yok' });
    db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(newQty, existing.id);
  } else {
    if ((quantity || 1) > product.stock) return res.status(400).json({ error: 'Yeterli stok yok' });
    db.prepare('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)')
      .run(req.user.id, product_id, quantity || 1);
  }

  res.json({ message: 'Ürün sepete eklendi' });
});

// Miktar güncelle
router.put('/:id', authMiddleware, (req, res) => {
  const { quantity } = req.body;
  if (quantity < 1) return res.status(400).json({ error: 'Miktar en az 1 olmalı' });

  const item = db.prepare(`
    SELECT ci.id, p.stock FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    WHERE ci.id = ? AND ci.user_id = ?
  `).get(req.params.id, req.user.id);

  if (!item) return res.status(404).json({ error: 'Sepet öğesi bulunamadı' });
  if (quantity > item.stock) return res.status(400).json({ error: 'Yeterli stok yok' });

  db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(quantity, req.params.id);
  res.json({ message: 'Miktar güncellendi' });
});

// Sepetten sil
router.delete('/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM cart_items WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ message: 'Ürün sepetten silindi' });
});

// Sepeti temizle
router.delete('/', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);
  res.json({ message: 'Sepet temizlendi' });
});

module.exports = router;
