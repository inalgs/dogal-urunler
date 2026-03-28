const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const db = require('../config/db');

const router = express.Router();

// Moka ödeme başlat
router.post('/create', authMiddleware, async (req, res) => {
  const { orderId, cardNumber, cardHolderName, expMonth, expYear, cvc } = req.body;

  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?')
    .get(orderId, req.user.id);

  if (!order) return res.status(404).json({ error: 'Sipariş bulunamadı' });
  if (order.status !== 'beklemede') {
    return res.status(400).json({ error: 'Bu sipariş için ödeme yapılamaz' });
  }

  try {
    // Moka API isteği
    const mokaPayload = {
      PaymentDealerAuthentication: {
        DealerCode: process.env.MOKA_DEALER_CODE,
        Username: process.env.MOKA_USERNAME,
        Password: process.env.MOKA_PASSWORD,
        CheckKey: ''
      },
      PaymentDealerRequest: {
        CardHolderFullName: cardHolderName,
        CardNumber: cardNumber,
        ExpMonth: expMonth,
        ExpYear: expYear,
        CvcNumber: cvc,
        Amount: order.total.toFixed(2),
        Currency: 'TL',
        InstallmentNumber: 1,
        ClientIP: req.ip,
        OtherTrxCode: `ORDER-${orderId}`,
        Description: `Sipariş #${orderId}`,
        Software: 'DogalUrunler'
      }
    };

    const response = await fetch(`${process.env.MOKA_API_URL}/PaymentDealer/DoDirectPayment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mokaPayload)
    });

    const result = await response.json();

    if (result.ResultCode === 'Success') {
      db.prepare('UPDATE orders SET status = ?, payment_id = ? WHERE id = ?')
        .run('hazirlaniyor', result.Data, orderId);
      res.json({ message: 'Ödeme başarılı', status: 'success' });
    } else {
      res.status(400).json({
        error: 'Ödeme başarısız',
        detail: result.ResultMessage || 'Bilinmeyen hata'
      });
    }
  } catch (err) {
    console.error('Moka ödeme hatası:', err);
    res.status(500).json({ error: 'Ödeme işlemi sırasında bir hata oluştu' });
  }
});

module.exports = router;
