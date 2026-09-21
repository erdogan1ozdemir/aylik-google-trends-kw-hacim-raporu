// scripts/build-excel-data.js
// Excel üretimi için veri hazırlar; hesaplama JS tarafında, biçimlendirme
// Python (openpyxl) tarafında. Ayrım bilinçli: hesap mantığı mailing ile ortak
// kalsın, Excel stil kuralları tek yerde toplansın.
//
// Kullanım: node scripts/build-excel-data.js --ay 9 --trends-stdin < trends.json

const fs = require('fs');
const path = require('path');
const { buildMailingData, trendsEkle, trendsDili, TR_MONTHS, TR_SHORT } = require('./lib/mailing-data');

const { yukle } = require('./lib/proje');

const ROOT = path.join(__dirname, '..');

const args = { ay: null, trendsStdin: false, out: null, config: 'proje.json' };
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--ay') args.ay = Number(process.argv[++i]);
  else if (process.argv[i] === '--config') args.config = process.argv[++i];
  else if (process.argv[i] === '--trends-stdin') args.trendsStdin = true;
  else if (process.argv[i] === '--out') args.out = process.argv[++i];
}

const ay = args.ay != null ? args.ay - 1 : new Date().getMonth();
const { c, D } = yukle(args.config);
const YIL_SON = c.yilSon, YIL_ONC = c.yilOnc;
// Havuzun tamamı Excel'e girer: sayfada hacme göre ilk 30 gösteriliyor, ancak
// dosyada tüm aday başlıkların bulunması çalışma açısından daha kullanışlı.
const d = buildMailingData(D, ay, { yukselenLimit: 999, markaLimit: 999 });

let trends = null;
if (args.trendsStdin) {
  const raw = fs.readFileSync(0, 'utf8');
  if (raw.trim()) trends = JSON.parse(raw);
}
if (trends) d.yukselenler = trendsEkle(d.yukselenler, trends);

const ayAdi = TR_MONTHS[ay], ayKisa = TR_SHORT[ay];
const SAYFADA = 30;

const yuk = d.yukselenler.map((r, i) => ({
  kw: r.kw, k1: r.k1, k2: r.k2, k3: r.k3, marka: r.brand || '',
  hacimSon: r.hacim25,
  endeks: r.endeks,
  degisim: r.yoy,
  trSimdi: r.trends ? r.trends.simdi : null,
  tr30: r.trends ? r.trends.gun30Fark : null,
  trYoY: r.trends ? r.trends.yoyFark : null,
  trVekil: r.trends && r.trends.vekil ? r.trends.vekil : '',
  trEksik: r.trends ? r.trends.eksikHafta : null,
  sayfada: i < SAYFADA ? 'Evet' : 'Hayır',
}));

const cikti = {
  meta: {
    marka: c.marka, ay, ayAdi, ayKisa,
    yilSon: YIL_SON, yilOnc: YIL_ONC,
    trendsTarih: trends ? (trends.tarih || '') : '',
    trendsBaslangic: trends ? (trends.seriBaslangic || '') : '',
    trendsDil: trendsDili(trends),
    kwToplam: D.keywords.length, markaToplam: D.brands.length,
    havuzAdet: d.havuzAdet, sayfadaGosterilen: SAYFADA,
  },
  ozet: d.ozet,
  yukselenler: yuk,
  keskinler: d.keskinler.map(r => ({ kw: r.kw, k1: r.k1, endeks: r.endeks, hacimSon: r.hacim25, degisim: r.yoy })),
  altKategoriler: d.altKategoriler.map(r => ({ kat: r.kat, ust: r.ust, hacimSon: r.hacim25, endeks: r.endeks, degisim: r.ayYoY, fark: r.fark })),
  buyuyenler: d.buyuyenler.map(r => ({ k3: r.k3, k1: r.k1, hacimSon: r.hacim25, degisim: r.yoy })),
  markalar: d.markalar.map(r => ({ marka: r.brand, aylik: r.aylik, yoy: r.yoy, endeks: r.endeks })),
  trendsHaftalik: trends ? d.yukselenler.filter(r => r.trends).map(r => ({
    kw: r.kw, vekil: r.trends.vekil || '', haftalar: r.trends.haftalar, seri: r.trends.seri,
  })) : [],
};

const out = args.out || path.join(ROOT, 'out', 'excel-veri.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(cikti, null, 1), 'utf8');
console.log(`Excel verisi hazır: ${path.relative(ROOT, out)}`);
console.log(`  yükselen havuzu : ${yuk.length} (sayfada ${SAYFADA})`);
console.log(`  keskin          : ${cikti.keskinler.length}`);
console.log(`  alt kategori    : ${cikti.altKategoriler.length}`);
console.log(`  marka           : ${cikti.markalar.length}`);
console.log(`  Trends haftalık : ${cikti.trendsHaftalik.length} keyword`);
