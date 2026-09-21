#!/bin/bash
# Haftalık Trends turu · örnek betik
# Projeye uyarlarken değiştirilecekler: SK (skill scripts yolu), R (yayın deposu),
# SITE (canlı adres), YIL (rapor yılı). Beklenen klasör düzeni: havuz12.json,
# veri.json, vekil.json, trends-<ay>.json, proje-<ay>.json ve derle.sh bu betikle
# aynı klasörde. Özdilek uygulaması: ozdilek-mailing/uretim/
#
#   plan -> çekim -> dağıtım -> derleme -> kontrol -> yayın -> canlı doğrulama
#
# Kullanım:
#   ./haftalik.sh          gerçek tur (DataForSEO harcaması yapar, yayınlar)
#   ./haftalik.sh --kuru   çekim ve yayın yok; mevcut veriyle derler ve kontrol eder
#
# Aynı pencere iki kez satın alınmaz: aktif ayların Trends dosyası bu haftanın
# penceresini zaten taşıyorsa tur çekim yapmadan biter.
set -euo pipefail
U="$(cd "$(dirname "$0")" && pwd)"
SK="/Users/Erdo/Desktop/Claude Projects/aylik-google-trends-kw-hacim-raporu/scripts"
R="/Users/Erdo/Desktop/Claude Projects/Özdilek/ozdilek-sezon-ozeti-eyl-2026"
SITE="https://ozdilek-sezon-ozeti-eyl-2026.vercel.app"
YIL=2026
KURU=0; [ "${1:-}" = "--kuru" ] && KURU=1
BUGUN="${BUGUN:-$(date +%F)}"
IS="$(mktemp -d)"; trap 'rm -rf "$IS"' EXIT
AYLAR=(ocak subat mart nisan mayis haziran temmuz agustos eylul ekim kasim aralik)

echo "== 1. Plan ($BUGUN)"
cd "$IS"
python3 "$SK/trends/plan.py" "$U/havuz12.json" --yil $YIL --bugun "$BUGUN" --donmuslari-atla --vekil "$U/vekil.json"
N=$(python3 -c "import json;print(len(json.load(open('istek.json'))))")
if [ "$N" = 0 ]; then echo "SONUC: Çekilecek aktif ay yok ($YIL raporlarının tamamı sabitlenmiş)."; exit 0; fi
AKTIF=$(python3 -c "import json;print(json.load(open('istek.json'))[0]['bit'])")
ILK_AKTIF=$(python3 -c "
import json;p=json.load(open('pencere-plani.json'))
print(min(int(m) for m,v in p.items() if v[1]=='$AKTIF'))")
MEVCUT=$(python3 -c "
import json,datetime as dt
t=json.load(open('$U/trends-${AYLAR[$((ILK_AKTIF-1))]}.json',encoding='utf-8'))
print((dt.date.fromisoformat(t['seriBaslangic'])+dt.timedelta(days=370)).isoformat())")

if [ $KURU = 0 ] && [ "$MEVCUT" = "$AKTIF" ]; then
  echo "SONUC: $AKTIF ile biten pencere zaten çekilmiş; tekrar satın alınmadı, değişiklik yok."; exit 0
fi

if [ $KURU = 1 ]; then
  echo "== 2. Çekim atlandı (kuru): $N istek, tahmini \$$(python3 -c "print(f'{$N*0.011:.2f}')")"
else
  echo "== 2. Çekim: $N istek"
  python3 "$SK/trends/kimlik.py" "$IS/.curlrc" >/dev/null
  TRENDS_CURLRC="$IS/.curlrc" python3 "$SK/trends/cek.py" istek.json ham.json | tail -4
  rm -f "$IS/.curlrc"
  echo "== 3. Dağıtım"
  cd "$U" && python3 "$SK/trends/dagit.py" "$IS/ham.json" "$IS/pencere-plani.json" havuz12.json veri.json
fi

echo "== 4. Derleme"
cd "$U" && ./derle.sh

echo "== 5. Kontrol"
python3 - "$U" "$AKTIF" "$KURU" <<'PY'
import sys, json, io, re, datetime as dt
U, aktif, kuru = sys.argv[1], sys.argv[2], sys.argv[3] == '1'
A = ['ocak','subat','mart','nisan','mayis','haziran','temmuz','agustos','eylul','ekim','kasim','aralik']
hata = []
for i, a in enumerate(A):
    t = json.load(io.open(f'{U}/trends-{a}.json', encoding='utf-8'))
    h = io.open(f'{U}/cikti/{a}/index.html', encoding='utf-8').read()
    m = io.open(f'{U}/cikti/{a}/mail.html', encoding='utf-8').read()
    son = (dt.date.fromisoformat(t['seriBaslangic']) + dt.timedelta(days=370)).isoformat()
    if f"son hafta ({t['sonHafta']})" not in h: hata.append(f'{a}: son hafta etiketi yok')
    if '—' in h or '—' in m: hata.append(f'{a}: em dash')
    if re.search('[âîû]', h + m): hata.append(f'{a}: şapkalı harf')
    if 'bu hafta' in h: hata.append(f'{a}: "bu hafta"')
    if t['donmus'] and '>Canlı<' in h: hata.append(f'{a}: donmuş sayfada Canlı')
    if not kuru and not t['donmus'] and son != aktif: hata.append(f'{a}: aktif ay güncel pencerede değil ({son})')
    kart, link = h.count('class="tkart"'), h.count('class="kwl"')
    if kart == 0 or link < kart: hata.append(f'{a}: kart {kart}, bağlantı {link}')
print('kontrol hatası:', hata if hata else 'yok')
sys.exit(1 if hata else 0)
PY

if [ $KURU = 1 ]; then echo "SONUC: Kuru tur tamam; yayın yapılmadı."; exit 0; fi

echo "== 6. Yayın"
cd "$R" && git pull -q
for a in "${AYLAR[@]}"; do
  d=$([ $a = eylul ] && echo . || echo $a); mkdir -p $d
  cp "$U/cikti/$a/index.html" "$d/index.html"
  cp "$U/cikti/$a/ozdilekteyim-$a-$YIL-arama-talebi.xlsx" "$d/"
done
HAFTA=$(python3 -c "import json;print(json.load(open('$U/trends-${AYLAR[$((ILK_AKTIF-1))]}.json',encoding='utf-8'))['sonHafta'])")
git add -A
if git diff --cached --quiet; then echo "SONUC: Değişiklik yok, yayın yapılmadı."; exit 0; fi
git commit -q -m "Haftalık Trends güncellemesi: son hafta $HAFTA

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push -q
echo "commit: $(git log --oneline -1)"

echo "== 7. Canlı doğrulama"
for i in $(seq 1 60); do
  curl -s "$SITE/${AYLAR[$((ILK_AKTIF-1))]}/?cb=$RANDOM" | grep -q "son hafta ($HAFTA)" && break; sleep 5
done
for a in "${AYLAR[@]}"; do
  yol=$([ $a = eylul ] && echo "" || echo "$a/")
  printf "  %-8s %s  %s\n" $a "$(curl -s -o /dev/null -w '%{http_code}' "$SITE/$yol?cb=$RANDOM")" "$(curl -s "$SITE/$yol?cb=$RANDOM" | grep -o 'son hafta ([^)]*)' | head -1)"
done
echo "SONUC: Tamamlandı. Son hafta $HAFTA, $N istek (~\$$(python3 -c "print(f'{$N*0.011:.2f}')"))."
