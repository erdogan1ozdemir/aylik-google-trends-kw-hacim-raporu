# Google Trends Çekimi

Canlı katman DataForSEO üzerinden alınır. Bu dosya, pahalıya öğrenilmiş kuralları taşır.

## Endpoint

```
POST /v3/keywords_data/google_trends/explore/live

[{
  "location_code": 2792,          // Türkiye. location_name kabul edilmiyor
  "language_code": "tr",
  "keywords": ["okul çantası"],   // TEK keyword
  "time_range": "past_12_months",
  "item_types": ["google_trends_graph"]
}]
```

Yanıt haftalık noktalar döner: `date_from`, `date_to`, `values[0]`. Değer yoksa `values` alanı **hiç gelmez** (null değil, eksik anahtar). Ayrıştırırken bu durum `null`a çevrilir.

Maliyet: istek başına yaklaşık **$0.011**. 100 keyword ≈ $1.10.

## Kural 1: Her keyword ayrı istekte

**0-100 ölçeği istek içinde normalize edilir.** Aynı isteğe birden fazla keyword koyarsan hepsi en büyüğüne göre ölçeklenir ve küçük hacimli olan kullanılamaz hale gelir.

Ölçülen örnek: `beslenme çantası` toplu çekimde **4/100**, tek başına çekildiğinde **55/100** ve son dört hafta 14 → 29 → 49 → 55 yükselişte. Toplu çekim bu sinyali tamamen yok ediyordu.

Toplu çekimin maliyet avantajı (5 keyword tek istekte) veriyi geçersiz kıldığı için anlamsızdır.

## Kural 2: Pencere bugüne göre kayar

`past_12_months` bugünden geriye 52 hafta demektir. **İki farklı günde çekilen seriler hizalanmaz.**

Ölçülen örnek: 2 Eylül'de çekilen seriler `2025-08-31` başlıyordu, 9 Eylül'de çekilenler `2025-09-07`. Karıştırmak "geçen yıl aynı hafta" referansını ve grafik eksenini bozar.

**Sonuç: bir raporun bütün keyword'leri aynı gün çekilir.** Kapsam genişletilecekse daha önce çekilenler de yeniden çekilir. Çıktıya `seriBaslangic` yazılır ve şablon ekseni bundan türetir.

## Kural 3: Anlam karışması ve vekil terim

Tek kelimelik jenerik başlıklarda Trends farklı bir varlığı ölçebiliyor.

Ölçülen örnek: `kemer` Temmuz'da 100'e çıkıyor - Trends bunu Antalya'daki Kemer ilçesi olarak okuyor, aksesuar olarak değil.

Çözüm: ölçüm alternatif bir terimle yapılır (`kemer` → `kemer modelleri`) ve çıktıda `vekil` alanı doldurulur. Rapor bunu gizlemez, değerin yanındaki işarete gelindiğinde açıklar.

**Vekil terim gerçekten düzeltiyor mu, kontrol et.** `hoodie` Şubat'ta 7 → 100 → 6 sıçraması gösteriyordu; `hoodie sweatshirt` ile ölçüldüğünde aynı sıçrama çıktı. Yani karışma değil, gerçek arama davranışıydı. Vekil eklenmedi.

Çok kelimeli spesifik başlıklarda (`okul çantası`, `beslenme çantası`) bu sorun yoktur.

## Kural 4: Seyrek veri işaretlenir

Google, arama hacmi eşiğinin altındaki haftalarda değer döndürmez. Haftaların %20'sinden fazlası boşsa (`SEYREK_ESIK`) başlık işaretlenir.

Ölçülen örnek: `çıt çıt dosya` 53 haftanın 50'sinde boş, `nıke sweatshirt` 52'sinde boş. Bunlar silinmez - listede kalır ama değerlerinin yön göstergesi olduğu yazılır.

**Ölçüm yapılmadı ile veri gelmedi ayrı şeylerdir.** Excel'de satırın tümü `-` ise ölçüm yapılmamış, tek hücre `-` ise ölçülmüş ama o hafta veri gelmemiş demektir. Terim sözlüğünde bu ayrım açıkça yazılır.

## Girdi Biçimi

Script'e stdin ile geçilen JSON:

```json
{
  "tarih": "9 Kasım 2026",
  "seriBaslangic": "2025-11-09",
  "kelimeler": {
    "okul çantası": { "seri": [53, 21, 14, null, ...] },
    "kemer":        { "seri": [...], "vekil": "kemer modelleri" }
  }
}
```

`seri` tam 53 haftalık dizi, eksik haftalar `null`. Diske yazılmaz:

```bash
node scripts/build-web.js --config proje.json --ay 11 --trends-stdin < trends.json
```

## Kapsam Kararı

Havuzun tamamı çekilebilir (103 keyword ≈ $1.13) ya da hacme göre ilk N. Kapsam ne olursa olsun:

- Ölçülmeyen başlıklar tabloda ve Excel'de `-` ile işaretlenir
- Kapsam notu kaç başlığın ölçüldüğünü yazar
- Yarısı ölçülmüş bir tablo sessizce teslim edilmez

## Yaygın Hatalar

| Hata | Sonuç |
|---|---|
| Toplu çekim | Küçük hacimli keyword ezilir, sinyal kaybolur |
| Farklı günlerde çekim | Seriler hizalanmaz, yıllık kıyas bozulur |
| GKP yıllarını Trends eksenine yazmak | Grafik yanlış yılı gösterir |
| Boş haftayı 0 saymak | Düşüş varmış gibi görünür. `null` bırakılır |
| Trends değerlerini keyword'ler arasında kıyaslamak | Ölçek keyword'e özel, kıyaslanamaz |
