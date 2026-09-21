# -*- coding: utf-8 -*-
"""Ham Trends çekimini ay bazlı girdilere böler.

Geçmiş aylar kendi ay sonu penceresiyle çekilir ve dondurulur; aktif aylar
(içinde bulunulan ay ve sonrası) ortak haftalık pencereyi paylaşır. Ham dosyanın
anahtarı "pencere_sonu|keyword" olduğundan iki durum aynı dosyada durur.

Kullanım: python3 dagit.py ham.json pencere-plani.json havuz12.json veri.json [aktif_pencere_sonu]"""
import json, io, sys, datetime as dt
from collections import Counter

ham = json.load(io.open(sys.argv[1], encoding='utf-8'))
plan = json.load(io.open(sys.argv[2], encoding='utf-8'))
havuz = json.load(io.open(sys.argv[3], encoding='utf-8'))
veri = {k['kw']: k for k in json.load(io.open(sys.argv[4], encoding='utf-8'))['keywords']}
aktif_son = sys.argv[5] if len(sys.argv) > 5 else max(b for _, b in plan.values())

AY_TR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']
KISA = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara']
DOSYA = ['ocak','subat','mart','nisan','mayis','haziran','temmuz','agustos','eylul','ekim','kasim','aralik']

def hafta_etiketi(cmt):
    paz = cmt - dt.timedelta(days=6)
    if paz.month == cmt.month:
        return f'{paz.day}-{cmt.day} {KISA[cmt.month-1]} {cmt.year}'
    return f'{paz.day} {KISA[paz.month-1]} - {cmt.day} {KISA[cmt.month-1]} {cmt.year}'

sorun = []
for m in range(1, 13):
    bas, bit = plan[str(m)]
    cmt = dt.date.fromisoformat(bit)
    donmus = bit < aktif_son
    yol = f'trends-{DOSYA[m-1]}.json'
    if not any(k.startswith(bit + '|') for k in ham):
        # Bu turda çekilmedi: donmuş ay. Önceki dosya korunur; ay bu hafta
        # donduysa yalnızca işareti güncellenir ki sayfa "Canlı" demeye devam etmesin.
        try:
            eski = json.load(io.open(yol, encoding='utf-8'))
        except FileNotFoundError:
            print(f'  {AY_TR[m-1]:8} ATLANDI: bu pencere çekilmedi ve önceki dosya yok'); continue
        assert eski.get('seriBaslangic') == bas, f'{AY_TR[m-1]}: önceki dosya başka bir pencerenin ({eski.get("seriBaslangic")})'
        if eski.get('donmus') != donmus:
            eski['donmus'] = donmus
            json.dump(eski, io.open(yol, 'w', encoding='utf-8'), ensure_ascii=False)
        print(f'  {AY_TR[m-1]:8} korundu ({len(eski["kelimeler"])} başlık, {bas} -> {bit}) {"DONMUŞ" if donmus else "aktif"}')
        continue
    kel, eksik, pencereler = {}, [], Counter()
    for kw in havuz[str(m)]:
        v = ham.get(f'{bit}|{kw}')
        if not v or 'seri' not in v:
            eksik.append(kw); continue
        pencereler[(v['baslangic'], v['bitis'], len(v['seri']))] += 1
        kel[kw] = {'seri': v['seri'], 'vekil': v['vekil']} if v.get('vekil') else {'seri': v['seri']}
    # Pencere tek ve beklenen biçimde olmalı: Pazar başlangıç, Cumartesi bitiş, 53 kova
    assert len(pencereler) <= 1, f'{AY_TR[m-1]}: birden fazla pencere {pencereler}'
    if pencereler:
        (b, e, n), = pencereler
        assert (b, e, n) == (bas, bit, 53), f'{AY_TR[m-1]}: beklenmeyen pencere {b} {e} {n}'
    json.dump({'tarih': f'{cmt.day} {AY_TR[cmt.month-1]} {cmt.year}', 'seriBaslangic': bas,
               'sonHafta': hafta_etiketi(cmt), 'donmus': donmus, 'kelimeler': kel},
              io.open(yol, 'w', encoding='utf-8'), ensure_ascii=False)
    print(f'  {AY_TR[m-1]:8} {len(kel):4}/{len(havuz[str(m)]):<4} {bas} -> {bit}  son hafta {hafta_etiketi(cmt):22} {"DONMUŞ" if donmus else "aktif"}'
          + (f'  EKSİK {len(eksik)}: {eksik[:3]}' if eksik else ''))

# Anlam karışması: Trends zirve ayı ile Keyword Planner zirve ayı uyuşmuyorsa
# Trends başka bir varlığı ölçüyor olabilir (kemer -> Antalya'daki Kemer).
# Yalnızca tek kelimelik başlıklara bakılır; çok kelimeli ifadelerde karışma nadirdir.
def trends_aylik(v):
    s = v['seri']; b = dt.date.fromisoformat(v['baslangic'])
    ay = {}
    for i, x in enumerate(s):
        if x is not None: ay.setdefault((b + dt.timedelta(weeks=i, days=3)).month, []).append(x)
    return {m: sum(l) / len(l) for m, l in ay.items()}

def ay_farki(a, b): d = abs(a - b) % 12; return min(d, 12 - d)

# İki profil de gerçekten mevsimsel olmalı (zirve / ortalama >= 1.3). Düz
# profilli başlıklarda Keyword Planner'ın "zirve ayı" bant gürültüsüdür ve
# kural onları yanlış alarm olarak işaretliyordu (Özdilek: 19 -> 5).
MEVSIM_ESIK = 1.3
gorulen = set()
for anahtar, v in ham.items():
    kw = v['kw']
    if ' ' in kw or 'seri' not in v or kw in gorulen or kw not in veri: continue
    gorulen.add(kw)
    tr = trends_aylik(v)
    if len(tr) < 10: continue
    m25 = veri[kw]['m25']; gm = sum(m25) / 12
    if not gm: continue
    gkp = max(range(12), key=lambda i: m25[i]) + 1
    tz = max(tr, key=tr.get); tort = sum(tr.values()) / len(tr)
    if ay_farki(tz, gkp) >= 3 and m25[gkp - 1] / gm >= MEVSIM_ESIK and tr[tz] / tort >= MEVSIM_ESIK:
        sorun.append((kw, AY_TR[gkp-1], AY_TR[tz-1], v.get('vekil')))
print()
print(f'tek kelimelik başlık: {len(gorulen)} | zirve ayı uyumsuz, iki profil de mevsimsel: {len(sorun)} (incele, vekil gerekirse ekle)')
for kw, g, t, vk in sorun:
    print(f'   {kw:22} GKP zirvesi {g:8} Trends zirvesi {t:8}' + (f' (vekil: {vk})' if vk else ''))
seyrek = sum(1 for v in ham.values() if 'seri' in v and sum(x is None for x in v['seri']) / 53 > 0.20)
print(f'seyrek (>%20 boş) istek: {seyrek}/{len(ham)}')
