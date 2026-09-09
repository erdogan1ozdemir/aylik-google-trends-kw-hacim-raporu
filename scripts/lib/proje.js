// scripts/lib/proje.js
// Markaya özel her şey tek noktada toplanır: veri dosyası, dönem yılları,
// logolar, ay sekmeleri. Şablonlar ve hesap katmanı marka bilmez.
//
// Kullanım: node scripts/build-web.js --config proje.json --ay 11

const fs = require('fs');
const path = require('path');

// Logo dosyası data: URI'ye çevrilir. Dış adresten çekilen logo hem içerik
// güvenlik politikasına takılabiliyor hem de raporun tek dosya olarak
// taşınabilirliğini bozuyor (İçerik Dili Rehberi Bölüm 15.1).
function dataUri(dosya, kok) {
  const p = path.isAbsolute(dosya) ? dosya : path.resolve(kok, dosya);
  if (!fs.existsSync(p)) throw new Error(`Logo bulunamadı: ${p}`);
  const uzanti = path.extname(p).toLowerCase();
  const tipler = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
  const tip = tipler[uzanti];
  if (!tip) throw new Error(`Desteklenmeyen logo biçimi: ${uzanti} (svg, png, jpg, webp)`);
  return `data:${tip};base64,${fs.readFileSync(p).toString('base64')}`;
}

function konfigOku(yol) {
  if (!fs.existsSync(yol)) throw new Error(`Yapılandırma bulunamadı: ${yol}`);
  const kok = path.dirname(path.resolve(yol));
  const c = JSON.parse(fs.readFileSync(yol, 'utf8'));

  const zorunlu = ['marka', 'veri', 'yilSon', 'yilOnc', 'raporYili'];
  const eksik = zorunlu.filter(k => c[k] === undefined);
  if (eksik.length) throw new Error(`Yapılandırmada eksik alan: ${eksik.join(', ')}`);

  return {
    kok,
    marka: c.marka,
    ajans: c.ajans || 'Inbound',
    yilSon: c.yilSon,           // GKP verisinin son tam yılı (ör. 2025)
    yilOnc: c.yilOnc,           // karşılaştırma yılı (ör. 2024)
    raporYili: c.raporYili,     // raporun ait olduğu yıl, Trends bu yılı gösterir
    veri: path.isAbsolute(c.veri) ? c.veri : path.resolve(kok, c.veri),
    excelUrl: c.excelUrl || process.env.EXCEL_URL || null,
    // Yayınlanmış ayların adresleri; sekmelerde yalnızca bunlar bağlantılı olur.
    hazirAylar: c.hazirAylar || {},
    // Sekmelerin başladığı ay (1-12). Öncesi için çalışma yoksa gösterilmez.
    ilkAy: c.ilkAy || 1,
    logolar: {
      marka: dataUri(c.logoMarka, kok),
      ajans: dataUri(c.logoAjans, kok),
    },
  };
}

// Veri sözleşmesi doğrulanır. Eksik alan sessizce boş tabloya dönüşmesin diye
// üretim burada durur; yanlış biçimli veri raporda fark edilmeden geçebilir.
function veriOku(yol, { yilSon, yilOnc }) {
  if (!fs.existsSync(yol)) throw new Error(`Veri bulunamadı: ${yol}`);
  const D = JSON.parse(fs.readFileSync(yol, 'utf8'));

  if (!Array.isArray(D.keywords) || !D.keywords.length) {
    throw new Error('Veride "keywords" dizisi bulunamadı veya boş.');
  }
  const ornek = D.keywords[0];
  for (const alan of ['kw', 'k1', 'm24', 'm25']) {
    if (ornek[alan] === undefined) throw new Error(`keywords kayıtlarında "${alan}" alanı yok.`);
  }
  const bozuk = D.keywords.filter(k => !Array.isArray(k.m24) || k.m24.length !== 12
                                    || !Array.isArray(k.m25) || k.m25.length !== 12);
  if (bozuk.length) {
    throw new Error(`${bozuk.length} kayıtta m24/m25 on iki elemanlı dizi değil. İlki: ${bozuk[0].kw}`);
  }

  // brands opsiyoneldir: "katalogda yer almayan büyüyen markalar" bölümü
  // yalnızca kendi kataloğunu bilen markalarda anlamlı (bkz. SKILL.md).
  D.brands = Array.isArray(D.brands) ? D.brands : [];
  if (D.brands.length) {
    const b = D.brands[0];
    for (const alan of ['brand', 'catalog', 'r12', 'ryoy']) {
      if (b[alan] === undefined) throw new Error(`brands kayıtlarında "${alan}" alanı yok.`);
    }
  }

  D.meta = { yilSon, yilOnc };
  return D;
}

function yukle(configYolu) {
  const c = konfigOku(configYolu);
  return { c, D: veriOku(c.veri, c) };
}

module.exports = { yukle, konfigOku, veriOku, dataUri };
