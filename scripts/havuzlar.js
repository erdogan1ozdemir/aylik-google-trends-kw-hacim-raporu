// scripts/havuzlar.js
// On iki ayın yükselen başlık havuzlarını çıkarır; Trends çekim planının girdisidir.
// Havuz, web raporunun tablosuyla aynı fonksiyondan gelir: raporda görünen her
// başlık ölçülür, ölçülen her başlık raporda görünür.
//
// Kullanım: node scripts/havuzlar.js --config proje.json > havuzlar.json

const { buildMailingData } = require('./lib/mailing-data');
const { yukle } = require('./lib/proje');

let config = 'proje.json';
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--config') config = process.argv[++i];
}
const { D } = yukle(config);
const out = {};
for (let ay = 0; ay < 12; ay++) {
  out[ay + 1] = buildMailingData(D, ay, { yukselenLimit: 999, markaLimit: 0 }).yukselenler.map(r => r.kw);
}
process.stdout.write(JSON.stringify(out));
