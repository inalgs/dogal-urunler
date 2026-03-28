const express = require('express');
const db = require('../config/db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Sipariş oluştur
router.post('/', authMiddleware, (req, res) => {
  const { address, city, phone, note } = req.body;
  if (!address || !phone) {
    return res.status(400).json({ error: 'Adres ve telefon zorunludur' });
  }

  const cartItems = db.prepare(`
    SELECT ci.quantity, p.id as product_id, p.price, p.stock, p.name
    FROM cart_items ci JOIN products p ON ci.product_id = p.id
    WHERE ci.user_id = ?
  `).all(req.user.id);

  if (cartItems.length === 0) {
    return res.status(400).json({ error: 'Sepetiniz boş' });
  }

  for (const item of cartItems) {
    if (item.quantity > item.stock) {
      return res.status(400).json({ error: `"${item.name}" için yeterli stok yok` });
    }
  }

  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const createOrder = db.transaction(() => {
    const order = db.prepare(
      'INSERT INTO orders (user_id, total, address, city, phone, note) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(req.user.id, total, address, city || null, phone, note || null);

    const insertItem = db.prepare(
      'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)'
    );
    const updateStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');

    for (const item of cartItems) {
      insertItem.run(order.lastInsertRowid, item.product_id, item.quantity, item.price);
      updateStock.run(item.quantity, item.product_id);
    }

    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);

    return order.lastInsertRowid;
  });

  const orderId = createOrder();
  res.status(201).json({ message: 'Sipariş oluşturuldu', orderId });
});

// Kullanıcının siparişleri
router.get('/', authMiddleware, (req, res) => {
  const orders = db.prepare(
    'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.user.id);
  res.json(orders);
});

// Sipariş detayı
router.get('/:id', authMiddleware, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!order) return res.status(404).json({ error: 'Sipariş bulunamadı' });

  const items = db.prepare(`
    SELECT oi.*, p.name, p.image, p.slug FROM order_items oi
    JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?
  `).all(order.id);

  res.json({ ...order, items });
});

// Admin: Tüm siparişler
router.get('/admin/all', authMiddleware, adminMiddleware, (req, res) => {
  const { status } = req.query;
  let query = `SELECT o.*, u.name as user_name, u.email as user_email FROM orders o
               JOIN users u ON o.user_id = u.id`;
  const params = [];

  if (status) {
    query += ' WHERE o.status = ?';
    params.push(status);
  }
  query += ' ORDER BY o.created_at DESC';

  const orders = db.prepare(query).all(...params);
  res.json(orders);
});

// Admin: Sipariş durumu güncelle
router.put('/:id/status', authMiddleware, adminMiddleware, (req, res) => {
  const { status } = req.body;
  const validStatuses = ['beklemede', 'hazirlaniyor', 'kargoda', 'teslim_edildi', 'iptal'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Geçersiz durum' });
  }
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ message: 'Sipariş durumu güncellendi' });
});

module.exports = router;
