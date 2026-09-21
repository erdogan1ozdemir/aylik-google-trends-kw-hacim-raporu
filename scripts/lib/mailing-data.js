// scripts/lib/mailing-data.js
// Aylık brifing mailing'i için hesaplama katmanı.
//
// Girdi: data/dashboard.js içindeki window.DATA (build-data.js çıktısı).
// Çıktı: seçilen takvim ayı için hazır bölümler (yükselenler, kategori tablosu,
// alt kırılım büyüyenleri, katalog dışı marka fırsatları).
//
// Mevsimsellik mantığı: iki tam takvim yılı (2024, 2025) elde olduğu için ayın
// profili bu iki yılın ortalamasından çıkarılır. "Tutarlı yükselen" tanımı iki
// yılda da yükselmeyi şart koşar; tek yıllık sıçramalar (kampanya, tek seferlik
// olay) böylece elenir.

const { mean } = require('./derive');

const TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const TR_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

// ——— Eşikler ———
// Hacim tabanları GKP gürültüsünü eler: bucketlanmış düşük hacimli kelimelerde
// yüzde değişimler yanıltıcı büyüklüklere ulaşıyor.
const LIMITS = {
  kwMinAyHacim: 20000,      // yükselen başlık listesine girmek için ayın hacmi
  kwMinYilOrt: 500,         // yıllık ortalama tabanı
  kwYukselisEsigi: 1.15,    // iki yılda da yıl ortalamasının %15 üzeri
  kat3MinAyHacim: 150000,   // alt kırılım büyüyen listesi
  kat3MinBuyume: 0.02,      // %2 altı değişim GKP bantlama gürültüsü sayılır
  markaMinAylik: 5000,      // katalog dışı marka aylık ortalama hacmi
  markaMinBuyume: 0.20,     // katalog dışı marka rolling YoY eşiği
};

// Bir aylık dizinin yıl ortalamasına oranı. Dizi yoksa veya ortalama sıfırsa null.
function ayEndeksi(aylik, ay) {
  if (!aylik || aylik.length < 12) return null;
  const ort = mean(aylik);
  if (!ort) return null;
  return aylik[ay] / ort;
}

// Ayın iki yıllık ortalama hacmi (2024 ve 2025 aynı ay).
function ayOrtHacim(k, ay) {
  const v24 = (k.m24 && k.m24[ay]) || 0;
  const v25 = (k.m25 && k.m25[ay]) || 0;
  return (v24 + v25) / 2;
}

// Aya özel YoY: Eyl 2024 → Eyl 2025. Baz sıfırsa null (oran tanımsız).
function ayYoY(k, ay) {
  const v24 = (k.m24 && k.m24[ay]) || 0;
  const v25 = (k.m25 && k.m25[ay]) || 0;
  if (!v24) return null;
  return (v25 - v24) / v24;
}

// ——— Bölüm 1: Ayın tutarlı yükselen başlıkları ———
// İki yılda da yıl ortalamasının üzerine çıkan, hacim tabanını geçen kelimeler.
function yukselenBasliklar(keywords, ay, limit = 12) {
  const out = [];
  for (const k of keywords) {
    if (!k.m24 || !k.m25) continue;
    const ort24 = mean(k.m24), ort25 = mean(k.m25);
    if ((ort24 + ort25) / 2 < LIMITS.kwMinYilOrt) continue;

    const i24 = ort24 ? k.m24[ay] / ort24 : 0;
    const i25 = ort25 ? k.m25[ay] / ort25 : 0;
    // Tutarlılık şartı iki yıla bakar (tek yıllık sıçramalar elenir); ancak
    // raporlanan endeks 2025'e dayanır, çünkü tabloda gösterilen hacim de 2025.
    // Aynı satırdaki sayıların hepsi aynı yıla ait olmalı.
    if (!(i24 > LIMITS.kwYukselisEsigi && i25 > LIMITS.kwYukselisEsigi)) continue;

    const hacim = ayOrtHacim(k, ay);
    if (hacim < LIMITS.kwMinAyHacim) continue;

    out.push({
      kw: k.kw, k1: k.k1, k2: k.k2, k3: k.k3, brand: k.brand,
      hacim,                       // sıralama için iki yıllık ortalama
      hacim25: k.m25[ay],          // 2025'in aynı ayı (tabloda gösterilen)
      endeks: i25,                 // 2025 yıl ortalamasına göre kaç kat
      yoy: ayYoY(k, ay),           // Eyl 2024 → Eyl 2025
    });
  }
  // Tekilleştirme: Google Keyword Planner eş anlamlıları ("okul çantası" ve
  // "okul çantaları") ayrı satır olarak verip aynı aylık diziyi taşıyor. Aynı
  // kategoride birebir aynı hacim imzasına sahip satırlardan yalnızca en kısa
  // yazım korunur; aksi halde liste aynı başlığın varyantlarıyla doluyor.
  const imza = new Map();
  for (const r of out) {
    const key = r.k1 + '|' + r.hacim + '|' + r.hacim25 + '|' + r.endeks.toFixed(4);
    const mevcut = imza.get(key);
    if (!mevcut || r.kw.length < mevcut.kw.length) imza.set(key, r);
  }
  // Sıralama gösterilen hacme (2025) göre yapılır; iki yıllık ortalamaya göre
  // sıralanınca hacim kolonu sırasız görünüyordu.
  return [...imza.values()]
    .sort((a, b) => b.hacim25 - a.hacim25)
    .slice(0, limit);
}

// ——— Bölüm 2: Kategori tablosu ———
// Ayın kategori profili: hacim, mevsimsel endeks, aya özel YoY ve yıl geneli YoY.
// Fark kolonu "bu kategori bu ayda yıl geneline göre daha mı dirençli" sorusunu
// cevaplar; pazar geneli daraldığında mutlak YoY tek başına ayrıştırıcı değil.
// seviye: 'k1' (ana kategori) veya 'k2' (alt kategori). minHacim, uzun kuyruğu
// eler - Kat 2'de 46 kırılımın tamamı listelenirse tablo okunmaz hale geliyor.
function kategoriTablosu(keywords, ay, { seviye = 'k1', minHacim = 0 } = {}) {
  const acc = {};
  for (const k of keywords) {
    const ad = k[seviye];
    if (!ad) continue;
    if (!acc[ad]) acc[ad] = { ust: k.k1, ay24: 0, ay25: 0, yil24: 0, yil25: 0, aylik24: Array(12).fill(0), aylik25: Array(12).fill(0) };
    const a = acc[ad];
    for (let i = 0; i < 12; i++) {
      a.aylik24[i] += (k.m24 && k.m24[i]) || 0;
      a.aylik25[i] += (k.m25 && k.m25[i]) || 0;
    }
  }
  const rows = [];
  for (const [kat, a] of Object.entries(acc)) {
    a.ay24 = a.aylik24[ay]; a.ay25 = a.aylik25[ay];
    a.yil24 = a.aylik24.reduce((s, x) => s + x, 0);
    a.yil25 = a.aylik25.reduce((s, x) => s + x, 0);
    const e24 = ayEndeksi(a.aylik24, ay), e25 = ayEndeksi(a.aylik25, ay);
    const ayY = a.ay24 ? (a.ay25 - a.ay24) / a.ay24 : null;
    const yilY = a.yil24 ? (a.yil25 - a.yil24) / a.yil24 : null;
    rows.push({
      kat,
      ust: a.ust,
      hacim: (a.ay24 + a.ay25) / 2,   // sıralama için
      hacim25: a.ay25,                // tabloda gösterilen: 2025'in aynı ayı
      endeks: e25,                    // 2025 yıl ortalamasına göre (hacimle aynı yıl)
      ayYoY: ayY,
      yilYoY: yilY,
      // Pozitif fark: kategori bu ayda yıl geneline göre daha dirençli
      fark: (ayY != null && yilY != null) ? (ayY - yilY) : null,
    });
  }
  return rows
    .filter(r => r.hacim25 >= minHacim)
    .sort((a, b) => b.hacim25 - a.hacim25);
}

// ——— Bölüm 3: Alt kırılımda (Kat 3) ayda büyüyenler ———
// Kat 1 pazar geneli daraldığında gerçek büyüme burada görünür.
function altKirilimBuyuyenler(keywords, ay, limit = 8) {
  const acc = {};
  for (const k of keywords) {
    if (!k.k3) continue;
    if (!acc[k.k3]) acc[k.k3] = { k1: k.k1, k2: k.k2, ay24: 0, ay25: 0, aylik25: Array(12).fill(0) };
    const a = acc[k.k3];
    a.ay24 += (k.m24 && k.m24[ay]) || 0;
    a.ay25 += (k.m25 && k.m25[ay]) || 0;
    for (let i = 0; i < 12; i++) a.aylik25[i] += (k.m25 && k.m25[i]) || 0;
  }
  return Object.entries(acc)
    .map(([k3, a]) => ({
      k3, k1: a.k1, k2: a.k2,
      hacim25: a.ay25,
      yoy: a.ay24 ? (a.ay25 - a.ay24) / a.ay24 : null,
      endeks: ayEndeksi(a.aylik25, ay),
    }))
    .filter(r => r.hacim25 >= LIMITS.kat3MinAyHacim && r.yoy != null && r.yoy > LIMITS.kat3MinBuyume)
    .sort((a, b) => b.yoy - a.yoy)
    .slice(0, limit);
}

// ——— Bölüm 4: Katalog dışı marka fırsatları ———
// Markanın katalogunda bulunmayan, büyüyen ve bu ayda hacimli markalar.
function markaFirsatlari(brands, ay, limit = 8) {
  return brands
    .filter(b => b.catalog !== 'Var')
    .filter(b => b.r12 >= LIMITS.markaMinAylik && b.ryoy != null && b.ryoy > LIMITS.markaMinBuyume)
    .map(b => ({
      brand: b.brand,
      aylik: b.r12,                     // son 12 ay aylık ortalama
      yoy: b.ryoy,                      // rolling 12 ay YoY
      endeks: ayEndeksi(b.m25, ay),     // bu ayın marka içindeki ağırlığı
      hacim25: (b.m25 && b.m25[ay]) || 0,
    }))
    .sort((a, b) => b.aylik - a.aylik)
    .slice(0, limit);
}

// ——— Dönem özeti ———
// Pazarın bu aydaki genel konumu: toplam hacim, mevsimsel endeks, YoY.
function donemOzeti(keywords, ay) {
  const aylik24 = Array(12).fill(0), aylik25 = Array(12).fill(0);
  for (const k of keywords) {
    for (let i = 0; i < 12; i++) {
      aylik24[i] += (k.m24 && k.m24[i]) || 0;
      aylik25[i] += (k.m25 && k.m25[i]) || 0;
    }
  }
  return {
    hacim25: aylik25[ay],
    hacim24: aylik24[ay],
    // Endeks 2025'e dayanır: KPI kartında gösterilen hacim de 2025'in aynı ayı
    endeks: ayEndeksi(aylik25, ay),
    ayYoY: aylik24[ay] ? (aylik25[ay] - aylik24[ay]) / aylik24[ay] : null,
    // Yılın hangi sırasında: 1 = en yüksek ay
    siraYil: [...aylik25].sort((a, b) => b - a).indexOf(aylik25[ay]) + 1,
  };
}

// ——— Google Trends canlı katmanı ———
// Trends her istekte kendi içinde 0-100 normalize ettiği için kelimeler arası
// kıyas yapılamaz; her kelime yalnızca kendi zaman serisi içinde yorumlanır.
// Bu yüzden her keyword ayrı istekle çekilir.
//
// Girdi (stdin ile geçilir, diske yazılmaz):
//   { tarih, kelimeler: { "<kw>": { seri: [<52-53 haftalık değer>] } } }
// Seri kronolojiktir: ilk değer bir yıl önceki aynı hafta, son değer son tamamlanmış hafta (çekim gününün haftası yarım kova olduğu için alınmaz).

const HAFTA_30GUN = 4;   // 4 hafta ≈ 30 gün

// Eksik haftaları (Trends bazen null döner) bir önceki değerle doldurur.
// Grafikte boşluk bırakmak, veriyi olduğundan düşük göstermekten daha yanıltıcı olurdu.
function seriyiTemizle(seri) {
  const out = [];
  let sonGecerli = 0;
  for (const v of seri) {
    const n = (v == null || Number.isNaN(Number(v))) ? sonGecerli : Number(v);
    out.push(n);
    sonGecerli = n;
  }
  return out;
}

// Serideki her haftanın başlangıç tarihini "31 Ağu 2025" biçiminde üretir.
// Trends haftalık veri döndürür; ilk haftanın tarihi verilirse kalanı 7'şer gün eklenerek bulunur.
function haftaEtiketleri(baslangic, adet) {
  if (!baslangic) return null;
  const t0 = new Date(baslangic);
  if (Number.isNaN(t0.getTime())) return null;
  const out = [];
  for (let i = 0; i < adet; i++) {
    const d = new Date(t0.getTime() + i * 7 * 86400000);
    out.push(`${d.getUTCDate()} ${TR_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`);
  }
  return out;
}

// Veri seyrekliği eşiği: bu oranın üzerinde boş hafta varsa değerler yön
// göstergesi sayılır, okuyucuya not düşülür.
const SEYREK_ESIK = 0.20;

function trendsDurumu(t, baslangic) {
  if (!t || !Array.isArray(t.seri) || t.seri.length < 8) return null;

  const eksikHafta = t.seri.filter(v => v == null || Number.isNaN(Number(v))).length;
  const seri = seriyiTemizle(t.seri);
  const n = seri.length;
  const simdi = seri[n - 1];
  const gecenYil = seri[0];                       // bir yıl önceki aynı hafta
  const otuzGunOnce = seri[n - 1 - HAFTA_30GUN];  // ~30 gün önce
  const zirve = Math.max(...seri);
  const zirveIdx = seri.indexOf(zirve);

  const oran = (a, b) => (b > 0 ? (a - b) / b : null);

  // Son 4 haftanın yönü
  const son4 = seri.slice(-4);
  let yon = null;
  if (son4.length >= 2 && son4[0] > 0) {
    const d = (son4[son4.length - 1] - son4[0]) / son4[0];
    yon = d > 0.15 ? 'yukselis' : d < -0.15 ? 'dusus' : 'yatay';
  }

  const zirveOran = zirve ? simdi / zirve : null;
  let durum;
  if (zirveOran != null && zirveOran >= 0.85) {
    durum = yon === 'dusus' ? 'Zirve geçildi' : 'Zirvede';
  } else if (yon === 'yukselis') {
    durum = 'Yükselişte';
  } else if (yon === 'dusus') {
    durum = 'Geriliyor';
  } else {
    durum = 'Yatay';
  }

  return {
    seri, simdi, gecenYil, otuzGunOnce, zirve, zirveIdx, yon, durum,
    haftalar: haftaEtiketleri(baslangic, seri.length),
    // vekil: ölçümün farklı bir terim üzerinden yapıldığı durumlar (anlam karışması)
    vekil: t.vekil || null,
    eksikHafta,
    seyrek: eksikHafta / seri.length >= SEYREK_ESIK,
    yoyFark: oran(simdi, gecenYil),        // geçen yılın aynı haftasına göre
    gun30Fark: oran(simdi, otuzGunOnce),   // son 30 güne göre
    sonNIndex: n - 1 - HAFTA_30GUN,        // grafikte "son 30 gün" vurgusunun başladığı yer
  };
}

// Yükselen başlıklara Trends katmanını iliştirir. Veri gelmeyen kelimeler
// null taşır; şablon o hücreyi boş gösterir (eksik veri maskelenmez).
// Trends ifadelerinin tek kaynağı. Serinin son kovası çekim gününün haftası değil,
// son tamamlanmış haftadır (trends-cekimi.md); "bu hafta" demek yanlış olur.
// Geçmiş aylar ay sonunda dondurulur; o sayfalarda "Canlı" demek de yanlış olur.
function trendsDili(tr) {
  const donmus = !!(tr && tr.donmus);
  const hafta = tr && tr.sonHafta ? tr.sonHafta : null;
  return {
    donmus,
    sutun: donmus ? 'Ay Sonu' : 'Canlı',
    haftaTarih: hafta || '',
    sonHafta: hafta ? `son hafta (${hafta})` : 'son hafta',
    kaynak: donmus
      ? 'ay sonunda sabitlenmiş Google Trends verisine'
      : 'haftalık güncellenen Google Trends verisine',
    ozetEtiketi: donmus ? 'Ay sonu arama ilgisi' : 'Canlı arama ilgisi',
  };
}

function trendsEkle(yukselenler, trendsGirdi) {
  if (!trendsGirdi || !trendsGirdi.kelimeler) return yukselenler;
  return yukselenler.map(r => ({
    ...r,
    trends: trendsDurumu(trendsGirdi.kelimeler[r.kw], trendsGirdi.seriBaslangic),
  }));
}

// Aynı havuzun mevsimsel keskinliğe göre sıralanmış hali.
// Hacim sıralaması yüksek hacimli ama ılımlı mevsimsel başlıkları öne çıkarıyor;
// asıl planlama değeri taşıyan keskin yükselişler (endeksi 3x-6x olanlar) listenin
// dibinde kalıyordu. Bu görünüm onları ayrıca yüzeye çıkarır.
function enKeskinYukselenler(havuz, limit = 15) {
  return [...havuz].sort((a, b) => b.endeks - a.endeks).slice(0, limit);
}

// Canlı izlemeye alınacak başlıklar: hacme göre ilk N.
// Trends her kelimeyi ayrı istekte çekmeyi gerektiriyor (toplu istekte küçük
// hacimli kelime, en büyüğüne göre normalize edilip okunamaz hale geliyor),
// bu yüzden kapsam bilinçli olarak sınırlı tutulur.
function canliIzlenecekler(yukselenler, n = 6) {
  return yukselenler.slice(0, n).map(r => r.kw);
}

function buildMailingData(D, ay, { yukselenLimit = 30, keskinLimit = 15, kat2MinHacim = 100000, markaLimit = 8 } = {}) {
  // Havuz bir kez hesaplanır; iki farklı sıralamayla sunulur.
  const havuz = yukselenBasliklar(D.keywords, ay, 400);
  return {
    ay,
    ayAdi: TR_MONTHS[ay],
    ayKisa: TR_SHORT[ay],
    ozet: donemOzeti(D.keywords, ay),
    havuzAdet: havuz.length,
    yukselenler: havuz.slice(0, yukselenLimit),
    keskinler: enKeskinYukselenler(havuz, keskinLimit),
    kategoriler: kategoriTablosu(D.keywords, ay, { seviye: 'k1' }),
    altKategoriler: kategoriTablosu(D.keywords, ay, { seviye: 'k2', minHacim: kat2MinHacim }),
    buyuyenler: altKirilimBuyuyenler(D.keywords, ay),
    markalar: markaFirsatlari(D.brands, ay, markaLimit),
  };
}

module.exports = {
  TR_MONTHS, TR_SHORT, LIMITS,
  ayEndeksi, ayOrtHacim, ayYoY,
  yukselenBasliklar, enKeskinYukselenler, kategoriTablosu, altKirilimBuyuyenler, markaFirsatlari, donemOzeti,
  trendsDurumu, trendsEkle, trendsDili, canliIzlenecekler, haftaEtiketleri, SEYREK_ESIK,
  buildMailingData,
};
