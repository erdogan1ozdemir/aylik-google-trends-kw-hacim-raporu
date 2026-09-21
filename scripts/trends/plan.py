# -*- coding: utf-8 -*-
"""Aylık havuzlardan Trends çekim planını kurar.

Geçmiş aylar kendi ay sonu penceresiyle, içinde bulunulan ay ve sonrası ortak
haftalık pencereyle istenir (references/trends-cekimi.md, Kural 2 ve 5).
Pencere her zaman Pazar başlar, Cumartesi biter: 53 tam hafta.

Kullanım:
  python3 plan.py havuzlar.json --yil 2026 [--bugun 2026-09-21] [--aylar 1-12]
                  [--donmuslari-atla] [--vekil vekil.json]
Çıktı: istek.json (çekilecekler) ve pencere-plani.json (ay -> [bas, bit])"""
import json, io, sys, argparse, datetime as dt

ap = argparse.ArgumentParser()
ap.add_argument('havuzlar'); ap.add_argument('--yil', type=int, required=True)
ap.add_argument('--bugun', default=dt.date.today().isoformat())
ap.add_argument('--aylar', default='1-12', help='plana girecek aylar, ör. 9-12')
ap.add_argument('--donmuslari-atla', action='store_true',
                help='haftalık turda geçmiş aylar yeniden çekilmez')
ap.add_argument('--vekil', help='{"kemer": "kemer modelleri"} biçiminde vekil terimler')
a = ap.parse_args()

H = json.load(io.open(a.havuzlar, encoding='utf-8'))
VEKIL = json.load(io.open(a.vekil, encoding='utf-8')) if a.vekil else {}
bugun = dt.date.fromisoformat(a.bugun)
m1, m2 = (int(x) for x in a.aylar.split('-'))

def son_cmt(g): return g - dt.timedelta(days=(g.weekday() - 5) % 7)
def ay_son(m): return (dt.date(a.yil, m + 1, 1) if m < 12 else dt.date(a.yil + 1, 1, 1)) - dt.timedelta(days=1)
def pencere(c): return (c - dt.timedelta(days=370)).isoformat(), c.isoformat()

aktif_c = son_cmt(bugun)
plan, istek, gorulen = {}, [], set()
for m in range(m1, m2 + 1):
    ay_c = son_cmt(ay_son(m))
    donmus = ay_c < aktif_c          # ayın son tam haftası tamamlandıysa ay geçmiştir
    b, e = pencere(ay_c if donmus else aktif_c)
    plan[m] = (b, e)
    if donmus and a.donmuslari_atla: continue
    for kw in H[str(m)]:
        if (e, kw) in gorulen: continue   # aktif aylar ortak pencerede tekilleşir
        gorulen.add((e, kw))
        r = {'kw': kw, 'bas': b, 'bit': e}
        if kw in VEKIL: r['vekil'] = VEKIL[kw]
        istek.append(r)

json.dump(istek, io.open('istek.json', 'w', encoding='utf-8'), ensure_ascii=False)
json.dump({str(k): v for k, v in plan.items()}, io.open('pencere-plani.json', 'w', encoding='utf-8'))
AY = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara']
for m, (b, e) in plan.items():
    print(f'  {AY[m-1]}  {b} -> {e}  {"aktif" if e == aktif_c.isoformat() else "donmuş"}')
print(f'istek: {len(istek)}  tahmini maliyet: ${len(istek) * 0.011:.2f}')
