// scripts/lib/mailing-template.js
// E-posta güvenli HTML üretimi.
//
// Kısıtlar (bilinçli): tablo tabanlı yerleşim, inline CSS, harici font yok,
// görsel yok. Gmail data: URI görselleri engelliyor, Outlook flex/grid
// desteklemiyor; bu yüzden yerleşim <table> ile, tipografi sistem font
// yığınıyla kuruluyor.
//
// genislik: e-posta gövdesi için 640 (istemcilerin güvenli sınırı), tarayıcıda
// açılan web sürümü için daha geniş. İçerideki her tablo width:100% olduğu için
// tek parametre bütün yerleşimi ölçekler.
//
// Dil ve biçim İçerik Dili Rehberi [A] kurumsal rejimine göre:
// yüzde işareti sayıdan önce (-%16), ondalık ayırıcı nokta, em dash yok,
// emoji yok, öneriler "-ebilir" kipinde.

const C = {
  teal: '#10332F',
  coral: '#FF7B52',
  coralDeep: '#E85F36',
  coralTint: '#FFE3D8',
  green: '#2E7D32',
  greenWash: '#C8E6C9',
  red: '#D32F2F',
  redWash: '#FFCDD2',
  gold: '#F5A623',
  ink: '#10332F',
  ink2: '#4A4A4A',
  ink3: '#7A7A7A',
  line: '#E0E0E0',
  surface: '#F7F5F2',
  bg: '#EFEDE9',
};

// Geniş (web) sürümde düz metin blokları bu genişlikte sınırlanır. Tablolar ve
// grafikler kabın tamamını kullanmaya devam eder; yalnızca paragraf satır uzunluğu
// okunur bantta tutulur. E-posta sürümünde (640px) devre dışı kalır.
let PROSE_MAX = null;

// Web sürümünde CSS tooltip kullanılır. Native title ipucu ~1 saniye gecikmeyle
// ve imlecin yanında beliriyor, kolayca kaçırılıyor; CSS tooltip anında ve
// öğenin altında çıkar. E-posta sürümünde CSS :hover çalışmadığı için title
// özniteliği korunur - orada mevcut tek seçenek odur.
let CSS_TOOLTIP = false;

// Bir öğeye ipucu bağlar. Web'de class+data-tip, e-postada title döner.
// hiza 'r' ise ipucu sağ kenara yaslanır (sağa hizalı sütunlarda taşmayı önler).
function ipucu(metin, hiza) {
  if (!metin) return '';
  if (!CSS_TOOLTIP) return ` title="${esc(metin)}"`;
  return ` class="tip${hiza === 'r' ? ' tip-r' : ''}" data-tip="${esc(metin)}"`;
}

// Yalnızca web sürümüne eklenen stil bloğu.
function tooltipStil() {
  if (!CSS_TOOLTIP) return '';
  return `<style>
  .tip { position: relative; cursor: help; }
  .tip::after {
    content: attr(data-tip);
    position: absolute; top: calc(100% + 7px); left: 0;
    width: 258px; max-width: 258px;
    background: ${C.teal}; color: #FFFFFF;
    padding: 9px 11px; border-radius: 6px;
    font-family: ${FONT};
    font-size: 11.5px; font-weight: 500; line-height: 1.45;
    letter-spacing: 0; text-transform: none; text-align: left;
    white-space: normal;
    box-shadow: 0 4px 16px rgba(16,51,47,.24);
    opacity: 0; visibility: hidden; transition: opacity .12s ease;
    pointer-events: none; z-index: 50;
  }
  .tip.tip-r::after { left: auto; right: 0; }
  .tip:hover::after, .tip:focus-visible::after { opacity: 1; visibility: visible; }
  /* Trends bölümü kendi içinde kaydırılır; 30 grafik sayfayı aşırı uzatıyordu */
  .trend-kaydir {
    max-height: 620px; overflow-y: auto; overflow-x: hidden;
    border: 1px solid ${C.line}; border-radius: 10px;
    padding: 4px 0 12px; background: #FFFFFF;
  }
  .trend-kaydir::-webkit-scrollbar { width: 10px; }
  .trend-kaydir::-webkit-scrollbar-track { background: ${C.surface}; border-radius: 8px; }
  .trend-kaydir::-webkit-scrollbar-thumb { background: #C9C2B8; border-radius: 8px; border: 2px solid ${C.surface}; }
  .trend-kaydir::-webkit-scrollbar-thumb:hover { background: #ADA69B; }
  /* Tablodaki arama adı, ilgili grafiğe bağlanır */
  a.kw-link { color: inherit; text-decoration: none; border-bottom: 1px dotted #B9B2A8; }
  a.kw-link:hover { border-bottom-color: ${C.coralDeep}; color: ${C.coralDeep}; }
  </style>`;
}

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";

// ——— Biçimlendiriciler ———
function fmtVol(n) {
  if (n == null) return '-';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(Math.round(n));
}
// İşaret %'den önce gelir: +%33, -%16
function fmtPct(v, { isaret = true } = {}) {
  if (v == null) return '-';
  const p = v * 100;
  const s = isaret && p > 0 ? '+' : (p < 0 ? '-' : '');
  return s + '%' + Math.abs(p).toFixed(0);
}
// Çarpan biçimi İçerik Dili Rehberi Bölüm 6.1'e göre: 1.27x (x1.27 değil)
function fmtIdx(v) { return v == null ? '-' : v.toFixed(2) + 'x'; }
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Değişim rozetleri: pozitif yeşil, negatif kırmızı, nötr gri
function rozet(v) {
  if (v == null) return `<span style="color:${C.ink3}">-</span>`;
  const pos = v > 0.005, neg = v < -0.005;
  const bg = pos ? C.greenWash : neg ? C.redWash : '#F0EDE8';
  const fg = pos ? C.green : neg ? C.red : C.ink2;
  return `<span style="display:inline-block;padding:2px 7px;border-radius:11px;background:${bg};color:${fg};font-size:12px;font-weight:700;white-space:nowrap">${fmtPct(v)}</span>`;
}

// Keyword'den anchor kimliği. Türkçe karakterler ve boşluk temizlenir.
function kwId(kw) {
  return 'tr-' + String(kw).toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ——— Mini trend grafiği ———
// E-posta istemcileri JavaScript ve SVG'yi güvenilir biçimde çalıştırmadığı için
// grafik tablo hücreleri + arka plan renkli div'lerle kuruluyor; Gmail, Outlook
// ve Apple Mail'de aynı görünür. Son 30 günlük pencere vurgulu renkte.
function miniTrendGrafik(t, { yukseklik = 52, kw = '' } = {}) {
  const seri = t.seri;
  const maks = Math.max(...seri, 1);
  // Hücre genişlikleri yüzde: dar ekranlarda (mobil e-posta) grafik yatay
  // taşma yaratmadan küçülür. Sabit piksel verilseydi 53 çubuk 530px'e
  // kilitlenip telefonda yatay kaydırma oluştururdu.
  const pay = (100 / seri.length).toFixed(3);
  const hucreler = seri.map((v, i) => {
    const h = Math.max(2, Math.round((v / maks) * yukseklik));
    const renk = i >= t.sonNIndex ? C.coralDeep : '#D6D0C8';
    // title: tarayıcının kendi ipucu. E-postada JavaScript çalışmadığı için
    // hover bilgisini yalnızca bu öznitelik taşıyabiliyor.
    const hafta = t.haftalar && t.haftalar[i];
    // İpucu grafiğin ne ölçtüğünü de söyler; çubuğa gelen kişi hangi terim,
    // hangi hafta ve hangi metrik olduğunu tek yerde görür.
    const parcalar = [
      kw,
      hafta ? `${hafta} haftası` : null,
      `arama ilgisi ${v}/100`,
      i >= t.sonNIndex ? '(son 30 gün)' : null,
    ].filter(Boolean);
    const ipucu = parcalar.join(' · ');
    return `<td width="${pay}%" valign="bottom" title="${esc(ipucu)}" style="padding:0 1px;font-size:0;line-height:0;cursor:default">`
      + `<div style="width:100%;height:${h}px;background:${renk};font-size:0;line-height:0">&nbsp;</div>`
      + `</td>`;
  }).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;table-layout:fixed">`
    + `<tr style="height:${yukseklik}px">${hucreler}</tr></table>`;
}

// Metrik rozeti: etiket üstte, değer altta
function metrikRozet(etiket, deger) {
  const pos = deger != null && deger > 0.005;
  const neg = deger != null && deger < -0.005;
  const fg = pos ? C.green : neg ? C.red : C.ink2;
  const bg = pos ? C.greenWash : neg ? C.redWash : '#F0EDE8';
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="padding:0">`
    + `<div style="font-size:9.5px;letter-spacing:.05em;text-transform:uppercase;color:${C.ink3};font-weight:700;white-space:nowrap">${esc(etiket)}</div>`
    + `<div style="margin-top:3px;display:inline-block;padding:3px 9px;border-radius:12px;background:${bg};color:${fg};font-size:14px;font-weight:700;white-space:nowrap">${fmtPct(deger)}</div>`
    + `</td></tr></table>`;
}

// Tek keyword için trend kartı: başlık, iki metrik ve 12 aylık seyir grafiği
// solEtiket: serinin sol ucunun dönemi (ör. "Eyl 25"). Trends penceresi son 12 ay
// olduğu için GKP tablolarının yıllarından (2024-2025) farklıdır; ayrı geçilir.
function trendKarti(r, solEtiket, yilSon, ayKisa) {
  const t = r.trends;
  return `
  <tr><td id="${kwId(r.kw)}" style="padding:12px 28px 0;scroll-margin-top:16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.surface};border:1px solid ${C.line};border-radius:8px">
      <tr><td style="padding:14px 15px 12px">

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td valign="top">
            <div style="font-size:14.5px;font-weight:700;color:${C.ink}">${esc(r.kw)}</div>
            <div style="margin-top:2px;font-size:11px;color:${C.ink3}">${esc(r.k1)}</div>
            <div style="margin-top:5px;font-size:11.5px;color:${C.ink2}">
              Arama hacmi <strong style="color:${C.ink}">${fmtVol(r.hacim25)}</strong>
              <span style="color:${C.ink3}">· ${esc(ayKisa)} ${yilSon} · endeks ${fmtIdx(r.endeks)}</span>
            </div>
            <div style="margin-top:4px;font-size:11.5px;color:${C.ink2}">
              Trends bu hafta <strong style="color:${C.ink}">${t.simdi}</strong><span style="color:${C.ink3}">/100</span>${notIsareti(t, r.kw)}
              <span style="color:${C.ink3}"> · son 4 haftada ${esc(t.durum.toLocaleLowerCase('tr-TR'))}</span>
            </div>
          </td>
          <td valign="top" align="right" style="padding-left:10px">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td style="padding-right:16px">${metrikRozet('Geçen yıl aynı hafta', t.yoyFark)}</td>
              <td>${metrikRozet('Son 30 günde', t.gun30Fark)}</td>
            </tr></table>
          </td>
        </tr></table>

        <div style="margin-top:12px">${miniTrendGrafik(t, { kw: r.kw })}</div>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:5px">
          <tr>
            <td style="font-size:10px;color:${C.ink3}">${esc(solEtiket)}</td>
            <td align="center" style="font-size:10px;color:${C.ink3}">son 12 ay</td>
            <td align="right" style="font-size:10px;color:${C.coralDeep};font-weight:600">son 30 gün</td>
          </tr>
        </table>

      </td></tr>
    </table>
  </td></tr>`;
}

// Trends ölçümüne dair uyarı notu üretir: ölçüm farklı bir terimle yapıldıysa
// (anlam karışması) veya veri seyrekse okuyucuya işaretle bildirilir.
function trendsNotu(t, kw) {
  const parcalar = [];
  if (t.vekil) {
    parcalar.push(`Google Trends "${kw}" terimini farklı bir varlıkla karıştırdığı için ölçüm "${t.vekil}" terimi üzerinden yapılmıştır; değerler bu terimin seyrini göstermektedir.`);
  }
  if (t.seyrek) {
    parcalar.push(`Google Trends bu terim için ${t.seri.length} haftanın ${t.eksikHafta} tanesinde veri döndürmemiştir (arama hacmi Trends eşiğinin altında kalmaktadır). Değerler yön göstergesi olarak değerlendirilmelidir.`);
  }
  return parcalar.length ? parcalar.join(' ') : null;
}

// Not işareti: yıldız + ipucu. Değerin yanına küçük ve soluk basılır.
function notIsareti(t, kw, hiza) {
  const not = trendsNotu(t, kw);
  if (!not) return '';
  return `<span${ipucu(not, hiza)} style="color:${C.gold};font-weight:700;font-size:11px;margin-left:3px">*</span>`;
}

// Canlı Trends hücresi.
// İki kıyas da adıyla yazılır. Önceki sürümde "Yükselişte" gibi tek bir durum
// etiketi vardı ve "80/100" ile "geçen yıl 96" satırlarının arasında durduğu için
// bu iki sayının ilişkisini anlatıyormuş gibi okunuyordu. Oysa yön son 4 haftaya
// ait, geçen yıl kıyası ayrı bir ölçüm. Belirsizliği kaldırmak için etiket
// kaldırıldı, her iki değişim kendi adıyla ve yüzdesiyle veriliyor.
function trendsHucre(t, kw) {
  if (!t) return `<span style="color:${C.ink3};font-size:12px">-</span>`;

  const satir = (etiket, deger) => {
    if (deger == null) return '';
    const pos = deger > 0.005, neg = deger < -0.005;
    const fg = pos ? C.green : neg ? C.red : C.ink2;
    return `<div style="margin-top:2px;font-size:10.5px;color:${C.ink3};white-space:nowrap">`
      + `${etiket} <strong style="color:${fg}">${fmtPct(deger)}</strong></div>`;
  };

  return `<span style="font-weight:700;color:${C.ink};font-size:13px">${t.simdi}</span>`
    + `<span style="color:${C.ink3};font-size:11px">/100</span>`
    + notIsareti(t, kw, 'r')
    + satir('son 30 gün', t.gun30Fark)
    + satir('geçen yıl', t.yoyFark);
}

// ——— Yapı parçaları ———
function bolumBasligi(no, baslik, aciklama) {
  return `
  <tr><td style="padding:30px 28px 0">
    <div style="font-size:11px;letter-spacing:.10em;text-transform:uppercase;color:${C.coralDeep};font-weight:700">${esc(no)}</div>
    <h2 style="margin:6px 0 0;font-size:19px;line-height:1.25;color:${C.ink};font-weight:700">${esc(baslik)}</h2>
    ${aciklama ? `<p style="margin:5px 0 0;font-size:13px;line-height:1.5;color:${C.ink3}${PROSE_MAX ? `;max-width:${PROSE_MAX}px` : ''}">${esc(aciklama)}</p>` : ''}
  </td></tr>`;
}

// Madde listeli insight. Uzun açıklamalar tek paragrafta okunmuyordu; giriş
// cümlesi + maddeler + isteğe bağlı dipnot yapısı taranabilir hale getiriyor.
function insightListe(giris, maddeler, dipnot) {
  const satirlar = maddeler.map(m => `
    <tr>
      <td valign="top" style="padding:0 9px 7px 0;color:${C.coralDeep};font-weight:700;font-size:13.5px;line-height:1.55">&#183;</td>
      <td style="padding:0 0 7px;font-size:13.5px;line-height:1.55;color:${C.ink}">${m}</td>
    </tr>`).join('');
  return `
  <tr><td style="padding:16px 28px 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.surface};border:1px solid ${C.line};border-radius:8px">
      <tr>
        <td style="padding:13px 15px;font-size:13.5px;line-height:1.55;color:${C.ink}">
          <div${PROSE_MAX ? ` style="max-width:${PROSE_MAX}px"` : ''}>
            <div style="margin-bottom:9px"><span style="color:${C.coralDeep};font-weight:700">&#10132;</span> ${giris}</div>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin-left:2px">${satirlar}</table>
            ${dipnot ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid ${C.line};font-size:12.5px;line-height:1.5;color:${C.ink2}">${dipnot}</div>` : ''}
          </div>
        </td>
      </tr>
    </table>
  </td></tr>`;
}

function insight(metin) {
  return `
  <tr><td style="padding:16px 28px 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.surface};border:1px solid ${C.line};border-radius:8px">
      <tr>
        <td style="padding:13px 15px;font-size:13.5px;line-height:1.55;color:${C.ink}">
          <div${PROSE_MAX ? ` style="max-width:${PROSE_MAX}px"` : ''}>
            <span style="color:${C.coralDeep};font-weight:700">&#10132;</span> ${metin}
          </div>
        </td>
      </tr>
    </table>
  </td></tr>`;
}

// Başlıklar ['Ad', 'alt satır', 'açıklama'] biçiminde verilir.
// Alt satır verinin dönemini söyler (ör. "Eyl 2025"); açıklama ise üzerine
// gelindiğinde verinin hangi kaynaktan, nasıl hesaplandığını anlatır. E-postada
// JavaScript çalışmadığı için bu bilgiyi yalnızca title özniteliği taşıyabiliyor.
function tablo(basliklar, satirlar, { hizalama = [] } = {}) {
  const th = basliklar.map((b, i) => {
    const align = hizalama[i] === 'r' ? 'right' : hizalama[i] === 'c' ? 'center' : 'left';
    const [ust, alt, aciklama] = Array.isArray(b) ? b : [b, null, null];
    const altHtml = alt
      ? `<div style="margin-top:2px;font-size:9.5px;letter-spacing:.03em;text-transform:none;color:rgba(255,255,255,.62);font-weight:600">${esc(alt)}</div>`
      : '';
    const tip = ipucu(aciklama, hizalama[i]);
    const imlec = aciklama && !CSS_TOOLTIP ? ';cursor:help' : '';
    return `<th${tip} style="padding:8px 10px;text-align:${align};font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;color:#FFFFFF;font-weight:700;background:${C.teal};vertical-align:bottom${imlec}">${esc(ust)}${altHtml}</th>`;
  }).join('');

  const tr = satirlar.map((satir, ri) => {
    const zebra = ri % 2 === 1 ? `background:${C.surface};` : '';
    const td = satir.map((h, i) => {
      const align = hizalama[i] === 'r' ? 'right' : hizalama[i] === 'c' ? 'center' : 'left';
      return `<td style="padding:9px 10px;text-align:${align};font-size:13px;color:${C.ink};border-bottom:1px solid ${C.line};${zebra}">${h}</td>`;
    }).join('');
    return `<tr>${td}</tr>`;
  }).join('');

  return `
  <tr><td style="padding:14px 28px 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid ${C.line};border-radius:8px;overflow:hidden">
      <tr>${th}</tr>
      ${tr}
    </table>
  </td></tr>`;
}

// Sütun açıklamaları. Verinin kaynağını ve hesabını söyler; markaya giden
// çıktıda "bu sayı nereden geliyor" sorusu tabloda cevaplanmış olur.
function sutunAciklamalari(d, yilSon, yilOnc, brandName = 'Marka') {
  const ay = d.ayAdi;
  return {
    arama: 'Google Keyword Planner listesindeki arama terimi. Alt satır, terimin bağlı olduğu ana kategoridir.',
    hacim: `Google Keyword Planner · ${ay} ${yilSon} aylık ortalama arama hacmi, Türkiye. Google bu değerleri bantlayarak verdiği için yön göstergesi olarak okunmalıdır.`,
    endeks: `${ay} ${yilSon} hacminin, aynı terimin ${yilSon} yıl ortalamasına oranı. 1.00x yıl ortalamasına eşit demektir; 2.00x, terimin bu ayda yıl ortalamasının iki katı arandığını gösterir.`,
    degisim: `${ay} ${yilOnc} ile ${ay} ${yilSon} arama hacimleri arasındaki yüzde değişim. Mevsimsellikten bağımsız olarak talebin yıllık yönünü verir.`,
    canli: `Google Trends · terimin son 12 aylık haftalık serisi, bu hafta itibarıyla. 0-100 ölçeği her terimin kendi 12 aylık zirvesine göredir, terimler arasında kıyaslanmaz. Alt satırlar iki ayrı kıyastır: son 30 gün öncesine ve geçen yılın aynı haftasına göre değişim.`,
    altKategori: `${brandName} kategori ağacının Kat 2 seviyesi. Alt satır, bağlı olduğu Kat 1 ana kategorisidir.`,
    katHacim: `Kategoriye bağlı tüm terimlerin ${ay} ${yilSon} arama hacimleri toplamı.`,
    fark: `Kategorinin ${ay} ayındaki yıllık değişimi ile yıl genelindeki yıllık değişimi arasındaki puan farkı. Pozitif değer, kategorinin bu ayda yıl geneline kıyasla daha dirençli seyrettiğine işaret eder.`,
    altKirilim: 'Kategori ağacının Kat 3 seviyesi. Alt satır, bağlı olduğu Kat 1 ana kategorisidir.',
    marka: `Google Keyword Planner marka listesinde yer alan, ${brandName} katalogunda bulunmayan marka.`,
    markaAylik: 'Markaya bağlı tüm terimlerin son 12 aydaki aylık ortalama arama hacmi.',
    markaYoY: 'Markanın son 12 aylık hacminin, önceki 12 aya göre yüzde değişimi.',
    markaEndeks: `Markanın ${ay} ${yilSon} hacminin, kendi ${yilSon} yıl ortalamasına oranı.`,
    kpiHacim: `${ay} ${yilSon} ayında portföydeki tüm keyword'lerin toplam arama hacmi. Kaynak: Google Keyword Planner · Türkiye. Google bu değerleri bantlayarak verdiği için yön göstergesi olarak okunmalıdır.`,
    kpiEndeks: `${ay} ${yilSon} toplam hacminin, ${yilSon} yılının aylık ortalamasına oranı. 1.00x yıl ortalamasına eşit demektir; bu değerin altı ayın yıl ortalamasının gerisinde, üstü ise ilerisinde kaldığını gösterir.`,
    kpiSira: `${ay} ayının, ${yilSon} yılının on iki ayı arasında toplam arama hacmine göre sırası. 1 en yüksek hacimli ayı, 12 en düşük hacimli ayı ifade eder.`,
  };
}

function render(d, { brandName, agencyLabel, donemNotu, dashboardUrl, aksiyonlar, ozetCumle, kapsam, yilSon = 2025, yilOnc = 2024, trendsSol = '', genislik = 640, grafikLimit = 8, ozet = null, excelUrl = null, excelAd = null }) {
  const A = sutunAciklamalari(d, yilSon, yilOnc, brandName);

  // 700px üzeri kap = tarayıcıda açılan web sürümü
  PROSE_MAX = genislik > 700 ? 780 : null;
  CSS_TOOLTIP = genislik > 700;

  const o = d.ozet;
  // Bölüm numaraları dinamik: Trends ve alt kırılım bölümleri veriye göre
  // görünüp kaybolduğu için sabit numara verilemez.
  let bolumNo = 0;
  const N = () => String(++bolumNo).padStart(2, '0');

  // —— Yükselen başlıklar ——
  // Trends verisi geldiyse canlı durum kolonu eklenir; gelmeyen kelimeler boş kalır.
  const trendsVar = d.yukselenler.some(r => r.trends);
  const yukSatir = d.yukselenler.map(r => {
    const hucreler = [
      (CSS_TOOLTIP && r.trends
        ? `<a class="kw-link" href="#${kwId(r.kw)}"><strong>${esc(r.kw)}</strong></a>`
        : `<strong>${esc(r.kw)}</strong>`)
        + `<div style="font-size:11px;color:${C.ink3};margin-top:2px">${esc(r.k1)}</div>`,
      `<strong>${fmtVol(r.hacim25)}</strong>`,
      `<span style="color:${C.coralDeep};font-weight:700">${fmtIdx(r.endeks)}</span>`,
      rozet(r.yoy),
    ];
    if (trendsVar) hucreler.push(trendsHucre(r.trends, r.kw));
    return hucreler;
  });

  // —— En keskin mevsimsel yükselenler ——
  const keskinSatir = (d.keskinler || []).map(r => [
    `<strong>${esc(r.kw)}</strong><div style="font-size:11px;color:${C.ink3};margin-top:2px">${esc(r.k1)}</div>`,
    `<span style="color:${C.coralDeep};font-weight:700;font-size:14px">${fmtIdx(r.endeks)}</span>`,
    fmtVol(r.hacim25),
    rozet(r.yoy),
  ]);

  // —— Kategori tablosu (Kat 2) ——
  const katSatir = d.altKategoriler.map(r => [
    `<strong>${esc(r.kat)}</strong><div style="font-size:11px;color:${C.ink3};margin-top:2px">${esc(r.ust || '')}</div>`,
    fmtVol(r.hacim25),
    r.endeks >= 1.10
      ? `<span style="color:${C.green};font-weight:700">${fmtIdx(r.endeks)}</span>`
      : r.endeks <= 0.90
        ? `<span style="color:${C.ink3}">${fmtIdx(r.endeks)}</span>`
        : fmtIdx(r.endeks),
    rozet(r.ayYoY),
    r.fark == null ? '-' : `<span style="font-size:12px;color:${r.fark > 0.02 ? C.green : r.fark < -0.02 ? C.red : C.ink3}">${r.fark > 0 ? '+' : ''}${(r.fark * 100).toFixed(0)} puan</span>`,
  ]);

  // —— Ana kategori tablosu (Kat 1) - artık kullanılmıyor, özet cümlede referans ——
  const kat1Satir = d.kategoriler.map(r => [
    esc(r.kat),
    fmtVol(r.hacim25),
    r.endeks >= 1.10
      ? `<span style="color:${C.green};font-weight:700">${fmtIdx(r.endeks)}</span>`
      : r.endeks <= 0.90
        ? `<span style="color:${C.ink3}">${fmtIdx(r.endeks)}</span>`
        : fmtIdx(r.endeks),
    rozet(r.ayYoY),
    r.fark == null ? '-' : `<span style="font-size:12px;color:${r.fark > 0.02 ? C.green : r.fark < -0.02 ? C.red : C.ink3}">${r.fark > 0 ? '+' : ''}${(r.fark * 100).toFixed(0)} puan</span>`,
  ]);

  // —— Alt kırılım büyüyenler ——
  const buySatir = d.buyuyenler.map(r => [
    `<strong>${esc(r.k3)}</strong><div style="font-size:11px;color:${C.ink3};margin-top:2px">${esc(r.k1)}</div>`,
    fmtVol(r.hacim25),
    rozet(r.yoy),
  ]);

  // —— Marka fırsatları ——
  const mrkSatir = d.markalar.map(r => [
    `<strong>${esc(r.brand)}</strong>`,
    fmtVol(r.aylik) + `<span style="font-size:11px;color:${C.ink3}">/ay</span>`,
    rozet(r.yoy),
    fmtIdx(r.endeks),
  ]);

  const aksiyonHtml = aksiyonlar.map(a => `
    <tr><td style="padding:0 0 11px">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td valign="top" style="padding-right:9px;color:${C.coralDeep};font-weight:700;font-size:13.5px">&#10132;</td>
        <td style="font-size:13.5px;line-height:1.55;color:${C.ink}${PROSE_MAX ? `;max-width:${PROSE_MAX}px` : ''}">${a}</td>
      </tr></table>
    </td></tr>`).join('');

  return `<!DOCTYPE html>
<html lang="tr"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(brandName)} · ${esc(d.ayAdi)} Arama Talebi Insight'ları</title>
${tooltipStil()}
</head>
<body style="margin:0;padding:0;background:${C.bg};font-family:${FONT};-webkit-font-smoothing:antialiased">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:22px 12px">
<tr><td align="center">

<table role="presentation" width="${genislik}" cellpadding="0" cellspacing="0" style="width:100%;max-width:${genislik}px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid ${C.line}">

  <!-- Başlık bandı -->
  <tr><td style="background:${C.teal};padding:24px 28px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="font-size:17px;font-weight:700;color:#FFFFFF;letter-spacing:-0.01em">${esc(brandName)}</td>
      <td align="right" style="font-size:11px;color:rgba(255,255,255,.72);letter-spacing:.10em;text-transform:uppercase;font-weight:600">${esc(agencyLabel)}</td>
    </tr></table>
    <div style="margin-top:14px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:${C.coral};font-weight:700">AYLIK ARAMA TALEBİ INSIGHT'LARI</div>
    <div style="margin-top:5px;font-size:25px;font-weight:700;color:#FFFFFF;letter-spacing:-0.02em">${esc(d.ayAdi)}</div>
    <div style="margin-top:7px;font-size:12.5px;color:rgba(255,255,255,.70);line-height:1.5">${esc(donemNotu)}</div>
  </td></tr>

  <!-- Dönem özeti -->
  <tr><td style="padding:22px 28px 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:8px 0">
      <tr>
        <td width="33%"${ipucu(A.kpiHacim, null)} style="background:${C.surface};border:1px solid ${C.line};border-radius:8px;padding:13px">
          <div style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:${C.ink3};font-weight:700">Ayın Hacmi</div>
          <div style="margin-top:5px;font-size:22px;font-weight:700;color:${C.ink}">${fmtVol(o.hacim25)}</div>
          <div style="margin-top:3px;font-size:11px;color:${C.ink3}">${esc(d.ayKisa)} ${yilSon}</div>
        </td>
        <td width="33%"${ipucu(A.kpiEndeks, null)} style="background:${C.surface};border:1px solid ${C.line};border-radius:8px;padding:13px">
          <div style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:${C.ink3};font-weight:700">Mevsimsel Endeks</div>
          <div style="margin-top:5px;font-size:22px;font-weight:700;color:${o.endeks >= 1.05 ? C.green : o.endeks <= 0.95 ? C.ink2 : C.ink}">${fmtIdx(o.endeks)}</div>
          <div style="margin-top:3px;font-size:11px;color:${C.ink3}">${yilSon} ortalamasına göre</div>
        </td>
        <td width="33%"${ipucu(A.kpiSira, 'r')} style="background:${C.surface};border:1px solid ${C.line};border-radius:8px;padding:13px">
          <div style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:${C.ink3};font-weight:700">Yıl İçi Sıra</div>
          <div style="margin-top:5px;font-size:22px;font-weight:700;color:${C.ink}">${o.siraYil}. <span style="font-size:13px;font-weight:600;color:${C.ink3}">/ 12</span></div>
          <div style="margin-top:3px;font-size:11px;color:${C.ink3}">${yilSon} hacmine göre</div>
        </td>
      </tr>
    </table>
  </td></tr>

  ${ozet ? insightListe(ozet.giris, ozet.maddeler, null) : ''}

  ${bolumBasligi(N(), d.ayAdi + ' ayının yükselen başlıkları',
    `${yilOnc} ve ${yilSon} yıllarında üst üste yıl ortalamasının üzerine çıkan, hacim tabanını geçen aramalar.`)}
  ${insightListe(
    'Kolonların okunuşu:',
    [
      `<strong>Endeks</strong> - ${esc(d.ayAdi)} ${yilSon} hacminin, aynı başlığın ${yilSon} yıl ortalamasına oranı. "Bu ay aranıyor mu" sorusunu yanıtlar.`,
      `<strong>Değişim</strong> - ${esc(d.ayKisa)} ${yilOnc} ile ${esc(d.ayKisa)} ${yilSon} arasındaki fark. "Talep büyüyor mu" sorusunu yanıtlar.`,
      ...(trendsVar ? [`<strong>Canlı</strong> - Google Trends'ten bu haftanın değeri; altında iki ayrı kıyas yer alır: son 30 gün öncesine göre ve geçen yılın aynı haftasına göre değişim.`] : []),
      ...(CSS_TOOLTIP && trendsVar ? [`Arama adına tıklandığında ilgili başlığın Google Trends grafiğine gidilmektedir.`] : []),
    ],
    trendsVar
      ? `Bir başlık son 30 günde yükselirken geçen yılın altında kalabilir; bunlar farklı sorulardır. Canlı kolonundaki 0-100 ölçeği her başlığın kendi son 12 ayına göredir, başlıklar arasında kıyaslanmaz.`
      : null
  )}

  ${tablo(
    [['Arama', null, A.arama], ['Hacim', `${d.ayKisa} ${yilSon}`, A.hacim], ['Endeks', `${yilSon} ort.`, A.endeks], ['Değişim', `${d.ayKisa} ${yilOnc}→${String(yilSon).slice(2)}`, A.degisim]]
      .concat(trendsVar ? [['Canlı', 'bu hafta', A.canli]] : []),
    yukSatir,
    { hizalama: trendsVar ? ['l', 'r', 'r', 'r', 'r'] : ['l', 'r', 'r', 'r'] })}

  ${d.keskinler && d.keskinler.length ? `
  ${bolumBasligi(N(), 'En keskin mevsimsel yükselişler',
    'Hacim sıralamasında geride kalan, ancak kendi yıl ortalamasına göre en belirgin ayrışan başlıklar.')}
  ${insight(`Yukarıdaki liste hacme göre sıralıdır ve yüksek hacimli, ılımlı mevsimsel başlıkları öne çıkarır. Aşağıdaki liste ise aynı havuzu <strong>mevsimsel keskinliğe</strong> göre sıralamaktadır: bu başlıkların yıl geneline yayılmış talebi sınırlıdır, ancak ${esc(d.ayAdi)} ayında yoğunlaşmaktadır. Planlama açısından zamanlama hassasiyeti en yüksek grup budur.`)}
  ${tablo([
    ['Arama', null, A.arama], ['Endeks', `${yilSon} ort.`, A.endeks], ['Hacim', `${d.ayKisa} ${yilSon}`, A.hacim],
    ['Değişim', `${d.ayKisa} ${yilOnc}→${String(yilSon).slice(2)}`, A.degisim],
  ], keskinSatir, { hizalama: ['l', 'r', 'r', 'r'] })}
  ` : ''}

  ${trendsVar ? `
  ${bolumBasligi(N(), 'Google Trends Insight\'ları',
    `Listedeki ${d.yukselenler.filter(r => r.trends).length} başlığın Google Trends üzerindeki güncel seyri.${CSS_TOOLTIP ? ' Bölüm kendi içinde kaydırılabilir.' : ''}`)}
  ${insightListe(
    'Grafiklerin okunuşu:',
    [
      `Sol uç <strong>${esc(trendsSol)}</strong>, sağ uç bu hafta. Koyu renkli bölüm son 30 günü işaretlemektedir.`,
      `Çubuğun üzerine gelindiğinde ilgili haftanın tarihi ve değeri görüntülenmektedir.`,
      `0-100 ölçeği her başlığın kendi son 12 aylık zirvesine göredir; başlıklar arasında kıyaslanmaz.`,
    ],
    'Bu bölüm canlı Google Trends verisine dayanır. Yukarıdaki tablolar Google Keyword Planner mutlak hacimlerinden gelir ve farklı dönemleri kapsar.'
  )}
  ${CSS_TOOLTIP ? `<tr><td style="padding:4px 28px 0"><div class="trend-kaydir">` : ''}
  ${CSS_TOOLTIP ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">` : ''}
  ${d.yukselenler.filter(r => r.trends).slice(0, CSS_TOOLTIP ? 999 : grafikLimit).map(r => trendKarti(r, trendsSol, yilSon, d.ayKisa)).join('')}
  ${CSS_TOOLTIP ? `</table></div></td></tr>` : ''}
  ` : ''}

  ${bolumBasligi(N(), 'Alt kategori görünümü',
    `Kat 2 kırılımında ayın profili ve aya özel yıllık değişim. Hacme göre ${d.altKategoriler.length} kırılım listelenmektedir.`)}
  ${insight(`<strong>Fark</strong> kolonu, kategorinin ${esc(d.ayAdi)} ayındaki değişimi ile yıl genelindeki değişimi karşılaştırmaktadır. Pozitif değer, kategorinin bu ayda yıl geneline kıyasla daha dirençli seyrettiğine işaret etmektedir.`)}
  ${tablo([
    ['Alt kategori', null, A.altKategori], ['Hacim', `${d.ayKisa} ${yilSon}`, A.katHacim], ['Endeks', `${yilSon} ort.`, A.endeks],
    ['Değişim', `${d.ayKisa} ${yilOnc}→${String(yilSon).slice(2)}`, A.degisim], ['Fark', 'yıl geneline', A.fark],
  ], katSatir, { hizalama: ['l', 'r', 'r', 'r', 'r'] })}

  ${d.buyuyenler.length ? `
  ${bolumBasligi(N(), 'Alt kırılımda büyüyen başlıklar',
    `Kat 3 seviyesinde ${d.ayKisa} ${yilOnc} - ${d.ayKisa} ${yilSon} arasında büyüyen kırılımlar.`)}
  ${insight('Ana kategoriler pazar geneliyle birlikte daralırken, alt kırılımda büyümesini sürdüren başlıklar bulunmaktadır. Bu kırılımlar içerik ve kampanya önceliklendirmesinde değerlendirilebilir.')}
  ${tablo([
    ['Alt kırılım', null, A.altKirilim], ['Hacim', `${d.ayKisa} ${yilSon}`, A.katHacim],
    ['Değişim', `${d.ayKisa} ${yilOnc}→${String(yilSon).slice(2)}`, A.degisim],
  ], buySatir, { hizalama: ['l', 'r', 'r'] })}` : ''}

  ${d.markalar.length ? `
  ${bolumBasligi(N(), 'Katalogda yer almayan büyüyen markalar',
    'Portföyde bulunmayan, son 12 ayda büyüyen ve bu ayda hacim taşıyan markalar.')}
  ${insight('Aşağıdaki markalar ${brandName} katalogunda yer almamakla birlikte arama talebi büyümektedir. Katalog genişletme değerlendirmelerinde ele alınabilir.')}
  ${tablo([
    ['Marka', null, A.marka], ['Aylık ort.', 'son 12 ay', A.markaAylik], ['Değişim', 'son 12 ay YoY', A.markaYoY], ['Endeks', `${d.ayKisa} ${yilSon}`, A.markaEndeks],
  ], mrkSatir, { hizalama: ['l', 'r', 'r', 'r'] })}` : ''}

  ${bolumBasligi(N(), 'Değerlendirilebilecek adımlar', null)}
  <tr><td style="padding:15px 28px 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${aksiyonHtml}</table>
  </td></tr>

  <!-- Alt bilgi -->
  <tr><td style="padding:24px 28px 26px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.line}">
      <tr><td style="padding-top:15px">
        ${(excelUrl || dashboardUrl) ? `<div style="margin-bottom:12px">
          ${excelUrl ? `<a href="${esc(excelUrl)}" style="display:inline-block;padding:10px 17px;background:${C.coralDeep};color:#FFFFFF;text-decoration:none;border-radius:7px;font-size:13px;font-weight:600;margin-right:8px">Verileri Excel olarak indir</a>` : ''}
          ${dashboardUrl ? `<a href="${esc(dashboardUrl)}" style="display:inline-block;padding:10px 17px;background:${C.surface};border:1px solid ${C.line};color:${C.ink};text-decoration:none;border-radius:7px;font-size:13px;font-weight:600">Ayrıntılı panele git</a>` : ''}
        </div>` : ''}
        ${excelUrl ? `<div style="margin-bottom:11px;font-size:11.5px;color:${C.ink3};line-height:1.5">Excel dosyası sayfadaki tüm tabloları, ${esc(excelAd || '')} haftalık Google Trends serilerini ve terim sözlüğünü içermektedir. Sütun adlarında verinin dönemi ve kaynağı yazılıdır.</div>` : ''}
        <div style="font-size:11px;line-height:1.6;color:${C.ink3}">
          Kaynak: Google Keyword Planner · Türkiye · aylık arama hacmi<br>
          Kapsam: ${esc(kapsam)}<br>
          Aylık hacimler Google Keyword Planner tarafından bantlanmış değerlerdir; yön göstergesi olarak değerlendirilmesi önerilir.
        </div>
      </td></tr>
    </table>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}

module.exports = { render, fmtVol, fmtPct, fmtIdx, C };
