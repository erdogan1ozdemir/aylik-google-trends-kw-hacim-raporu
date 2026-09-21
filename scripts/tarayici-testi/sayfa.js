// Tek sayfanın bütün bileşenlerini ölçer. Tarayıcıda javascript_tool ile çalışır.
(async () => {
  const bekle = ms => new Promise(r => setTimeout(r, ms));
  const q = s => [...document.querySelectorAll(s)];
  const H = []; const hata = (m) => H.push(m);
  const ustPay = () => document.querySelector('.appbar').offsetHeight + document.querySelector('.aytabs').offsetHeight + 14;
  const tt = document.getElementById('tt');
  const hover = el => { el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); return tt.textContent; };

  // 1. İçindekiler: kırık bağlantı, tıklayınca bölüme gitme, scroll-spy
  const toc = q('.sidenav a');
  for (const a of toc) {
    const id = a.getAttribute('href').slice(1), sec = document.getElementById(id);
    if (!sec) { hata('ToC kırık: ' + id); continue; }
    a.click(); await bekle(520);
    const ust = sec.getBoundingClientRect().top;
    const sonBolum = innerHeight + scrollY >= document.body.scrollHeight - 4;
    if (!sonBolum && Math.abs(ust - ustPay()) > 6) hata(`ToC ${id}: bölüm üstü ${Math.round(ust)}, beklenen ${ustPay()}`);
    if (!a.classList.contains('aktif')) hata(`scroll-spy ${id}: aktif değil`);
  }
  // 2. Ay sekmeleri
  const sek = q('.aytab'); const aktif = q('.aytab.aktif');
  if (sek.length !== 12) hata('ay sekmesi ' + sek.length);
  if (aktif.length !== 1) hata('aktif sekme ' + aktif.length);
  const bosLink = q('a.aytab').filter(a => !/vercel\.app\//.test(a.href)); if (bosLink.length) hata('sekme bağlantısı hatalı');
  const excel = document.querySelector('.aytabs-in > a'); if (!excel || !/\.xlsx$/.test(excel.href)) hata('Excel düğmesi');
  // 3. Sütun açıklamaları
  let thBos = 0; for (const th of q('th[data-tip]')) { if (hover(th) !== th.getAttribute('data-tip')) thBos++; }
  const thAciklamasiz = q('th').filter(t => !t.hasAttribute('data-tip')).length;
  if (thBos) hata('sütun balonu açılmayan: ' + thBos); if (thAciklamasiz) hata('açıklamasız th: ' + thAciklamasiz);
  // 4. Grafik balonu (ilk ve son kart, ilk ve son çubuk)
  const kartlar = q('.tkart');
  for (const k of [kartlar[0], kartlar[kartlar.length - 1]].filter(Boolean)) {
    const c = k.querySelectorAll('.cbar'); if (c.length !== 53) hata(`${k.id}: ${c.length} çubuk`);
    for (const b of [c[0], c[c.length - 1]]) if (!/haftası · arama ilgisi \d+\/100/.test(hover(b))) hata(`${k.id} çubuk balonu: ${tt.textContent}`);
  }
  // 5. Keyword -> kart bağlantıları
  const ids = kartlar.map(k => k.id); const dup = ids.filter((x, i) => ids.indexOf(x) !== i); if (dup.length) hata('çift kart kimliği: ' + dup.join(','));
  const kwl = q('a.kwl'); const kirik = kwl.filter(a => !document.getElementById(a.getAttribute('href').slice(1)));
  if (kirik.length) hata('kırık keyword bağlantısı ' + kirik.length);
  const yukLink = q('#yukselenler a.kwl').length, keskinLink = q('#keskin a.kwl').length, keskinSatir = q('#keskin tbody tr').length;
  const kap = document.getElementById('trend-kap');
  async function kwTest(a, etiket) {
    a.click(); await bekle(560);
    const h = document.getElementById(a.getAttribute('href').slice(1)), hr = h.getBoundingClientRect(), kr = kap.getBoundingClientRect();
    const ok = h.offsetParent !== null && hr.top >= kr.top - 2 && hr.top < Math.min(kr.bottom, innerHeight) - 60 && hr.top >= 0;
    if (!ok) hata(`${etiket} ${a.textContent}: kart üstü ${Math.round(hr.top)}, kap ${Math.round(kr.top)}-${Math.round(kr.bottom)}, ekran ${innerHeight}`);
  }
  const yl = q('#yukselenler a.kwl');
  for (const i of [0, Math.floor(yl.length / 2), yl.length - 1]) if (yl[i]) await kwTest(yl[i], 'yükselen');
  for (const a of q('#keskin a.kwl').slice(0, 2)) await kwTest(a, 'keskin');
  // filtre açıkken gizli karta gitme
  const tf = document.querySelector('.filtre[data-hedef="trends"]');
  if (tf) {
    tf.querySelector('[data-mod="k1"]').click(); const cip = tf.querySelector('.cip[data-seviye="k1"]'); cip.click(); await bekle(40);
    const gizli = kartlar.find(k => k.classList.contains('gizli'));
    if (gizli) await kwTest(document.querySelector(`#yukselenler a[href="#${gizli.id}"]`), 'filtreli');
    tf.querySelector('[data-mod="tumu"]').click();
  }
  // 6. Filtreler: adet toplamı, çoklu seçim, Tümü
  for (const f of q('.filtre:not(.duz)')) {
    const hedef = document.getElementById(f.dataset.hedef); const og = [...hedef.querySelectorAll('tbody tr[data-k1], .tkart[data-k1]')];
    const toplam = +f.querySelector('[data-mod="tumu"] b').textContent;
    if (toplam !== og.length) hata(`${f.dataset.hedef} Tümü ${toplam} ≠ ${og.length}`);
    for (const sev of ['k1', 'k2']) {
      const cipler = [...f.querySelectorAll(`.cip[data-seviye="${sev}"]`)]; if (!cipler.length) continue;
      const tp = cipler.reduce((s, c) => s + +c.querySelector('b').textContent, 0);
      const bosK2 = sev === 'k2' ? og.filter(o => !o.dataset.k2).length : 0;
      if (tp + bosK2 !== og.length) hata(`${f.dataset.hedef} ${sev} adet toplamı ${tp}+${bosK2} ≠ ${og.length}`);
      f.querySelector(`[data-mod="${sev}"]`).click(); if (f.querySelector(`.cipler.${sev}`).hidden) hata(`${f.dataset.hedef} ${sev} çipleri açılmadı`);
      cipler[0].click(); if (cipler[1]) cipler[1].click();
      const beklenen = +cipler[0].querySelector('b').textContent + (cipler[1] ? +cipler[1].querySelector('b').textContent : 0);
      const gor = og.filter(o => !o.classList.contains('gizli')).length;
      if (gor !== beklenen) hata(`${f.dataset.hedef} ${sev} çoklu seçim ${gor} ≠ ${beklenen}`);
      f.querySelector('[data-mod="tumu"]').click();
      if (og.some(o => o.classList.contains('gizli'))) hata(`${f.dataset.hedef} Tümü sıfırlamadı`);
    }
  }
  // 7. Kat 2 tablosu Kat 1 filtresi (düz filtre)
  for (const f of q('.filtre.duz')) {
    const hedef = document.getElementById(f.dataset.hedef); const s = [...hedef.querySelectorAll('tbody tr[data-k1]')];
    const btn = [...f.querySelectorAll('.mod[data-deger]:not([data-deger=""])')]; const tp = btn.reduce((a, b) => a + +b.querySelector('b').textContent, 0);
    if (tp !== s.length) hata(`Kat2 filtre toplamı ${tp} ≠ ${s.length}`);
    btn[0].click(); if (s.filter(x => !x.classList.contains('gizli')).length !== +btn[0].querySelector('b').textContent) hata('Kat2 filtre');
    f.querySelector('.mod[data-deger=""]').click();
  }
  // 8. Taşma, "-" hücreleri, dil
  if (document.documentElement.scrollWidth > innerWidth) hata('yatay taşma ' + document.documentElement.scrollWidth);
  const govde = document.body.innerText;
  if (/bu hafta/i.test(govde)) hata('"bu hafta" geçiyor');
  if (/—/.test(document.documentElement.outerHTML)) hata('em dash');
  window.scrollTo(0, 0);
  return { sayfa: document.title.split('·')[1].trim(), W: innerWidth, toc: toc.length, kart: kartlar.length, yukLink, keskin: `${keskinLink}/${keskinSatir}`, th: q('th[data-tip]').length, hatalar: H };
})()
