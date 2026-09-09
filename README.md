# Aylık Arama Talebi Raporu

Bir markanın keyword hacim geçmişinden ve canlı Google Trends verisinden her ay tekrarlanan talep raporu üreten Claude Code skill'i ve üretim makinesi.

Cevapladığı soru: **önümüzdeki ay hangi başlıklar aranmaya başlayacak, bu hareket hangi hafta başlıyor, geçen yıla göre nasıl gidiyor?**

Üç çıktı verir:

| Çıktı | Kullanım |
|---|---|
| **Web raporu** | Tek HTML dosya. Filtreli tablolar, haftalık Trends grafikleri, içindekiler. Vercel'e bağlanır |
| **E-posta özeti** | Tablo tabanlı, satır içi CSS. Doğrudan e-posta gövdesine yapıştırılır |
| **Excel** | Havuzun tamamı, haftalık Trends serisi, terim sözlüğü |

## Kurulum

Skill olarak kullanmak için depoyu skills dizinine klonla:

```bash
git clone https://github.com/erdogan1ozdemir/aylik-google-trends-kw-hacim-raporu.git \
  ~/.claude/skills/aylik-arama-talebi-raporu
```

Bağımlılıklar: Node 18+, Python 3 ve `openpyxl`.

```bash
pip install openpyxl
```

## Hızlı Başlangıç

```bash
cp -r ornek/ ../yeni-marka && cd ../yeni-marka
# proje.json içindeki alanları doldur, logoları ve veri.json'u koy

node ../scripts/build-web.js --config proje.json --ay 11 --trends-stdin < trends.json
```

`ornek/` klasöründe çalışan bir örnek var: yapılandırma, iki logo ve sentetik bir veri seti.

## Yapı

```
SKILL.md                      Süreç, kararlar ve nedenleri
references/
  veri-sozlesmesi.md          Girdi şeması, GKP ve SEOmonitor'dan üretim
  metrikler.md                Formüller, eşikler, dönem modeli
  trends-cekimi.md            DataForSEO kuralları, vekil terim, seyrek veri
  rapor-yapisi.md             Bölümler, üst bar, metin kuralları
  on-yuz-tuzaklari.md         Sessizce kırılan davranışlar ve kök nedenleri
  teslim-kontrol.md           Teslim öncesi kontrol listesi
scripts/                      Üretim makinesi (Node + Python)
ornek/                        Çalışan örnek proje
```

## Markaya Göre Değişenler

Şablonlar marka bilmez; markaya özel her şey `proje.json` içindedir.

Bölümlerin çoğu her markada açılır. **"Katalogda yer almayan büyüyen markalar" bölümü yalnızca kendi kataloğunu bilen markalarda** anlamlıdır - girdide `brands` yoksa bölüm hem web'de hem Excel'de hiç açılmaz, içindekiler kendini buna göre kurar.

## Notlar

- Keyword araştırması yoksa SEOmonitor'da takip edilen kelimelerden başlanabilir; `references/veri-sozlesmesi.md`
- Trends verisi diske yazılmaz, stdin ile geçilir; kimlik bilgisi gerekmez
- Metin çıktıları İçerik Dili Rehberi [A] kurumsal rejimine tabidir
