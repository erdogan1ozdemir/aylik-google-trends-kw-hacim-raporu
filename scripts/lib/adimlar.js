// scripts/lib/adimlar.js
// "Değerlendirilebilecek adımlar" bölümünün aylık anlık görüntüsü.
//
// Tablolar ve grafikler haftalık Trends turuyla değişir; adımlar değişmez.
// Markaya giden öneri listesinin her hafta yeniden yazılması takip edilemez
// hale getirir. Kural:
//   - Anlık görüntü yoksa üretilir ve kaydedilir
//   - Aktif ayın adımları, Trends penceresi yeni bir takvim ayına geçtiğinde
//     yenilenir (her ayın ilk haftalık turu). Sayfanın ait olduğu ay bittikten
//     sonra yenilenmez: o ayın adımları nihaidir
//   - Geçmiş (donmuş) ayın adımları ilk üretimden sonra hiç değişmez
//   - --adimlari-yenile ile zorla yenilenebilir

const fs = require('fs');
const path = require('path');

function pencereSonu(trends) {
  if (!trends || !trends.seriBaslangic) return null;
  const t = new Date(trends.seriBaslangic + 'T00:00:00Z');
  t.setUTCDate(t.getUTCDate() + 370);
  return t.toISOString().slice(0, 10);
}

function adimlariAl({ d, ay, raporYili, trends, dizin, yenile, uret }) {
  const raporAyi = `${raporYili}-${String(ay + 1).padStart(2, '0')}`;
  const son = pencereSonu(trends);
  const pencereAyi = son ? son.slice(0, 7) : null;
  const donmus = !!(trends && trends.donmus);
  const hafta = d.trendsDili ? d.trendsDili.haftaTarih : '';

  // Metin, sayfanın ayı içinde miyiz yoksa önünde miyiz ona göre kurulur
  d.adimBaglam = { buAy: pencereAyi === raporAyi };

  if (!dizin) return { maddeler: uret(d), not: null, durum: 'kayıtsız' };

  const dosya = path.join(dizin, `adimlar-${raporAyi}.json`);
  let kayit = null;
  try { kayit = JSON.parse(fs.readFileSync(dosya, 'utf8')); } catch (e) { kayit = null; }

  let sebep = null;
  if (!kayit) sebep = 'ilk üretim';
  else if (yenile) sebep = 'elle yenileme';
  else if (!donmus && pencereAyi && kayit.pencereAyi && kayit.pencereAyi < pencereAyi && pencereAyi <= raporAyi) sebep = 'yeni ay';

  if (sebep) {
    kayit = { raporAyi, pencereAyi, sonHafta: hafta, donmus, uretim: new Date().toISOString().slice(0, 10), maddeler: uret(d) };
    fs.mkdirSync(dizin, { recursive: true });
    fs.writeFileSync(dosya, JSON.stringify(kayit, null, 1), 'utf8');
  }

  // Okuyucuya adımların hangi veriye dayandığı ve ne zaman değişeceği söylenir
  let not;
  const ayBitti = pencereAyi && pencereAyi > raporAyi;
  if (donmus || ayBitti) not = 'Bu ayın adımları nihaidir, güncellenmez.';
  else if (pencereAyi === raporAyi) not = `Adımlar ${kayit.sonHafta || hafta} haftası itibarıyla hazırlanmıştır; ay sonuna kadar sabit kalır ve ay bittiğinde nihai hale gelir.`;
  else not = `Adımlar ${kayit.sonHafta || hafta} haftası itibarıyla hazırlanmıştır ve her ayın ilk haftalık güncellemesinde yenilenir.`;

  return { maddeler: kayit.maddeler, not, durum: sebep || 'korundu', dosya };
}

module.exports = { adimlariAl, pencereSonu };
