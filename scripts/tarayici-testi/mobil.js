(async () => {
  const bekle = ms => new Promise(r => setTimeout(r, ms)); const H = [];
  const fab = document.getElementById('tocfab'), sheet = document.getElementById('tocsheet');
  if (getComputedStyle(fab).display === 'none') H.push('düğme görünmüyor');
  if (getComputedStyle(document.getElementById('sidenav')).display !== 'none') H.push('yan liste mobilde açık');
  fab.click(); await bekle(30);
  if (sheet.hidden) H.push('panel açılmadı');
  if (!document.body.classList.contains('toc-acik')) H.push('arka plan kilitlenmedi');
  const m = [...document.querySelectorAll('.sidenav a')].map(a => a.textContent), p = [...sheet.querySelectorAll('a')].map(a => a.textContent);
  const mh = document.querySelectorAll('.sidenav h4').length, ph = sheet.querySelectorAll('h4').length;
  if (JSON.stringify(m) !== JSON.stringify(p) || mh !== ph) H.push(`panel klon değil: ${p.length}/${m.length} bağlantı, ${ph}/${mh} grup`);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); await bekle(20);
  if (!sheet.hidden) H.push('Escape kapatmadı');
  fab.click(); sheet.click(); await bekle(20); if (!sheet.hidden) H.push('örtüye tıklama kapatmadı');
  fab.click(); const hedef = [...sheet.querySelectorAll('a')][4]; hedef.click(); await bekle(560);
  if (!sheet.hidden || document.body.classList.contains('toc-acik')) H.push('bağlantı paneli kapatmadı');
  const sec = document.getElementById(hedef.getAttribute('href').slice(1)); const ust = document.querySelector('.appbar').offsetHeight + document.querySelector('.aytabs').offsetHeight + 14;
  if (Math.abs(sec.getBoundingClientRect().top - ust) > 6) H.push(`panelden bölüme gitme: ${Math.round(sec.getBoundingClientRect().top)} / ${ust}`);
  fab.click(); await bekle(20); if (!sheet.querySelector('a.aktif') || sheet.querySelector('a.aktif').getAttribute('href') !== hedef.getAttribute('href')) H.push('panelde aktif vurgu yok');
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  const L = document.querySelector('.aytab-liste'), a = document.querySelector('.aytab.aktif'), lr = L.getBoundingClientRect(), ar = a.getBoundingClientRect();
  if (!(ar.left >= lr.left - 1 && ar.right <= lr.right + 1)) H.push('aktif ay sekmesi görünmüyor');
  if (document.documentElement.scrollWidth > innerWidth) H.push('yatay taşma ' + document.documentElement.scrollWidth);
  window.scrollTo(0, 0);
  return { sayfa: document.title.split('·')[1].trim().split(' ')[0], W: innerWidth, hatalar: H };
})()
