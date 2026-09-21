// scripts/lib/web-template.js
// Tarayıcıda açılan rapor sürümü.
//
// E-posta şablonundan (mailing-template.js) ayrıdır: ToC, kategori filtreleri,
// ay sekmeleri ve kaydırılabilir bölümler JavaScript gerektiriyor; e-posta
// istemcileri script çalıştırmaz. İki şablon aynı veri katmanını (mailing-data)
// kullanır, sunum katmanları ayrışır.
//
// Dil ve biçim İçerik Dili Rehberi [A] kurumsal rejimine göre.

const { LIMITS, trendsDili } = require('./mailing-data');

const C = {
  teal: '#10332F', coral: '#FF7B52', coralDeep: '#E85F36', coralTint: '#FFE3D8',
  green: '#2E7D32', greenWash: '#C8E6C9', red: '#D32F2F', redWash: '#FFCDD2',
  gold: '#F5A623', ink: '#10332F', ink2: '#4A4A4A', ink3: '#7A7A7A',
  line: '#E0E0E0', surface: '#F7F5F2', bg: '#EFEDE9', zebra: '#FAF9F7',
};
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function fmtVol(n) {
  if (n == null) return '-';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(Math.round(n));
}
function fmtPct(v) {
  if (v == null) return '-';
  const p = v * 100;
  return (p > 0 ? '+' : p < 0 ? '-' : '') + '%' + Math.abs(p).toFixed(0);
}
function fmtIdx(v) { return v == null ? '-' : v.toFixed(2) + 'x'; }
function kwId(kw) {
  return 'tr-' + String(kw).toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function rozet(v) {
  if (v == null) return `<span class="bos">-</span>`;
  const s = v > 0.005 ? 'poz' : v < -0.005 ? 'neg' : 'notr';
  return `<span class="rozet ${s}">${fmtPct(v)}</span>`;
}
// Yalnizca data niteligi doner. Class dondurulurse zaten class tasiyan
// elemanlarda ikinci bir class niteligi olusuyor ve tarayici ikincisini yok sayiyor.
function tipAttr(metin, odaklanabilir = true) {
  if (!metin) return '';
  return ` data-tip="${esc(metin)}"${odaklanabilir ? ' tabindex="0"' : ''}`;
}

// --- Trends mini grafik ---
function grafik(t, kw) {
  const maks = Math.max(...t.seri, 1);
  const pay = (100 / t.seri.length).toFixed(3);
  const hucreler = t.seri.map((v, i) => {
    const h = Math.max(2, Math.round((v / maks) * 52));
    const son30 = i >= t.sonNIndex;
    const hafta = t.haftalar && t.haftalar[i];
    const ipucu = [kw, hafta ? `${hafta} haftası` : null, `arama ilgisi ${v}/100`, son30 ? '(son 30 gün)' : null]
      .filter(Boolean).join(' · ');
    return `<td width="${pay}%"${tipAttr(ipucu, false)} class="cbar"><i style="height:${h}px;background:${son30 ? C.coralDeep : '#D6D0C8'}"></i></td>`;
  }).join('');
  return `<table class="grafik"><tr>${hucreler}</tr></table>`;
}

function trendsNotu(t, kw) {
  const p = [];
  if (t.vekil) p.push(`Google Trends "${kw}" terimini farklı bir varlıkla karıştırdığı için ölçüm "${t.vekil}" terimi üzerinden yapılmıştır.`);
  if (t.seyrek) p.push(`Google Trends bu terim için ${t.seri.length} haftanın ${t.eksikHafta} tanesinde veri döndürmemiştir. Değerler yön göstergesi olarak değerlendirilmelidir.`);
  return p.length ? p.join(' ') : null;
}

function trendKarti(r, solEtiket, ayKisa, yilSon) {
  const t = r.trends;
  const not = trendsNotu(t, r.kw);
  return `
  <div class="tkart" id="${kwId(r.kw)}" data-k1="${esc(r.k1)}" data-k2="${esc(r.k2 || '')}">
    <div class="tkart-ust">
      <div class="tkart-sol">
        <div class="tkart-kw">${esc(r.kw)}</div>
        <div class="tkart-kat">${esc(r.k1)}${r.k2 ? ' · ' + esc(r.k2) : ''}</div>
        <div class="tkart-meta">Arama hacmi <b>${fmtVol(r.hacim25)}</b> <span class="soluk">· ${esc(ayKisa)} ${yilSon} · endeks ${fmtIdx(r.endeks)}</span></div>
        <div class="tkart-meta">Trends son hafta <b>${t.simdi}</b><span class="soluk">/100</span>${not ? `<span${tipAttr(not)} class="uyari">*</span>` : ''}<span class="soluk"> · son 4 haftada ${esc(t.durum.toLocaleLowerCase('tr-TR'))}</span></div>
      </div>
      <div class="tkart-sag">
        <div class="metrik"><span>Geçen yıl aynı hafta</span>${rozet(t.yoyFark)}</div>
        <div class="metrik"><span>Son 30 günde</span>${rozet(t.gun30Fark)}</div>
      </div>
    </div>
    ${grafik(t, r.kw)}
    <div class="tkart-alt"><span>${esc(solEtiket)}</span><span>son 12 ay</span><span class="vurgu">son 30 gün</span></div>
  </div>`;
}

// --- Filtre çubuğu ---
// Tümü / Kat 1 / Kat 2 düğmeleri; seçilene göre altında kategori çipleri açılır.
function filtreCubugu(hedef, kat1ler, kat2ler, toplam, birim) {
  const cip = (seviye, s) => `<button class="cip" data-seviye="${seviye}" data-deger="${esc(s.ad)}">${esc(s.ad)}<b>${s.adet}</b></button>`;
  return `
  <div class="filtre" data-hedef="${hedef}" data-birim="${esc(birim)}">
    <div class="filtre-mod">
      <button class="mod aktif" data-mod="tumu">Tümü<b>${toplam}</b></button>
      <button class="mod" data-mod="k1">Kat 1</button>
      <button class="mod" data-mod="k2">Kat 2</button>
      <span class="filtre-sayac"></span>
    </div>
    <div class="cipler k1" hidden>${kat1ler.map(s => cip('k1', s)).join('')}</div>
    <div class="cipler k2" hidden>${kat2ler.map(s => cip('k2', s)).join('')}</div>
  </div>`;
}

// --- Düz filtre çubuğu ---
// Tek seviyeli filtre: Tümü + verilen adlar. Kat 2 tablosunu üst kategorisine göre süzer.
function duzFiltre(hedef, sayimlar, birim, toplam) {
  return `
  <div class="filtre duz" data-hedef="${hedef}" data-birim="${esc(birim)}">
    <div class="filtre-mod">
      <button class="mod aktif" data-deger="">Tümü<b>${toplam}</b></button>
      ${sayimlar.map(s => `<button class="mod" data-deger="${esc(s.ad)}">${esc(s.ad)}<b>${s.adet}</b></button>`).join('')}
      <span class="filtre-sayac"></span>
    </div>
  </div>`;
}

function tablo(basliklar, satirlar, hizalama, satirAttr) {
  const th = basliklar.map((b, i) => {
    const [ust, alt, acik] = Array.isArray(b) ? b : [b, null, null];
    return `<th class="${hizalama[i] === 'r' ? 'sag' : ''}"${tipAttr(acik)}>${esc(ust)}${alt ? `<i>${esc(alt)}</i>` : ''}</th>`;
  }).join('');
  const tr = satirlar.map((s, i) => {
    const td = s.map((h, j) => `<td class="${hizalama[j] === 'r' ? 'sag' : ''}">${h}</td>`).join('');
    return `<tr${satirAttr ? satirAttr(i) : ''}>${td}</tr>`;
  }).join('');
  return `<table class="veri"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;
}

function bolum(id, no, baslik, aciklama, icerik) {
  return `
  <section id="${id}">
    <div class="bh"><span class="bno">${esc(no)}</span><h2>${esc(baslik)}</h2></div>
    ${aciklama ? `<p class="bacik">${esc(aciklama)}</p>` : ''}
    ${icerik}
  </section>`;
}

function insightListe(giris, maddeler, dipnot) {
  return `<div class="insight">
    <div class="ig"><span class="ok">&#10132;</span> ${giris}</div>
    <ul>${maddeler.map(m => `<li>${m}</li>`).join('')}</ul>
    ${dipnot ? `<div class="idip">${dipnot}</div>` : ''}
  </div>`;
}

function render(d, o) {
  const { brandName, agencyLabel, logolar, ayEtiketleri, aktifAy, excelUrl, kapsam,
          yilSon, yilOnc, trendsSol, ozet, aksiyonlar } = o;
  if (!logolar || !logolar.marka || !logolar.ajans) {
    // Logo bandı zorunlu (İçerik Dili Rehberi Bölüm 15.1). Eksikse üretim durur,
    // aksi halde kimlik satırı olmayan bir rapor teslim edilebilir.
    throw new Error('Logolar eksik: proje.json içinde logoMarka ve logoAjans tanımlı olmalı.');
  }

  // Filtre düğmelerinde gösterilen adetler: o kategoriye düşen satır sayısı
  const sayim = (liste, alan) => {
    const m = new Map();
    liste.forEach(r => { const v = r[alan]; if (v) m.set(v, (m.get(v) || 0) + 1); });
    return [...m].map(([ad, adet]) => ({ ad, adet })).sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
  };
  const kat1ler = sayim(d.yukselenler, 'k1');
  const kat2ler = sayim(d.yukselenler, 'k2');
  const trendliler = d.yukselenler.filter(r => r.trends);
  const A = o.sutunAciklama;

  const satirAttr = (liste) => (i) => ` data-k1="${esc(liste[i].k1)}" data-k2="${esc(liste[i].k2 || '')}"`;

  // —— Yükselen başlıklar ——
  const canliVar = trendliler.length > 0;
  const L = d.trendsDili || trendsDili(null);
  const yukSatir = d.yukselenler.map(r => [
    (r.trends ? `<a class="kwl" href="#${kwId(r.kw)}">${esc(r.kw)}</a>` : `<b>${esc(r.kw)}</b>`)
      + `<i class="alt">${esc(r.k1)}</i>`,
    `<b>${fmtVol(r.hacim25)}</b>`,
    `<span class="endeks">${fmtIdx(r.endeks)}</span>`,
    rozet(r.yoy),
    // Canlı sütunu yalnızca en az bir ölçüm varsa basılır; hiç Trends yokken
    // sütun baştan sona tire dolar ve başlığındaki açıklama karşılığı olmayan
    // bir metriği anlatır.
    ...(canliVar ? [r.trends
      ? `<b>${r.trends.simdi}</b><span class="soluk">/100</span>`
        + `<i class="alt">son 30 gün ${fmtPct(r.trends.gun30Fark)}</i>`
        + `<i class="alt">geçen yıl ${fmtPct(r.trends.yoyFark)}</i>`
      : `<span class="bos" title="Bu başlık için Google Trends ölçümü yapılmamıştır.">-</span>`] : []),
  ]);

  const keskinSatir = d.keskinler.map(r => [
    `<b>${esc(r.kw)}</b><i class="alt">${esc(r.k1)}</i>`,
    `<span class="endeks buyuk">${fmtIdx(r.endeks)}</span>`,
    fmtVol(r.hacim25), rozet(r.yoy),
  ]);

  // Kat 2 tablosunun filtresi: tabloda fiilen geçen üst kategoriler
  const katUstler = sayim(d.altKategoriler, 'ust');

  const katSatir = d.altKategoriler.map(r => [
    `<b>${esc(r.kat)}</b><i class="alt">${esc(r.ust || '')}</i>`,
    fmtVol(r.hacim25),
    `<span class="${r.endeks >= 1.10 ? 'yesil' : r.endeks <= 0.90 ? 'soluk' : ''}">${fmtIdx(r.endeks)}</span>`,
    rozet(r.ayYoY),
    r.fark == null ? '-' : `<span class="${r.fark > 0.02 ? 'yesil' : r.fark < -0.02 ? 'kirmizi' : 'soluk'}">${r.fark > 0 ? '+' : ''}${(r.fark * 100).toFixed(0)} puan</span>`,
  ]);

  const buySatir = d.buyuyenler.map(r => [
    `<b>${esc(r.k3)}</b><i class="alt">${esc(r.k1)}</i>`, fmtVol(r.hacim25), rozet(r.yoy),
  ]);

  const mrkSatir = d.markalar.map(r => [
    `<b>${esc(r.brand)}</b>`,
    fmtVol(r.aylik) + `<span class="soluk">/ay</span>`,
    rozet(r.yoy), fmtIdx(r.endeks),
  ]);

  const S = { yuk: 'yukselenler', keskin: 'keskin', trends: 'trends', kat: 'kategoriler', buy: 'buyuyenler', marka: 'markalar', aksiyon: 'adimlar' };

  // Bölüm listesi tek kaynaktan türetilir: hem içindekiler hem bölüm numaraları
  // buradan gelir. Sabit yazılırsa veri bir bölümü boş bıraktığında içindekiler
  // var olmayan bir başlığa bağlanıyor ve numaralar kayıyor.
  const BOLUMLER = [
    { grup: 'Genel', id: 'ozet', ad: 'Ayın Görünümü' },
    { grup: 'Arama Başlıkları', id: S.yuk, ad: 'Yükselen Başlıklar' },
    { id: S.keskin, ad: 'En Keskin Mevsimsel Yükselişler', var: d.keskinler.length > 0 },
    { id: S.trends, ad: "Google Trends Insight'ları", var: trendliler.length > 0 },
    { grup: 'Kategori ve Marka', id: S.kat, ad: 'Alt Kategori Görünümü' },
    { id: S.buy, ad: 'Alt Kırılımda Büyüyenler', var: d.buyuyenler.length > 0 },
    { id: S.marka, ad: 'Katalog Dışı Markalar', var: d.markalar.length > 0 },
    { grup: 'Sonuç', id: S.aksiyon, ad: 'Değerlendirilebilecek Adımlar' },
  ].filter(b => b.var !== false);
  const N = (id) => String(BOLUMLER.findIndex(b => b.id === id)).padStart(2, '0');

  return `<!DOCTYPE html>
<html lang="tr"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(brandName)} · ${esc(d.ayAdi)} Arama Talebi Insight'ları</title>
<style>
*{box-sizing:border-box}
/* Yumuşak kaydırma bilinçli olarak kullanılmıyor: hem JS behavior:'smooth'
   hem CSS scroll-behavior, animasyon karesi üretmeyen bağlamlarda (gömülü
   önizleme, azaltılmış hareket) kaydırmayı hiç gerçekleştirmiyor. Doğruluk
   animasyona bağlanmaz; konumlandırma anında yapılır. */
body{margin:0;background:${C.bg};font-family:${FONT};color:${C.ink};-webkit-font-smoothing:antialiased;font-size:14px}
a{color:inherit}
.appbar{position:sticky;top:0;z-index:60;background:${C.teal};border-bottom:1px solid rgba(255,255,255,.08)}
.appbar-in{max-width:1560px;margin:0 auto;padding:11px 24px;display:flex;align-items:center;gap:20px}
/* İki logo aynı yükseklikte. content-box şart: global border-box altında
   height, beyaz kartın dolgusunu da içine alıp görseli küçültüyordu. */
.appbar img.marka{height:32px;box-sizing:content-box;display:block;background:#fff;padding:6px 10px;border-radius:8px}
.appbar .sag{margin-left:auto;display:flex;align-items:center}
.appbar img.ajans-logo{height:32px;display:block;filter:brightness(0) invert(1)}
.xls{display:inline-block;padding:7px 13px;background:${C.coralDeep};color:#fff;text-decoration:none;border-radius:7px;font-size:12px;font-weight:600;white-space:nowrap}
.xls:hover{background:${C.coral}}
.xls-alt{margin:20px 0 0}
.aytabs{position:sticky;top:var(--appbar-h,64px);z-index:59;background:rgba(255,255,255,.94);backdrop-filter:blur(10px);border-bottom:1px solid ${C.line}}
.aytabs-in{max-width:1560px;margin:0 auto;padding:0 24px;display:flex;align-items:center;gap:12px}
.aytab-liste{display:flex;gap:2px;overflow-x:auto;scrollbar-width:none}
/* Liste taşıyorsa kenarlar soluklaşır: kaydırma çubuğu gizli olduğu için devamı olduğunu bu gösterir */
.aytab-liste.tasar{-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 18px,#000 calc(100% - 18px),transparent 100%);mask-image:linear-gradient(90deg,transparent 0,#000 18px,#000 calc(100% - 18px),transparent 100%)}
.aytabs .xls{margin-left:auto;flex-shrink:0}
.aytab{padding:11px 15px;font-size:13px;font-weight:600;color:${C.ink3};text-decoration:none;border-bottom:2px solid transparent;white-space:nowrap}
.aytab:hover{color:${C.ink}}
.aytab.aktif{color:${C.coralDeep};border-bottom-color:${C.coralDeep}}
.aytab.pasif{color:#B9B2A8;cursor:default;pointer-events:none}
.hero{max-width:1560px;margin:0 auto;padding:26px 24px 4px}
/* Etiket ve dönem başlığı aynı satırda; taban çizgileri hizalanır */
.hero-ust{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap}
.eyebrow{font-size:15px;letter-spacing:.11em;color:${C.coralDeep};font-weight:700}
.hero h1{margin:0;font-size:34px;letter-spacing:-.02em}
.hero p{margin:6px 0 0;font-size:14px;color:${C.ink3}}
.shell{max-width:1560px;margin:0 auto;padding:18px 24px 60px;display:grid;grid-template-columns:264px minmax(0,1fr);gap:26px}
@media(max-width:1080px){.shell{grid-template-columns:1fr}.sidenav{display:none}}
.sidenav{position:sticky;top:112px;align-self:start;max-height:calc(100vh - 132px);overflow-y:auto;background:#fff;border:1px solid ${C.line};border-radius:12px;padding:12px;scrollbar-width:thin}
.sidenav h4{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:${C.ink3};margin:10px 8px 5px;font-weight:700}
.sidenav h4:first-child{margin-top:2px}
.sidenav a{display:flex;gap:8px;padding:7px 9px;border-radius:7px;font-size:12.5px;color:${C.ink2};text-decoration:none;line-height:1.35}
.sidenav a:hover{background:${C.surface};color:${C.ink}}
.sidenav a.aktif{background:${C.coralTint};color:${C.coralDeep};font-weight:600}
.sidenav a .n{color:${C.ink3};font-size:11px;font-weight:700;min-width:17px}
.sidenav a.aktif .n{color:${C.coralDeep}}
main{min-width:0}
section{background:#fff;border:1px solid ${C.line};border-radius:12px;padding:20px 22px;margin-bottom:18px;scroll-margin-top:calc(var(--appbar-h,64px) + 55px)}
/* Punto tek yerden: bölüm numarası başlığın oranı olarak ölçekleniyor */
.bh{display:flex;align-items:baseline;gap:10px;font-size:20px;margin-bottom:12px}
.bno{font-size:.8em;font-weight:700;color:${C.coralDeep};letter-spacing:.04em}
.bh h2{margin:0;font-size:1em;letter-spacing:-.01em}
.bacik{margin:0;font-size:13px;color:${C.ink3};max-width:820px}
/* Eşik 4 kartın tek sıraya sığmasına göre: 4x165 + 3x10 = 690px */
.kpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:10px;margin-bottom:18px}
.kpi>div{background:#fff;border:1px solid ${C.line};border-radius:11px;padding:13px 15px}
.kpi .e{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:${C.ink3};font-weight:700}
.kpi .v{font-size:25px;font-weight:700;margin-top:5px}
.kpi .s{font-size:11px;color:${C.ink3};margin-top:3px}
.insight{background:${C.surface};border:1px solid ${C.line};border-radius:9px;padding:13px 15px;margin-top:14px;font-size:13.5px;line-height:1.55;max-width:900px}
.insight .ig{margin-bottom:8px}
.insight .ok{color:${C.coralDeep};font-weight:700}
.insight ul{margin:0;padding-left:19px}
.insight li{margin-bottom:6px}
.insight li::marker{color:${C.coralDeep}}
.insight .idip{margin-top:9px;padding-top:9px;border-top:1px solid ${C.line};font-size:12.5px;color:${C.ink2}}
.filtre{margin-top:14px}
.filtre-mod{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.mod{padding:6px 13px;border:1px solid ${C.line};background:#fff;border-radius:20px;font-size:12.5px;font-weight:600;color:${C.ink2};cursor:pointer;font-family:inherit}
.mod:hover{border-color:#C9C2B8}
.mod.aktif{background:${C.teal};border-color:${C.teal};color:#fff}
.mod b,.cip b{margin-left:6px;font-weight:600;color:${C.ink3}}
.mod.aktif b{color:rgba(255,255,255,.7)}
.cip.aktif b{color:${C.coralDeep}}
.filtre-sayac{font-size:12px;color:${C.ink3};margin-left:4px}
.cipler{display:flex;flex-wrap:wrap;gap:5px;margin-top:9px;padding-top:9px;border-top:1px solid ${C.line}}
/* display:flex, tarayicinin hidden varsayilanini eziyor; acikca geri aliniyor */
.cipler[hidden]{display:none}
.cip{padding:5px 11px;border:1px solid ${C.line};background:${C.surface};border-radius:16px;font-size:12px;color:${C.ink2};cursor:pointer;font-family:inherit}
.cip:hover{border-color:${C.coralDeep};color:${C.coralDeep}}
.cip.aktif{background:${C.coralTint};border-color:${C.coralDeep};color:${C.coralDeep};font-weight:600}
.kaydir{margin-top:13px;max-height:min(62vh,700px);overflow-y:auto;border:1px solid ${C.line};border-radius:10px;scrollbar-width:thin}
.kaydir::-webkit-scrollbar{width:10px}
.kaydir::-webkit-scrollbar-track{background:${C.surface}}
.kaydir::-webkit-scrollbar-thumb{background:#C9C2B8;border-radius:8px;border:2px solid ${C.surface}}
table.veri{width:100%;border-collapse:collapse;font-size:13px}
table.veri th{position:sticky;top:0;z-index:2;background:${C.teal};color:#fff;font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;font-weight:700;padding:9px 11px;text-align:left;vertical-align:bottom}
table.veri th.sag{text-align:right}
table.veri th i{display:block;margin-top:2px;font-size:9.5px;font-style:normal;letter-spacing:.03em;text-transform:none;color:rgba(255,255,255,.62);font-weight:600}
table.veri td{padding:9px 11px;border-bottom:1px solid ${C.line};vertical-align:middle}
table.veri td.sag{text-align:right}
table.veri tbody tr:nth-child(odd){background:#fff}
table.veri tbody tr:nth-child(even){background:${C.zebra}}
table.veri tbody tr:hover{background:${C.coralTint}}
table.veri i.alt{display:block;font-style:normal;font-size:11px;color:${C.ink3};margin-top:2px}
.endeks{color:${C.coralDeep};font-weight:700}
.endeks.buyuk{font-size:14px}
.rozet{display:inline-block;padding:2px 8px;border-radius:11px;font-size:12px;font-weight:700;white-space:nowrap}
.rozet.poz{background:${C.greenWash};color:${C.green}}
.rozet.neg{background:${C.redWash};color:${C.red}}
.rozet.notr{background:#F0EDE8;color:${C.ink2}}
.soluk{color:${C.ink3};font-size:11px}
.yesil{color:${C.green};font-weight:700}
.kirmizi{color:${C.red}}
.bos{color:${C.ink3}}
.uyari{color:${C.gold};font-weight:700;margin-left:3px;cursor:help}
a.kwl{text-decoration:none;font-weight:700;border-bottom:1px dotted #B9B2A8}
a.kwl:hover{color:${C.coralDeep};border-bottom-color:${C.coralDeep}}
.tkart{border-bottom:1px solid ${C.line};padding:14px 16px;scroll-margin-top:8px}
.tkart:last-child{border-bottom:0}
.tkart-ust{display:flex;gap:16px;align-items:flex-start}
.tkart-sol{min-width:0;flex:1}
.tkart-kw{font-size:14.5px;font-weight:700}
.tkart-kat{font-size:11px;color:${C.ink3};margin-top:2px}
.tkart-meta{font-size:11.5px;color:${C.ink2};margin-top:4px}
.tkart-sag{display:flex;gap:18px;flex-shrink:0}
.metrik{text-align:center}
.metrik span{display:block;font-size:9.5px;letter-spacing:.05em;text-transform:uppercase;color:${C.ink3};font-weight:700;margin-bottom:3px;white-space:nowrap}
table.grafik{width:100%;border-collapse:collapse;table-layout:fixed;margin-top:11px;height:52px}
table.grafik td.cbar{vertical-align:bottom;padding:0 1px;cursor:default}
table.grafik i{display:block;width:100%;font-size:0}
.tkart-alt{display:flex;justify-content:space-between;margin-top:5px;font-size:10px;color:${C.ink3}}
.tkart-alt .vurgu{color:${C.coralDeep};font-weight:600}
/* Balon tek bir sabit konumlu ögeden basılır. Mutlak konumlu bir ::after,
   .kaydir gibi overflow taşıyan kaplar tarafından kırpılıyordu. */
[data-tip]{cursor:help}
[data-tip]:focus-visible{outline:2px solid ${C.coralDeep};outline-offset:2px}
#tt{position:fixed;left:0;top:0;width:280px;box-sizing:border-box;background:${C.teal};color:#fff;padding:9px 11px;border-radius:6px;font-size:11.5px;font-weight:500;line-height:1.45;letter-spacing:0;text-transform:none;text-align:left;white-space:normal;box-shadow:0 4px 16px rgba(16,51,47,.24);pointer-events:none;z-index:200}
.gizli{display:none!important}
footer{max-width:1560px;margin:0 auto;padding:0 24px 40px;font-size:11.5px;color:${C.ink3};line-height:1.6}
.adim{display:flex;gap:9px;margin-bottom:10px;font-size:13.5px;line-height:1.55;max-width:900px}
.adim .ok{color:${C.coralDeep};font-weight:700;flex-shrink:0}
</style>
</head>
<body>

<div class="appbar"><div class="appbar-in">
  <img class="marka" src="${logolar.marka}" alt="${esc(brandName)}">
  <div class="sag"><img class="ajans-logo" src="${logolar.ajans}" alt="${esc(agencyLabel)}"></div>
</div></div>

<div class="aytabs"><div class="aytabs-in">
  <div class="aytab-liste">${ayEtiketleri.map(a => a.aktif
    ? `<span class="aytab aktif">${esc(a.ad)}</span>`
    : a.url ? `<a class="aytab" href="${esc(a.url)}">${esc(a.ad)}</a>`
            : `<span class="aytab pasif" title="Bu ayın çalışması henüz hazırlanmamıştır">${esc(a.ad)}</span>`).join('')}</div>
  ${excelUrl ? `<a class="xls" href="${esc(excelUrl)}">Verileri Excel olarak indir</a>` : ''}
</div></div>

<div class="hero">
  <div class="hero-ust">
    <div class="eyebrow">AYLIK ARAMA TALEBİ INSIGHT'LARI</div>
    <h1>${esc(d.ayAdi)} ${aktifAy.yil}</h1>
  </div>
  <p>${esc(d.ayAdi)} ayının ${yilOnc} ve ${yilSon} arama hacmi${trendliler.length ? ` &amp; ${aktifAy.yil} Google Trends verileri` : ''}nden çıkarılan talep görünümü</p>
</div>

<div class="shell">
<nav class="sidenav" id="sidenav">
  ${BOLUMLER.map((b, i) => (b.grup ? `<h4>${esc(b.grup)}</h4>` : '')
    + `<a href="#${b.id}"><span class="n">${String(i).padStart(2, '0')}</span> ${esc(b.ad)}</a>`).join('\n  ')}
</nav>

<main>
  <section id="ozet">
    <div class="kpi">
      <div${tipAttr(A.kpiHacim)}><div class="e">Ayın Hacmi</div><div class="v">${fmtVol(d.ozet.hacim25)}</div><div class="s">${esc(d.ayKisa)} ${yilSon}</div></div>
      <div${tipAttr(A.kpiEndeks)}><div class="e">Mevsimsel Endeks</div><div class="v">${fmtIdx(d.ozet.endeks)}</div><div class="s">${yilSon} ortalamasına göre</div></div>
      <div${tipAttr(A.kpiSira)}><div class="e">Yıl İçi Sıra</div><div class="v">${d.ozet.siraYil}. <span class="soluk" style="font-size:13px">/ 12</span></div><div class="s">${yilSon} hacmine göre</div></div>
      <div><div class="e">Yükselen Başlık</div><div class="v">${d.havuzAdet}</div><div class="s">yıl ort. %15 üzeri</div></div>
    </div>
    ${ozet ? insightListe(ozet.giris, ozet.maddeler, null) : ''}
  </section>

  ${bolum(S.yuk, N(S.yuk), d.ayAdi + ' ayının yükselen başlıkları',
    `${yilOnc} ve ${yilSon} yıllarında üst üste yıl ortalamasının üzerine çıkan ${d.yukselenler.length} başlık.`,
    insightListe('Kolonların okunuşu:', [
      `<b>Endeks</b> - ${esc(d.ayAdi)} ${yilSon} hacminin, aynı başlığın ${yilSon} yıl ortalamasına oranı. "Bu ay aranıyor mu" sorusunu yanıtlar.`,
      `<b>Değişim</b> - ${esc(d.ayKisa)} ${yilOnc} ile ${esc(d.ayKisa)} ${yilSon} arasındaki fark. "Talep büyüyor mu" sorusunu yanıtlar.`,
      ...(canliVar ? [
        `<b>${L.sutun}</b> - Google Trends'ten ${esc(L.sonHafta)} değeri ve iki ayrı kıyas: son 30 gün öncesine ve geçen yılın aynı haftasına göre.`,
        `Arama adına tıklandığında ilgili başlığın Google Trends grafiğine gidilmektedir.`,
      ] : []),
    ], canliVar ? 'Bir başlık son 30 günde yükselirken geçen yılın altında kalabilir; bunlar farklı sorulardır. 0-100 ölçeği her başlığın kendi 53 haftalık penceresine göredir, başlıklar arasında kıyaslanmaz.' : null)
    + filtreCubugu(S.yuk, kat1ler, kat2ler, d.yukselenler.length, 'başlık')
    + `<div class="kaydir">${tablo(
        [['Arama', null, A.arama], ['Hacim', `${d.ayKisa} ${yilSon}`, A.hacim], ['Endeks', `${yilSon} ort.`, A.endeks],
         ['Değişim', `${d.ayKisa} ${yilOnc}→${String(yilSon).slice(2)}`, A.degisim],
         ...(canliVar ? [[L.sutun, 'Google Trends', A.canli]] : [])],
        yukSatir, canliVar ? ['l', 'r', 'r', 'r', 'r'] : ['l', 'r', 'r', 'r'], satirAttr(d.yukselenler))}</div>`)}

  ${bolum(S.keskin, N(S.keskin), 'En keskin mevsimsel yükselişler',
    'Hacim sıralamasında geride kalan, ancak kendi yıl ortalamasına göre en belirgin ayrışan başlıklar.',
    insightListe('Bu liste neden ayrı:', [
      'Yukarıdaki tablo hacme göre sıralıdır ve yüksek hacimli, ılımlı mevsimsel başlıkları öne çıkarır.',
      `Bu liste aynı havuzu <b>mevsimsel keskinliğe</b> göre sıralar: yıl geneline yayılmış talebi sınırlı, ${esc(d.ayAdi)} ayında yoğunlaşan başlıklardır.`,
      'Planlama açısından zamanlama hassasiyeti en yüksek grup budur.',
    ], null)
    + `<div class="kaydir">${tablo(
        [['Arama', null, A.arama], ['Endeks', `${yilSon} ort.`, A.endeks], ['Hacim', `${d.ayKisa} ${yilSon}`, A.hacim],
         ['Değişim', `${d.ayKisa} ${yilOnc}→${String(yilSon).slice(2)}`, A.degisim]],
        keskinSatir, ['l', 'r', 'r', 'r'])}</div>`)}

  ${trendliler.length ? bolum(S.trends, N(S.trends), "Google Trends Insight'ları",
    `${trendliler.length} başlığın Google Trends üzerindeki haftalık seyri.`,
    insightListe('Grafiklerin okunuşu:', [
      `Sol uç <b>${esc(trendsSol)}</b>, sağ uç ${esc(L.sonHafta)}. Koyu renkli bölüm son 30 günü işaretlemektedir.`,
      'Çubuğun üzerine gelindiğinde ilgili haftanın tarihi ve değeri görüntülenmektedir.',
      '0-100 ölçeği her başlığın kendi 53 haftalık penceresindeki zirvesine göredir; başlıklar arasında kıyaslanmaz.',
    ], `Bu bölüm ${L.kaynak} dayanır. Yukarıdaki tablolar Google Keyword Planner mutlak hacimlerinden gelir ve farklı dönemleri kapsar.`)
    + filtreCubugu(S.trends, sayim(trendliler, 'k1'), sayim(trendliler, 'k2'), trendliler.length, 'başlık')
    + `<div class="kaydir" id="trend-kap">${trendliler.map(r => trendKarti(r, trendsSol, d.ayKisa, yilSon)).join('')}</div>`) : ''}

  ${bolum(S.kat, N(S.kat), 'Alt kategori görünümü',
    `Kat 2 kırılımında ayın profili. Hacme göre ${d.altKategoriler.length} kırılım listelenmektedir.`,
    insightListe('Fark kolonu ne söyler:', [
      `Kategorinin ${esc(d.ayAdi)} ayındaki değişimi ile yıl genelindeki değişimi arasındaki puan farkıdır.`,
      'Pozitif değer, kategorinin bu ayda yıl geneline kıyasla daha dirençli seyrettiğine işaret etmektedir.',
    ], null)
    + duzFiltre(S.kat, katUstler, 'kırılım', d.altKategoriler.length)
    + `<div class="kaydir">${tablo(
        [['Alt kategori', null, A.altKategori], ['Hacim', `${d.ayKisa} ${yilSon}`, A.katHacim], ['Endeks', `${yilSon} ort.`, A.endeks],
         ['Değişim', `${d.ayKisa} ${yilOnc}→${String(yilSon).slice(2)}`, A.degisim], ['Fark', 'yıl geneline', A.fark]],
        katSatir, ['l', 'r', 'r', 'r', 'r'],
        (i) => ` data-k1="${esc(d.altKategoriler[i].ust || '')}"`)}</div>`)}

  ${d.buyuyenler.length ? bolum(S.buy, N(S.buy), 'Alt kırılımda büyüyen başlıklar',
    `Kat 3 seviyesinde ${d.ayKisa} ${yilOnc} - ${d.ayKisa} ${yilSon} arasında büyüyen kırılımlar.`,
    `<div class="kaydir">${tablo(
        [['Alt kırılım', null, A.altKirilim], ['Hacim', `${d.ayKisa} ${yilSon}`, A.katHacim],
         ['Değişim', `${d.ayKisa} ${yilOnc}→${String(yilSon).slice(2)}`, A.degisim]],
        buySatir, ['l', 'r', 'r'])}</div>`) : ''}

  ${d.markalar.length ? bolum(S.marka, N(S.marka), 'Katalogda yer almayan büyüyen markalar',
    `Portföyde bulunmayan, son 12 ayda büyüyen ${d.markalar.length} marka.`,
    insightListe('Nasıl seçildi:', [
      `${esc(brandName)} katalogunda yer almayan markalar arasından, aylık ortalama ${fmtVol(LIMITS.markaMinAylik)} aramanın üzerinde olan ve son 12 ayda ${fmtPct(LIMITS.markaMinBuyume)} üzeri büyüyen markalar listelenmektedir.`,
      'Katalog genişletme değerlendirmelerinde ele alınabilir.',
    ], null)
    + `<div class="kaydir">${tablo(
        [['Marka', null, A.marka], ['Aylık ort.', 'son 12 ay', A.markaAylik],
         ['Değişim', 'son 12 ay YoY', A.markaYoY], ['Endeks', `${d.ayKisa} ${yilSon}`, A.markaEndeks]],
        mrkSatir, ['l', 'r', 'r', 'r'])}</div>`) : ''}

  ${bolum(S.aksiyon, N(S.aksiyon), 'Değerlendirilebilecek adımlar', null,
    aksiyonlar.map(a => `<div class="adim"><span class="ok">&#10132;</span><div>${a}</div></div>`).join('')
    + (excelUrl ? `<p class="xls-alt"><a class="xls" href="${esc(excelUrl)}">Verileri Excel olarak indir</a></p>` : ''))}
</main>
</div>

<footer>
  Kaynak: Google Keyword Planner · Türkiye · aylık arama hacmi<br>
  Kapsam: ${esc(kapsam)}<br>
  Aylık hacimler Google Keyword Planner tarafından bantlanmış değerlerdir; yön göstergesi olarak değerlendirilmesi önerilir.
</footer>

<div id="tt" hidden></div>

<script>
(function(){
  // --- Yapışkan bar yüksekliği ---
  // Ay sekmelerinin ofseti appbar'a bağlı; sabit değer verilirse logo ya da
  // içerik değiştiğinde iki bar üst üste biniyor.
  function barOlc(){
    var ab = document.querySelector('.appbar');
    document.documentElement.style.setProperty('--appbar-h', (ab ? ab.offsetHeight : 0) + 'px');
  }
  barOlc();
  window.addEventListener('resize', barOlc);

  // --- Ay sekmeleri ---
  // On iki sekme dar ekranda sığmıyor ve liste kendi içinde kayıyor. Aktif ay
  // listenin sonundaysa (Kas, Ara) görünür alanın dışında kalıyordu; açılışta
  // ortaya alınır. scrollIntoView sayfayı da kaydırabildiği için scrollLeft kullanılır.
  function sekmeOrtala(){
    var L = document.querySelector('.aytab-liste'), a = L && L.querySelector('.aktif');
    if (!L) return;
    var tasar = L.scrollWidth > L.clientWidth + 1;
    L.classList.toggle('tasar', tasar);
    if (tasar && a) L.scrollLeft = Math.max(0, a.offsetLeft - L.offsetLeft - (L.clientWidth - a.offsetWidth) / 2);
  }
  sekmeOrtala();
  window.addEventListener('resize', sekmeOrtala);

  // --- Açıklama balonu ---
  // Tek öge; hedefin altına konumlanır, ekran kenarına taşarsa içeri çekilir,
  // altına sığmazsa üstüne alınır.
  var tt = document.getElementById('tt');
  function balonAc(el){
    tt.textContent = el.getAttribute('data-tip');
    tt.hidden = false;
    // Yüksekliği ölçmeden önce başlangıç noktasına alınır; aksi halde kutu
    // durduğu yere göre daralıp ölçüm yanıltıyor.
    tt.style.left = '0px'; tt.style.top = '0px';
    var r = el.getBoundingClientRect(), b = tt.getBoundingClientRect();
    var x = Math.min(Math.max(8, r.left), window.innerWidth - b.width - 8);
    var y = r.bottom + 7;
    if (y + b.height > window.innerHeight - 8) y = Math.max(8, r.top - b.height - 7);
    tt.style.left = x + 'px';
    tt.style.top = y + 'px';
  }
  function balonKapa(){ tt.hidden = true; }
  // Grafik çubukları binlerce öge; her birine ayrı dinleyici bağlanmaz.
  var aktifTip = null;
  function tipBul(e){ return e.target && e.target.closest ? e.target.closest('[data-tip]') : null; }
  document.addEventListener('mouseover', function(e){
    var el = tipBul(e);
    if (el === aktifTip) return;
    aktifTip = el;
    if (el) balonAc(el); else balonKapa();
  });
  document.addEventListener('focusin', function(e){
    var el = tipBul(e);
    aktifTip = el;
    if (el) balonAc(el); else balonKapa();
  });
  document.addEventListener('focusout', function(){ aktifTip = null; balonKapa(); });
  document.documentElement.addEventListener('mouseleave', function(){ aktifTip = null; balonKapa(); });
  window.addEventListener('scroll', function(){ aktifTip = null; balonKapa(); }, { passive:true });

  // --- ToC: tıklama, scroll-spy ---
  // Varsayılan hash gezinmesi sticky başlık altında kalıyor; kaydırma elle
  // hesaplanır (appbar + ay sekmeleri yüksekliği kadar pay bırakılır).
  var baglar = [].slice.call(document.querySelectorAll('.sidenav a'));
  var bolumler = baglar.map(function(a){ return document.getElementById(a.getAttribute('href').slice(1)); });
  function ustPay(){
    var ab = document.querySelector('.appbar'), at = document.querySelector('.aytabs');
    return (ab ? ab.offsetHeight : 0) + (at ? at.offsetHeight : 0) + 14;
  }

  // Yumuşak kaydırma. Sayfa ve kaydırılabilir kap birlikte animasyona girer,
  // böylece grafiğe atlarken iki hareket aynı anda biter.
  // Zamanlayıcıyla yürüyor: behavior:'smooth' ve requestAnimationFrame bazı
  // gömülü görüntüleyicilerde ilerlemiyor, zamanlayıcı her yerde çalışıyor.
  var kTimer = null;
  function kaydir(adimlar){
    if (kTimer) { clearInterval(kTimer); kTimer = null; }
    var bas = adimlar.map(function(a){ return a.el === window ? window.scrollY : a.el.scrollTop; });
    function uygula(e){
      adimlar.forEach(function(a, i){
        var v = bas[i] + (a.to - bas[i]) * e;
        if (a.el === window) window.scrollTo(0, v); else a.el.scrollTop = v;
      });
      spy();
    }
    var azalt = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (azalt) { uygula(1); return; }
    var sure = 420, t0 = Date.now();
    kTimer = setInterval(function(){
      var o = Math.min(1, (Date.now() - t0) / sure);
      uygula(1 - Math.pow(1 - o, 3));
      if (o === 1) { clearInterval(kTimer); kTimer = null; }
    }, 16);
  }
  baglar.forEach(function(a, i){
    a.addEventListener('click', function(e){
      var h = bolumler[i]; if(!h) return;
      e.preventDefault();
      kaydir([{ el: window, to: h.getBoundingClientRect().top + window.scrollY - ustPay() }]);
      history.replaceState(null, '', a.getAttribute('href'));
    });
  });
  function spy(){
    var y = ustPay() + 20, akt = 0;
    bolumler.forEach(function(h, i){ if(h && h.getBoundingClientRect().top <= y) akt = i; });
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) akt = bolumler.length - 1;
    baglar.forEach(function(a, i){ a.classList.toggle('aktif', i === akt); });
  }
  // Bazı gömülü/önizleme bağlamlarında programatik kaydırma scroll olayı
  // üretmiyor; vurgunun takılı kalmaması için konum ayrıca yoklanır.
  window.addEventListener('scroll', spy, { passive:true });
  var sonY = -1;
  setInterval(function(){
    if (window.scrollY !== sonY) { sonY = window.scrollY; spy(); }
  }, 150);
  spy();

  // --- Düz filtre: Kat 2 tablosunu üst kategorisine göre süzer ---
  document.querySelectorAll('.filtre.duz').forEach(function(f){
    var kap = document.getElementById(f.dataset.hedef);
    var birim = f.dataset.birim || 'satır';
    var satirlar = [].slice.call(kap.querySelectorAll('tbody tr[data-k1]'));
    var sayac = f.querySelector('.filtre-sayac');
    var secili = [];   // birden fazla kategori birlikte seçilebilir
    function uygula(){
      var gorunen = 0;
      satirlar.forEach(function(s){
        var uyar = !secili.length || secili.indexOf(s.dataset.k1) > -1;
        s.classList.toggle('gizli', !uyar);
        if (uyar) gorunen++;
      });
      sayac.textContent = secili.length
        ? gorunen + ' / ' + satirlar.length + ' ' + birim + ' · ' + secili.join(', ')
        : gorunen + ' ' + birim;
      // Tümü düğmesi, seçim boşaldığında kendiliğinden etkin duruma döner
      f.querySelectorAll('.mod').forEach(function(x){
        x.classList.toggle('aktif', x.dataset.deger ? secili.indexOf(x.dataset.deger) > -1 : !secili.length);
      });
      var k = kap.querySelector('.kaydir'); if (k) k.scrollTop = 0;
    }
    f.querySelectorAll('.mod').forEach(function(b){
      b.addEventListener('click', function(){
        var d = b.dataset.deger;
        if (!d) secili = [];
        else {
          var i = secili.indexOf(d);
          if (i > -1) secili.splice(i, 1); else secili.push(d);
        }
        uygula();
      });
    });
    uygula();
  });

  // --- Kategori filtreleri ---
  // Satır ve kartlar data-k1 / data-k2 taşır; filtre bunları gizler.
  document.querySelectorAll('.filtre:not(.duz)').forEach(function(f){
    var hedef = f.dataset.hedef;
    var kap = document.getElementById(hedef);
    var ogeler = [].slice.call(kap.querySelectorAll('tbody tr[data-k1], .tkart[data-k1]'));
    var sayac = f.querySelector('.filtre-sayac');
    var birim = f.dataset.birim || 'başlık';
    var secim = { seviye:null, degerler:[] };   // aynı kırılımda çoklu seçim

    function uygula(){
      var gorunen = 0;
      ogeler.forEach(function(o){
        var uyar = !secim.degerler.length || secim.degerler.indexOf(o.dataset[secim.seviye]) > -1;
        o.classList.toggle('gizli', !uyar);
        if (uyar) gorunen++;
      });
      sayac.textContent = secim.degerler.length
        ? gorunen + ' / ' + ogeler.length + ' ' + birim + ' · ' + secim.degerler.join(', ')
        : gorunen + ' ' + birim;
      var k = kap.querySelector('.kaydir'); if (k) k.scrollTop = 0;
    }
    f.querySelectorAll('.mod').forEach(function(b){
      b.addEventListener('click', function(){
        f.querySelectorAll('.mod').forEach(function(x){ x.classList.remove('aktif'); });
        b.classList.add('aktif');
        var mod = b.dataset.mod;
        f.querySelector('.cipler.k1').hidden = mod !== 'k1';
        f.querySelector('.cipler.k2').hidden = mod !== 'k2';
        f.querySelectorAll('.cip').forEach(function(c){ c.classList.remove('aktif'); });
        secim = { seviye:null, degerler:[] };
        uygula();
      });
    });
    f.querySelectorAll('.cip').forEach(function(c){
      c.addEventListener('click', function(){
        var deger = c.dataset.deger, seviye = c.dataset.seviye;
        // Kırılım değişirse önceki seçim taşınmaz
        if (secim.seviye !== seviye) {
          f.querySelectorAll('.cip').forEach(function(x){ x.classList.remove('aktif'); });
          secim = { seviye:seviye, degerler:[] };
        }
        var i = secim.degerler.indexOf(deger);
        if (i > -1) secim.degerler.splice(i, 1); else secim.degerler.push(deger);
        c.classList.toggle('aktif', i === -1);
        uygula();
      });
    });
    uygula();
  });

  // --- Tablodan grafiğe atlama ---
  // Hedef kart kaydırılabilir kabın içinde; hem kap hem sayfa konumlandırılır.
  document.querySelectorAll('a.kwl').forEach(function(a){
    a.addEventListener('click', function(e){
      var h = document.getElementById(a.getAttribute('href').slice(1));
      if(!h) return;
      e.preventDefault();
      var kap = document.getElementById('trend-kap');
      var bolumUst = document.getElementById('${S.trends}');
      var adimlar = [{ el: window, to: bolumUst.getBoundingClientRect().top + window.scrollY - ustPay() }];
      if (kap) adimlar.push({ el: kap, to: h.offsetTop - kap.offsetTop - 8 });
      kaydir(adimlar);
      h.style.transition = 'background .25s'; h.style.background = '${C.coralTint}';
      setTimeout(function(){ h.style.background = ''; }, 1400);
    });
  });
})();
</script>
</body></html>`;
}

module.exports = { render, C };
