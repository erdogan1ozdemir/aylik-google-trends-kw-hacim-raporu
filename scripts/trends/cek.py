# -*- coding: utf-8 -*-
"""Google Trends haftalık serileri, keyword başına ayrı istekle.
Toplu çekim 0-100 ölçeğini istek içinde normalize edip küçük hacimli kelimeyi
ezdiği için tek tek çekim zorunlu (references/trends-cekimi.md).
Kimlik bilgisi 600 izinli .curlrc dosyasındadır, argv'ye ve çıktıya girmez.

Pencere her istekte açık tarihle verilir (bas = Pazar, bit = Cumartesi, 53 tam hafta).
past_12_months kullanılmaz: çekim gününün haftası yarım kova olarak serinin sonuna
eklenir ve rapor "şu an" değerini o yarım haftadan okur."""
import json, io, sys, subprocess, tempfile, os, time
from concurrent.futures import ThreadPoolExecutor

URL = 'https://api.dataforseo.com/v3/keywords_data/google_trends/explore/live'
CURLRC = os.environ.get('TRENDS_CURLRC') or os.path.join(os.path.dirname(os.path.abspath(__file__)), '.curlrc')

def cek(istek, deneme=3):
    kw = istek['kw']; terim = istek.get('vekil') or kw
    govde = json.dumps([{ "location_code": 2792, "language_code": "tr",
        "keywords": [terim], "date_from": istek['bas'], "date_to": istek['bit'],
        "item_types": ["google_trends_graph"] }], ensure_ascii=False)
    for d in range(deneme):
        with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False, encoding='utf-8') as f:
            f.write(govde); yol = f.name
        try:
            p = subprocess.run(['curl', '-s', '--max-time', '90', '-K', CURLRC,
                                '-X', 'POST', '-d', '@' + yol, URL],
                               capture_output=True, text=True)
            o = json.loads(p.stdout)
            t = o['tasks'][0]
            if t.get('status_code') != 20000:
                raise RuntimeError(t.get('status_message'))
            noktalar = t['result'][0]['items'][0]['data']
            return {'kw': kw, 'pencere': istek['bit'], 'vekil': istek.get('vekil'),
                    'seri': [(n.get('values') or [None])[0] for n in noktalar],
                    'baslangic': noktalar[0]['date_from'], 'bitis': noktalar[-1]['date_to']}
        except Exception as e:
            if d == deneme - 1:
                return {'kw': kw, 'pencere': istek['bit'], 'hata': str(e)[:140]}
            time.sleep(2 * (d + 1))
        finally:
            os.unlink(yol)

if __name__ == '__main__':
    girdi, cikti = sys.argv[1], sys.argv[2]
    istekler = json.load(io.open(girdi, encoding='utf-8'))
    sonuc, n = {}, len(istekler)
    with ThreadPoolExecutor(max_workers=int(os.environ.get('TRENDS_ISCI', '12'))) as ex:
        for i, r in enumerate(ex.map(cek, istekler), 1):
            sonuc[r['pencere'] + '|' + r['kw']] = r
            if i % 25 == 0 or i == n: print(f'  {i}/{n}', flush=True)
    hatali = [k for k, v in sonuc.items() if 'hata' in v]
    pencere = {(v['baslangic'], v['bitis']) for v in sonuc.values() if 'seri' in v}
    uzunluk = {len(v['seri']) for v in sonuc.values() if 'seri' in v}
    print('cekilen  :', len(sonuc) - len(hatali), '/', n)
    print('hatali   :', len(hatali), hatali[:6])
    print('pencere  :', pencere)
    print('uzunluk  :', uzunluk)
    json.dump(sonuc, io.open(cikti, 'w', encoding='utf-8'), ensure_ascii=False)
