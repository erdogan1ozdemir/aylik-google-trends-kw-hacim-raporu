// scripts/lib/rapor-metin.js
// Rapor metinleri: açılış özeti, aksiyon maddeleri ve sütun açıklamaları.
// E-posta ve web şablonlarının ikisi de buradan beslenir; metin tek yerde durur.

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
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Açılış bloğu: giriş cümlesi + madde listesi.
// Üç iş yapar: ayın yıl içindeki yerini söyler, bu tablonun kategorilere eşit
// dağılmadığını adlarıyla ve sayılarıyla gösterir, sonra okuyucuyu aşağıdaki
// listeye bağlar. Tek bir keyword üzerinden kurulmaz - örnek keyword seçmek
// ayın hikâyesini o kelimenin şansına bırakıyordu.
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
    const tumu = d.yukselenler.length >= havuz;
    maddeler.push(`Kendi yıl ortalamasının en az %${esikYuzde} üzerine çıkan `
      + `<strong>${havuz} başlık</strong> bulunmaktadır; `
      + (tumu ? 'tamamı aşağıda listelenmektedir.'
             : `aşağıda hacme göre ilk ${d.yukselenler.length} tanesi listelenmektedir.`));
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

// Sütun açıklamaları. Verinin kaynağını ve hesabını söyler; markaya giden
// çıktıda "bu sayı nereden geliyor" sorusu tabloda cevaplanmış olur.
function sutunAciklamalari(d, yilSon, yilOnc, marka = 'Marka') {
  const ay = d.ayAdi;
  return {
    arama: 'Google Keyword Planner listesindeki arama terimi. Alt satır, terimin bağlı olduğu ana kategoridir.',
    hacim: `Google Keyword Planner · ${ay} ${yilSon} aylık ortalama arama hacmi, Türkiye. Google bu değerleri bantlayarak verdiği için yön göstergesi olarak okunmalıdır.`,
    endeks: `${ay} ${yilSon} hacminin, aynı terimin ${yilSon} yıl ortalamasına oranı. 1.00x yıl ortalamasına eşit demektir; 2.00x, terimin bu ayda yıl ortalamasının iki katı arandığını gösterir.`,
    degisim: `${ay} ${yilOnc} ile ${ay} ${yilSon} arama hacimleri arasındaki yüzde değişim. Mevsimsellikten bağımsız olarak talebin yıllık yönünü verir.`,
    canli: `Google Trends · terimin son 12 aylık haftalık serisi, bu hafta itibarıyla. 0-100 ölçeği her terimin kendi 12 aylık zirvesine göredir, terimler arasında kıyaslanmaz. Alt satırlar iki ayrı kıyastır: son 30 gün öncesine ve geçen yılın aynı haftasına göre değişim.`,
    altKategori: `${marka} kategori ağacının Kat 2 seviyesi. Alt satır, bağlı olduğu Kat 1 ana kategorisidir.`,
    katHacim: `Kategoriye bağlı tüm terimlerin ${ay} ${yilSon} arama hacimleri toplamı.`,
    fark: `Kategorinin ${ay} ayındaki yıllık değişimi ile yıl genelindeki yıllık değişimi arasındaki puan farkı. Pozitif değer, kategorinin bu ayda yıl geneline kıyasla daha dirençli seyrettiğine işaret eder.`,
    altKirilim: 'Kategori ağacının Kat 3 seviyesi. Alt satır, bağlı olduğu Kat 1 ana kategorisidir.',
    marka: `Google Keyword Planner marka listesinde yer alan, ${marka} katalogunda bulunmayan marka.`,
    markaAylik: 'Markaya bağlı tüm terimlerin son 12 aydaki aylık ortalama arama hacmi.',
    markaYoY: 'Markanın son 12 aylık hacminin, önceki 12 aya göre yüzde değişimi.',
    markaEndeks: `Markanın ${ay} ${yilSon} hacminin, kendi ${yilSon} yıl ortalamasına oranı.`,
    kpiHacim: `${ay} ${yilSon} ayında portföydeki tüm keyword'lerin toplam arama hacmi. Kaynak: Google Keyword Planner · Türkiye. Google bu değerleri bantlayarak verdiği için yön göstergesi olarak okunmalıdır.`,
    kpiEndeks: `${ay} ${yilSon} toplam hacminin, ${yilSon} yılının aylık ortalamasına oranı. 1.00x yıl ortalamasına eşit demektir; bu değerin altı ayın yıl ortalamasının gerisinde, üstü ise ilerisinde kaldığını gösterir.`,
    kpiSira: `${ay} ayının, ${yilSon} yılının on iki ayı arasında toplam arama hacmine göre sırası. 1 en yüksek hacimli ayı, 12 en düşük hacimli ayı ifade eder.`,
  };
}


module.exports = { buildOzet, buildAksiyonlar, sutunAciklamalari, fmtVol, fmtPct, fmtIdx };
