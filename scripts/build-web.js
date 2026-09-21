// scripts/build-web.js
// Tarayıcı raporunu üretir. E-posta sürümü için build-mailing.js kullanılır.
//
// Kullanım:
//   node scripts/build-web.js --config proje.json --ay 11 --trends-stdin < trends.json
//
// Markaya özel her şey proje.json'da; bu dosyada marka adı geçmez.

const fs = require('fs');
const path = require('path');
const { buildMailingData, trendsEkle, trendsDili, TR_MONTHS, TR_SHORT, LIMITS } = require('./lib/mailing-data');
const web = require('./lib/web-template');
const { buildOzet, buildAksiyonlar, sutunAciklamalari } = require('./lib/rapor-metin');

const { yukle } = require('./lib/proje');

const ROOT = path.join(__dirname, '..');

const args = { ay: null, out: null, trendsStdin: false, config: 'proje.json' };
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--ay') args.ay = Number(process.argv[++i]);
  else if (process.argv[i] === '--out') args.out = process.argv[++i];
  else if (process.argv[i] === '--config') args.config = process.argv[++i];
  else if (process.argv[i] === '--trends-stdin') args.trendsStdin = true;
}
const ay = args.ay != null ? args.ay - 1 : new Date().getMonth();

const { c, D } = yukle(args.config);
const YIL_SON = c.yilSon, YIL_ONC = c.yilOnc, RAPOR_YILI = c.raporYili;
// Web sürümünde havuzun tamamı gösterilir; kaydırma ve filtre okunurluğu sağlıyor.
const d = buildMailingData(D, ay, { yukselenLimit: 999, markaLimit: 999 });

let trends = null;
if (args.trendsStdin) {
  const raw = fs.readFileSync(0, 'utf8');
  if (raw.trim()) trends = JSON.parse(raw);
}
if (trends) d.yukselenler = trendsEkle(d.yukselenler, trends);
d.trendsDili = trendsDili(trends);

const trendsSol = (() => {
  if (!trends) return '';
  const b = trends.seriBaslangic ? new Date(trends.seriBaslangic) : null;
  const dt = (b && !Number.isNaN(b.getTime())) ? b : new Date(new Date().setFullYear(new Date().getFullYear() - 1));
  return `${TR_SHORT[dt.getUTCMonth()]} ${String(dt.getUTCFullYear()).slice(2)}`;
})();

// Ay sekmeleri: yalnızca çalışması hazırlanmış aylar bağlantılı olur.
// Diğerleri pasif görünür; hazır olmayan aya bağlantı vermek bozuk link üretirdi.
const HAZIR = c.hazirAylar;
const ayEtiketleri = TR_SHORT.map((kisa, i) => ({
  ad: `${kisa} '${String(RAPOR_YILI).slice(2)}`,
  aktif: i === ay,
  url: i === ay ? null : (HAZIR[i + 1] || null),
})).filter((_, i) => i >= c.ilkAy - 1);   // Öncesi için çalışma yok

const html = web.render(d, {
  brandName: c.marka,
  agencyLabel: c.ajans,
  logolar: c.logolar,
  ayEtiketleri,
  aktifAy: { yil: RAPOR_YILI },
  excelUrl: c.excelUrl,
  kapsam: `${D.keywords.length.toLocaleString('tr-TR')} keyword · ${D.brands.length.toLocaleString('tr-TR')} marka · ${YIL_ONC} ve ${YIL_SON} takvim yılları`
    + (trends ? ` | ${d.trendsDili.ozetEtiketi}: Google Trends · ${trendsSol} - ${trends.tarih || 'güncel'}` : ''),
  yilSon: YIL_SON, yilOnc: YIL_ONC, trendsSol,
  ozet: buildOzet(d, Math.round((LIMITS.kwYukselisEsigi - 1) * 100), YIL_SON),
  aksiyonlar: buildAksiyonlar(d),
  sutunAciklama: sutunAciklamalari(d, YIL_SON, YIL_ONC, c.marka),
});

const out = args.out || path.join(ROOT, 'out', `web-${TR_MONTHS[ay].toLocaleLowerCase('tr-TR')}.html`);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html, 'utf8');

console.log(`\n${TR_MONTHS[ay]} web raporu hazır`);
console.log('─'.repeat(52));
console.log(`Yükselen başlık     : ${d.yukselenler.length}`);
console.log(`Trends takibinde    : ${d.yukselenler.filter(r => r.trends).length}`);
console.log(`Alt kategori (Kat 2): ${d.altKategoriler.length}`);
console.log(`Marka fırsatı       : ${d.markalar.length}`);
console.log(`Ay sekmesi          : ${ayEtiketleri.length}`);
console.log('─'.repeat(52));
console.log(`Çıktı: ${path.relative(ROOT, out)} (${Math.round(html.length / 1024)} KB)\n`);
