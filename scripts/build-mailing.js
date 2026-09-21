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

const ROOT = path.join(__dirname, '..');

function parseArgs(argv) {
  const a = { ay: null, out: null, trendsStdin: false, genislik: 640, config: 'proje.json' };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--ay') a.ay = Number(argv[++i]);
    else if (argv[i] === '--config') a.config = argv[++i];
    else if (argv[i] === '--out') a.out = argv[++i];
    else if (argv[i] === '--trends-stdin') a.trendsStdin = true;
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

// Açılış bloğu: giriş cümlesi + madde listesi.
// Üç iş yapar: ayın yıl içindeki yerini söyler, bu tablonun kategorilere eşit
// dağılmadığını adlarıyla ve sayılarıyla gösterir, sonra okuyucuyu aşağıdaki
// listeye bağlar. Tek bir keyword üzerinden kurulmaz - örnek keyword seçmek
// ayın hikayesini o kelimenin şansına bırakıyordu.
// Hangi yılın verisi olduğu her maddede açıkça yazılır; "yılın en düşük ayı"
// ifadesi tek başına hangi yıl olduğunu söylemiyordu.
function buildOzet(d, esikYuzde, yilSon) {
  const o = d.ozet;
  const n = o.siraYil;
  const maddeler = [];

  // 1) Ayın yıl içindeki yeri
  const sira = n === 1 ? `${yilSon} yılının en yüksek hacimli ayıdır`
    : n === 12 ? `${yilSon} yılının en düşük hacimli ayıdır`
      : `${yilSon} yılı içinde hacim sıralamasında ${n}. sıradadır`;
  // "2025 yılının ... ayıdır; toplam hacim 2025 yıl ortalamasının ..." tekrarını
  // önlemek için ikinci yarıda yıl tekrar yazılmaz.
  const sapma = Math.round(Math.abs(o.endeks - 1) * 100);
  const yon = o.endeks >= 1.02 ? `yıl ortalamasının %${sapma} üzerindedir`
    : o.endeks <= 0.98 ? `yıl ortalamasının %${sapma} altındadır`
      : 'yıl ortalamasına yakındır';
  maddeler.push(`${sira}; toplam hacim ${yon}.`);

  // 2) Kategoriler arası ayrışma (Kat 2 - aşağıdaki tabloyla aynı seviye)
  const sirali = [...d.altKategoriler].filter(r => r.endeks != null)
    .sort((a, b) => b.endeks - a.endeks);
  const ust = sirali[0], alt = sirali[sirali.length - 1];
  if (ust && alt && (ust.endeks - alt.endeks) > 0.15) {
    maddeler.push(`Kategoriler eşit dağılmamaktadır: <strong>${ust.kat}</strong> `
      + `${fmtIdx(ust.endeks)} ile yıl ortalamasının üzerine çıkarken, `
      + `<strong>${alt.kat}</strong> ${fmtIdx(alt.endeks)} ile en geride kalmaktadır.`);
    maddeler.push('Aradaki fark, ayın tek bir toplam hacim rakamıyla planlanamayacağını göstermektedir.');
  }

  // 3) Havuz ve listelenen kısım
  if (d.yukselenler.length) {
    const havuz = d.havuzAdet || d.yukselenler.length;
    maddeler.push(`Kendi yıl ortalamasının en az %${esikYuzde} üzerine çıkan `
      + `<strong>${havuz} başlık</strong> bulunmaktadır; aşağıda hacme göre ilk `
      + `${d.yukselenler.length} tanesi listelenmektedir.`);
  }

  return { giris: `${d.ayAdi} ${yilSon} genel görünümü:`, maddeler };
}

// Veriden türetilen, öneri kipinde aksiyon maddeleri.
function buildAksiyonlar(d) {
  const out = [];
  const ay = d.ayAdi;

  // 1) En yüksek endeksli başlıklar - içerik ve kampanya hazırlığı
  const enYuksek = (d.keskinler || []).slice(0, 3);
  if (enYuksek.length) {
    const liste = enYuksek.map(r => `<strong>${r.kw}</strong> (${fmtIdx(r.endeks)})`).join(', ');
    out.push(`${ay} ayında yıl ortalamasının en belirgin üzerine çıkan başlıklar ${liste} olarak öne çıkmaktadır. İlgili listeleme sayfalarının içerik ve kampanya hazırlığının ay başlamadan tamamlanması değerlendirilebilir.`);
  }

  // 2) Mevsimsel olarak öne çıkan kategori
  const oneCikan = d.altKategoriler.filter(r => r.endeks != null && r.endeks >= 1.10)
    .sort((a, b) => b.endeks - a.endeks)[0];
  if (oneCikan) {
    out.push(`Kategori düzeyinde <strong>${oneCikan.kat}</strong> ${fmtIdx(oneCikan.endeks)} ile ayrışmaktadır. Bu kategoride ana sayfa ve kategori girişi görünürlüğünün artırılması potansiyel taşımaktadır.`);
  }

  // 3) Yıl geneline göre en dirençli kategori
  const dirençli = d.altKategoriler.filter(r => r.fark != null).sort((a, b) => b.fark - a.fark)[0];
  if (dirençli && dirençli.fark > 0.01) {
    out.push(`<strong>${dirençli.kat}</strong> kategorisi ${ay} ayında yıl geneline kıyasla ${(dirençli.fark * 100).toFixed(0)} puan daha dirençli seyretmektedir. Pazar genelindeki daralmaya karşın bu kategoride bütçe korunması değerlendirilebilir.`);
  }

  // 4) Alt kırılım büyümesi
  if (d.buyuyenler.length) {
    const ilk = d.buyuyenler.slice(0, 2).map(r => `<strong>${r.k3}</strong> (${fmtPct(r.yoy)})`).join(' ve ');
    out.push(`Alt kırılımda ${ilk} yıllık bazda büyümektedir. Bu başlıklarda içerik derinliği ve iç linkleme çalışması öncelikli olarak ele alınabilir.`);
  }

  // 5) Marka fırsatı
  if (d.markalar.length) {
    const m = d.markalar[0];
    out.push(`Katalogda yer almayan markalar arasında <strong>${m.brand}</strong> aylık ${fmtVol(m.aylik)} arama ve ${fmtPct(m.yoy)} büyüme ile öne çıkmaktadır. Katalog genişletme değerlendirmesine dahil edilebilir.`);
  }

  return out;
}

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
    aksiyonlar: buildAksiyonlar(d),
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
