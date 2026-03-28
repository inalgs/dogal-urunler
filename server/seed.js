require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./config/db');

// Admin kullanıcı oluştur
const adminPassword = bcrypt.hashSync('admin123', 10);
const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@dogalurunler.com');

if (!adminExists) {
  db.prepare('INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)')
    .run('Admin', 'admin@dogalurunler.com', adminPassword, '0555 555 5555', 'admin');
  console.log('Admin kullanıcı oluşturuldu: admin@dogalurunler.com / admin123');
}

// Kategoriler (Bal & Pekmez, Kurutulmuş Meyve, Baharat kaldırıldı)
const categories = [
  { name: 'Reçel & Marmelat', slug: 'recel-marmelat', description: 'Ev yapımı reçel ve marmelatlar' },
  { name: 'Yağlar', slug: 'yaglar', description: 'Soğuk sıkım doğal yağlar' },
  { name: 'Sirke & Sos', slug: 'sirke-sos', description: 'Doğal fermente sirkeler ve soslar' },
];

const insertCategory = db.prepare('INSERT OR IGNORE INTO categories (name, slug, description) VALUES (?, ?, ?)');
for (const cat of categories) {
  insertCategory.run(cat.name, cat.slug, cat.description);
}
console.log('Kategoriler oluşturuldu');

// Örnek ürünler - categories array ile çoklu kategori desteği
const products = [
  { name: 'Çam Balı', slug: 'cam-bali', description: 'Muğla yöresinden toplanan doğal çam balı. Hiçbir katkı maddesi içermez.', price: 350, stock: 50, categories: ['yaglar'], weight: '850g', is_featured: 1 },
  { name: 'Çiçek Balı', slug: 'cicek-bali', description: 'Antalya yaylalarından toplanan çiçek balı. %100 doğal.', price: 280, stock: 40, categories: ['yaglar'], weight: '850g', is_featured: 1 },
  { name: 'Üzüm Pekmezi', slug: 'uzum-pekmezi', description: 'Geleneksel yöntemle üretilen üzüm pekmezi. Katkısız ve doğal.', price: 120, stock: 60, categories: ['sirke-sos'], weight: '700g', is_featured: 1 },
  { name: 'Dut Pekmezi', slug: 'dut-pekmezi', description: 'Taze dutlardan hazırlanan doğal dut pekmezi.', price: 130, stock: 45, categories: ['sirke-sos'], weight: '700g' },
  { name: 'Çilek Reçeli', slug: 'cilek-receli', description: 'Taze çileklerden ev yapımı reçel. Şeker miktarı minimum.', price: 85, stock: 35, categories: ['recel-marmelat'], weight: '400g', is_featured: 1 },
  { name: 'Kayısı Reçeli', slug: 'kayisi-receli', description: 'Malatya kayısısından yapılan doğal reçel.', price: 80, stock: 40, categories: ['recel-marmelat'], weight: '400g' },
  { name: 'Vişne Reçeli', slug: 'visne-receli', description: 'Afyon vişnesinden hazırlanan ev yapımı reçel.', price: 90, stock: 30, categories: ['recel-marmelat'], weight: '400g', is_featured: 1 },
  { name: 'Kuru Kayısı', slug: 'kuru-kayisi', description: 'Malatya\'nın meşhur kuru kayısısı. Doğal kurutma.', price: 150, stock: 100, categories: ['recel-marmelat'], weight: '500g', is_featured: 1 },
  { name: 'Kuru İncir', slug: 'kuru-incir', description: 'Aydın inciri. Doğal güneşte kurutulmuş.', price: 160, stock: 80, categories: ['recel-marmelat'], weight: '500g' },
  { name: 'Pul Biber', slug: 'pul-biber', description: 'Urfa\'nın meşhur isot biberi. Taze öğütülmüş.', price: 95, stock: 70, categories: ['sirke-sos'], weight: '250g', is_featured: 1 },
  { name: 'Kekik', slug: 'kekik', description: 'Ege dağlarından toplanan doğal kekik.', price: 45, stock: 90, categories: ['sirke-sos'], weight: '100g' },
  { name: 'Zeytinyağı', slug: 'zeytinyagi', description: 'Soğuk sıkım natürel sızma zeytinyağı. Ege bölgesi.', price: 420, stock: 30, categories: ['yaglar'], weight: '1L', is_featured: 1 },
  { name: 'Elma Sirkesi', slug: 'elma-sirkesi', description: 'Doğal fermente elma sirkesi. Katkısız.', price: 75, stock: 55, categories: ['sirke-sos'], weight: '500ml' },
  { name: 'Nar Ekşisi', slug: 'nar-eksisi', description: 'Taze narlardan hazırlanan doğal nar ekşisi.', price: 110, stock: 45, categories: ['sirke-sos', 'recel-marmelat'], weight: '330ml', is_featured: 1 },
];

const getCategoryId = db.prepare('SELECT id FROM categories WHERE slug = ?');
const insertProduct = db.prepare(
  `INSERT OR IGNORE INTO products (name, slug, description, price, stock, weight, is_featured, is_active)
   VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
);
const insertProductCategory = db.prepare('INSERT OR IGNORE INTO product_categories (product_id, category_id) VALUES (?, ?)');

for (const p of products) {
  const result = insertProduct.run(p.name, p.slug, p.description, p.price, p.stock, p.weight, p.is_featured ? 1 : 0);
  const productId = result.lastInsertRowid || db.prepare('SELECT id FROM products WHERE slug = ?').get(p.slug)?.id;
  if (productId && p.categories) {
    for (const catSlug of p.categories) {
      const cat = getCategoryId.get(catSlug);
      if (cat) insertProductCategory.run(productId, cat.id);
    }
  }
}
console.log('Örnek ürünler oluşturuldu');

// Örnek blog yazısı
const blogExists = db.prepare('SELECT id FROM blog_posts LIMIT 1').get();
if (!blogExists) {
  const admin = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
  db.prepare(
    'INSERT INTO blog_posts (title, slug, content, summary, author_id, is_published) VALUES (?, ?, ?, ?, ?, 1)'
  ).run(
    'Doğal Balın Faydaları',
    'dogal-balin-faydalari',
    `Doğal bal, yüzyıllardır hem gıda hem de şifa kaynağı olarak kullanılmaktadır. İşte doğal balın bilinen faydaları:\n\n1. **Bağışıklık Sistemini Güçlendirir**: Doğal bal, antioksidanlar açısından zengindir ve bağışıklık sistemini destekler.\n\n2. **Enerji Kaynağıdır**: Doğal şekerleri sayesinde hızlı ve sağlıklı bir enerji kaynağıdır.\n\n3. **Boğaz Ağrısına İyi Gelir**: Ilık suyla karıştırılarak içildiğinde boğaz ağrısını hafifletir.\n\n4. **Cilt Bakımında Kullanılır**: Nemlendirici ve antibakteriyel özellikleri sayesinde cilt bakımında da tercih edilir.\n\nBizim ballarımız, hiçbir katkı maddesi içermeden doğrudan arıcılarımızdan sofranıza ulaşır.`,
    'Doğal balın sağlığımıza olan faydalarını keşfedin.',
    admin?.id || 1
  );
  console.log('Örnek blog yazısı oluşturuldu');
}

console.log('\nSeed işlemi tamamlandı!');
process.exit(0);
