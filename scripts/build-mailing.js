// scripts/build-mailing.js
// Aylık arama talebi brifingi (e-posta HTML) üretir.
//
// Kullanım:
//   node scripts/build-mailing.js               → içinde bulunulan ay
//   node scripts/build-mailing.js --ay 9        → Eylül
//   node scripts/build-mailing.js --ay 10 --out out/ekim.html
//   node scripts/build-mailing.js --ay 9 --web    → 980px genişlikte web sürümü
//
// Markaya özel her şey proje.json'da. Çıktı out/ altına yazılır ve doğrudan
// e-posta gövdesine yapıştırılabilir.

const fs = require('fs');
const path = require('path');
const { buildMailingData, trendsEkle, trendsDili, TR_MONTHS, LIMITS } = require('./lib/mailing-data');
const { render, fmtVol, fmtPct, fmtIdx } = require('./lib/mailing-template');

const { yukle } = require('./lib/proje');
const { buildOzet, buildAksiyonlar } = require('./lib/rapor-metin');
const { adimlariAl } = require('./lib/adimlar');

const ROOT = path.join(__dirname, '..');

function parseArgs(argv) {
  const a = { ay: null, out: null, trendsStdin: false, genislik: 640, config: 'proje.json' };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--ay') a.ay = Number(argv[++i]);
    else if (argv[i] === '--config') a.config = argv[++i];
    else if (argv[i] === '--out') a.out = argv[++i];
    else if (argv[i] === '--trends-stdin') a.trendsStdin = true;
    else if (argv[i] === '--adimlari-yenile') a.adimlariYenile = true;
    else if (argv[i] === '--genislik') a.genislik = Number(argv[++i]);
    // --web: tarayıcıda açılacak sürüm. E-posta istemcisi kısıtı geçerli
    // olmadığı için geniş ekranda içerik dar bir şerit halinde kalmaz.
    else if (argv[i] === '--web') a.genislik = 980;
  }
  return a;
}

// Google Trends verisi stdin'den boru ile geçilir; diske hiçbir şey yazılmaz
// ve kimlik bilgisi gerekmez. Beklenen biçim:
//   { tarih, kelimeler: { "<kw>": { simdi, gecenYilAyniHafta, zirve, son4Hafta } } }
function readTrendsStdin() {
  let raw = '';
  try { raw = fs.readFileSync(0, 'utf8'); } catch { return null; }
  if (!raw.trim()) return null;
  try {
    const t = JSON.parse(raw);
    if (!t || typeof t !== 'object' || !t.kelimeler) {
      throw new Error('"kelimeler" alanı bulunamadı');
    }
    return t;
  } catch (e) {
    // Bozuk girdi sessizce yutulmaz: Trends'siz üretmek yerine durdurulur,
    // aksi halde eksik katman fark edilmeden teslim edilebilir.
    throw new Error(`Trends girdisi okunamadı (${e.message}).`);
  }
}

// Özet ve adımlar web raporuyla tek kaynaktan gelir (lib/rapor-metin.js).
// Önceden burada birer kopyası vardı; iki kopya ayrı güncellenince e-posta ile
// web farklı metin yazıyordu.

function main() {
  const args = parseArgs(process.argv);
  const ay = args.ay != null ? args.ay - 1 : new Date().getMonth();
  if (!(ay >= 0 && ay <= 11)) {
    console.error('Hata: --ay 1 ile 12 arasında olmalı.');
    process.exit(1);
  }

  const { c, D } = yukle(args.config);
  const YIL_SON = c.yilSon, YIL_ONC = c.yilOnc;
  const d = buildMailingData(D, ay);

  // Canlı Trends katmanı (varsa)
  const trends = args.trendsStdin ? readTrendsStdin() : null;
  if (trends) d.yukselenler = trendsEkle(d.yukselenler, trends);
  d.trendsDili = trendsDili(trends);

  // Adımlar e-postada da tam havuzdan üretilir: e-posta yalnızca ilk 30 başlığı
  // yükler, anlık görüntü hangi betik önce çalışırsa ona göre yazılmasın.
  const dTam = buildMailingData(D, ay, { yukselenLimit: 999, markaLimit: 999 });
  if (trends) dTam.yukselenler = trendsEkle(dTam.yukselenler, trends);
  dTam.trendsDili = d.trendsDili;
  const adim = adimlariAl({ d: dTam, ay, raporYili: c.raporYili, trends, dizin: c.adimlarDizini, yenile: !!args.adimlariYenile, uret: buildAksiyonlar });
  const trendsKapsam = trends
    ? d.yukselenler.filter(r => r.trends).length
    : 0;

  // Trends serisinin sol ucu = bugünden 52 hafta öncesi. GKP tablolarının
  // dönemi (2024-2025) ile karıştırılmaması için ayrıca hesaplanır.
  const trendsSol = (() => {
    if (!trends) return '';
    const b = trends.seriBaslangic ? new Date(trends.seriBaslangic) : null;
    const dt = (b && !Number.isNaN(b.getTime()))
      ? b
      : new Date(new Date().setFullYear(new Date().getFullYear() - 1));
    const { TR_SHORT } = require('./lib/mailing-data');
    return `${TR_SHORT[dt.getMonth()]} ${String(dt.getFullYear()).slice(2)}`;
  })();

  // Kapsam beyanı: veri hangi yılları kapsıyor (Bölüm 6.3 - dönem şeffaflığı)
  const donemNotu = trends
    ? `${TR_MONTHS[ay]} ayının ${YIL_ONC} ve ${YIL_SON} arama hacmi & ${c.raporYili} Google Trends verilerinden çıkarılan talep görünümü`
    : `${TR_MONTHS[ay]} ayının ${YIL_ONC} ve ${YIL_SON} arama hacminden çıkarılan talep görünümü`;

  const html = render(d, {
    brandName: c.marka,
    agencyLabel: c.ajans,
    logolar: c.logolar,
    donemNotu,
    dashboardUrl: process.env.DASHBOARD_URL || null,
    aksiyonlar: adim.maddeler,
    adimNotu: adim.not,
    ozet: buildOzet(d, Math.round((LIMITS.kwYukselisEsigi - 1) * 100), YIL_SON),
    kapsam: `${D.keywords.length.toLocaleString('tr-TR')} keyword`
      + (D.brands.length ? ` · ${D.brands.length.toLocaleString('tr-TR')} marka` : '')
      + ` · ${YIL_ONC} ve ${YIL_SON} takvim yılları`
      + (trends ? ` | ${d.trendsDili.ozetEtiketi}: Google Trends · ${trendsSol} - ${trends.tarih || 'güncel'}` : ''),
    yilSon: YIL_SON,
    yilOnc: YIL_ONC,
    trendsSol,
    excelUrl: process.env.EXCEL_URL || null,
    excelAd: trends ? `${d.yukselenler.filter(r => r.trends).length} başlığın` : null,
    genislik: args.genislik,
  });

  const outPath = args.out
    ? path.resolve(ROOT, args.out)
    : path.join(ROOT, 'out', `mailing-${String(ay + 1).padStart(2, '0')}-${TR_MONTHS[ay].toLocaleLowerCase('tr-TR')}.html`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html, 'utf8');

  // ——— Özet log ———
  console.log(`\n${TR_MONTHS[ay]} brifingi hazır`);
  console.log('─'.repeat(52));
  console.log(`Ayın hacmi (2025)   : ${fmtVol(d.ozet.hacim25)}`);
  console.log(`Mevsimsel endeks    : ${fmtIdx(d.ozet.endeks)}  (yıl içi ${d.ozet.siraYil}. sıra)`);
  console.log(`Aya özel YoY        : ${fmtPct(d.ozet.ayYoY)}`);
  console.log(`Yükselen başlık     : ${d.yukselenler.length}`);
  console.log(`Keskin yükseliş     : ${d.keskinler.length} (havuz ${d.havuzAdet})`);
  console.log(`Alt kategori (Kat 2): ${d.altKategoriler.length}`);
  console.log(`Alt kırılım büyüyen : ${d.buyuyenler.length}`);
  console.log(`Marka fırsatı       : ${d.markalar.length}`);
  console.log(`Canlı Trends        : ${trends ? trendsKapsam + ' / ' + d.yukselenler.length + ' keyword' : 'yok'}`);
  console.log('─'.repeat(52));
  console.log(`Çıktı: ${path.relative(ROOT, outPath)}\n`);
}

if (require.main === module) {
  try { main(); }
  catch (e) { console.error('Hata:', e.message); process.exit(1); }
}
