# Google Trends Çekimi

Canlı katman DataForSEO üzerinden alınır. Bu dosya, pahalıya öğrenilmiş kuralları taşır.

## Endpoint

```
POST /v3/keywords_data/google_trends/explore/live

[{
  "location_code": 2792,          // Türkiye. location_name kabul edilmiyor
  "language_code": "tr",
  "keywords": ["okul çantası"],   // TEK keyword
  "date_from": "2025-09-14",      // Pazar
  "date_to": "2026-09-19",        // Cumartesi: son tamamlanmış hafta
  "item_types": ["google_trends_graph"]
}]
```

Yanıt haftalık noktalar döner: `date_from`, `date_to`, `values[0]`. Değer yoksa `values` alanı **hiç gelmez** (null değil, eksik anahtar). Ayrıştırırken bu durum `null`a çevrilir.

Maliyet: istek başına yaklaşık **$0.011**. 100 keyword ≈ $1.10.

## Kural 1: Her keyword ayrı istekte

**0-100 ölçeği istek içinde normalize edilir.** Aynı isteğe birden fazla keyword koyarsan hepsi en büyüğüne göre ölçeklenir ve küçük hacimli olan kullanılamaz hale gelir.

Ölçülen örnek: `beslenme çantası` toplu çekimde **4/100**, tek başına çekildiğinde **55/100** ve son dört hafta 14 → 29 → 49 → 55 yükselişte. Toplu çekim bu sinyali tamamen yok ediyordu.

Toplu çekimin maliyet avantajı (5 keyword tek istekte) veriyi geçersiz kıldığı için anlamsızdır.

## Kural 2: Pencere açık tarihle istenir, son tamamlanmış haftada biter

Google Trends haftaları **Pazar-Cumartesi**. `past_12_months` çekim gününün haftasını serinin sonuna **yarım kova** olarak ekler ve şablon "şu an" değerini, "geçen yıl aynı hafta" ve "son 30 günde" rozetlerini bu yarım kovadan okur.

Ölçülen örnek: 21 Eylül 2026 Pazartesi çekilen 337 seride son kova 20-26 Eylül, yani 2 günlük. Sonbahar yükselişi sürerken `son kova / önceki kova` medyanı **0.894** çıktı (önceki iki hafta 1.189 ve 1.082); 51 başlıkta son kova tamamen boştu, bir önceki haftada hiç boş yoktu. Rapor iki gün boyunca yükselen talebi düşüş gibi gösteriyordu.

Kural:

- `date_to` = çekim gününden önceki **son Cumartesi**
- `date_from` = `date_to - 370 gün` (**Pazar**). Böylece tam 53 kova döner ve `seri[0]` ile `seri[52]` tam 52 hafta arayla aynı takvim haftasıdır
- `date_from` Pazar değilse Google başlangıcı önceki Pazar'a kaydırır ve **54 kova** döner; "geçen yıl aynı hafta" bir hafta kayar. Ölçüldü: `2025-01-18` (Cumartesi) başlangıcı `2025-01-12`'ye kaydı
- Dağıtım betiği her ayın penceresinin `(Pazar, Cumartesi, 53)` olduğunu doğrular, uymuyorsa durur

Açık tarih kullanıldığı için aynı hafta içinde farklı günlerde yapılan çekimler de hizalanır. Yine de bir ayın bütün keyword'leri **aynı pencereyle** çekilir; çıktıya `seriBaslangic` yazılır ve şablon ekseni bundan türetir.

**Haftalık güncelleme günü:** Pazar veya Pazartesi. Cumartesi biten hafta ertesi gün tam kovadır; hafta ortasında çekmek yeni bir hafta kazandırmaz, aynı pencereyi yeniden satın almak olur.

## Kural 3: Anlam karışması ve vekil terim

Tek kelimelik jenerik başlıklarda Trends farklı bir varlığı ölçebiliyor.

Ölçülen örnek: `kemer` Temmuz'da 100'e çıkıyor - Trends bunu Antalya'daki Kemer ilçesi olarak okuyor, aksesuar olarak değil.

Çözüm: ölçüm alternatif bir terimle yapılır (`kemer` → `kemer modelleri`) ve çıktıda `vekil` alanı doldurulur. Rapor bunu gizlemez, değerin yanındaki işarete gelindiğinde açıklar.

**Vekil terim gerçekten düzeltiyor mu, kontrol et.** `hoodie` Şubat'ta 7 → 100 → 6 sıçraması gösteriyordu; `hoodie sweatshirt` ile ölçüldüğünde aynı sıçrama çıktı. Yani karışma değil, gerçek arama davranışıydı. Vekil eklenmedi.

Çok kelimeli spesifik başlıklarda (`okul çantası`, `beslenme çantası`) bu sorun yoktur.

**Karışmayı bulmanın genel yolu: zirve ayı karşılaştırması.** Tek kelimelik her başlıkta Trends serisinin zirve ayı ile Keyword Planner'ın zirve ayı karşılaştırılır; aralarında üç ay ve üzeri fark varsa başlık incelemeye alınır. "Yaz zirveli tek kelime" gibi ay kuralları kullanılmaz: Haziran-Temmuz raporunda mayo ve şort da yaz zirvelidir ve hepsi yanlış alarm verir.

## Kural 4: Seyrek veri işaretlenir

Google, arama hacmi eşiğinin altındaki haftalarda değer döndürmez. Haftaların %20'sinden fazlası boşsa (`SEYREK_ESIK`) başlık işaretlenir.

Ölçülen örnek: `çıt çıt dosya` 53 haftanın 50'sinde boş, `nıke sweatshirt` 52'sinde boş. Bunlar silinmez - listede kalır ama değerlerinin yön göstergesi olduğu yazılır.

**Ölçüm yapılmadı ile veri gelmedi ayrı şeylerdir.** Excel'de satırın tümü `-` ise ölçüm yapılmamış, tek hücre `-` ise ölçülmüş ama o hafta veri gelmemiş demektir. Terim sözlüğünde bu ayrım açıkça yazılır.

## Kural 5: Geçmiş aylar ay sonunda dondurulur

Rapor sayfası bir aya aittir; üç Trends metriği de serinin **son haftasına** bağlıdır (`simdi = seri[n-1]`, `gecenYil = seri[0]`, `otuzGunOnce = seri[n-5]`). Ocak sayfasının penceresi Eylül'de bitiyorsa rozet Eylül'ü geçen Eylül'le kıyaslar, coral "son 30 gün" bandı Eylül'e düşer. Bu yüzden:

| Ay durumu | Pencere sonu | Güncelleme |
|---|---|---|
| İçinde bulunulan ay ve sonrası | Son tamamlanmış Cumartesi | Haftalık, hepsi ortak pencere |
| Geçmiş ay | Ayın son gününü içeren haftanın Cumartesi'si | Bir kez, sonra dondurulur |

- Ayın son günleri seriden düşmez: son kova, ayın son gününü içeren haftadır. Ay sonu Cumartesi'ye denk gelmiyorsa bu haftanın bir kısmı sonraki aya taşar (0-6 gün). İlk sürümde pencere ayın içindeki son Cumartesi'de bitiyordu; Temmuz sayfası 19-25 Temmuz'da bitiyor, 26-31 Temmuz görünmüyordu. Kullanıcı kararıyla değişti
- Uç durum: ay sonu Pazar ise (Mayıs 2026) son kova 31 May - 6 Haz olur ve ayın yalnızca 1 gününü taşır
- Aktif bir ayın son haftalık güncellemesi, o ayın dondurma çekimidir. Ek istek gerekmez. Ay, son gününü içeren hafta tamamlanana kadar aktif kalır (Eylül 2026: 3 Ekim)
- 0-100 ölçeği pencere içindeki zirveye göre normalize edildiği için donmuş aylar ile aktif aylar arasında değer kıyası yapılmaz
- Donmuş sayfada "Canlı" ve "bu hafta" denmez; şablon ifadeleri `donmus` alanından alır (`trendsDili()`)

**Maliyet ve tekilleştirme.** Aktif aylar aynı pencereyi paylaştığı için bir keyword'ün serisi hepsini besler; havuzlar arasında tekrar eden keyword bir kez çekilir. Geçmiş aylarda bu mümkün değildir: Ocak ve Mart pencereleri farklıdır, aynı keyword iki ayrı istektir.

Ölçülen örnek (Özdilek 2026): Oca-Ağu geçmiş ay havuzları toplam 1.491 istek ($16.40); aynı başlıklar ortak pencereyle çekilseydi 743 tekil istek olurdu. Fark, doğru anlamın tek seferlik bedelidir.

## Girdi Biçimi

Script'e stdin ile geçilen JSON:

```json
{
  "tarih": "7 Kasım 2026",
  "seriBaslangic": "2025-11-02",
  "sonHafta": "1-7 Kas 2026",
  "donmus": false,
  "kelimeler": {
    "okul çantası": { "seri": [53, 21, 14, null, ...] },
    "kemer":        { "seri": [...], "vekil": "kemer modelleri" }
  }
}
```

`seri` tam 53 haftalık dizi, eksik haftalar `null`. `tarih` pencerenin son günü, `sonHafta` son kovanın etiketi, `donmus` geçmiş ay işaretidir. Diske yazılmaz:

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
| Farklı pencerelerle çekim | Seriler hizalanmaz, yıllık kıyas bozulur |
| `past_12_months` | Son kova çekim gününün yarım haftası; "şu an" değeri düşük okunur |
| `date_from` Pazar değil | 54 kova, "geçen yıl aynı hafta" bir hafta kayar |
| Geçmiş ayı bugünkü pencereyle çekmek | Ocak sayfası Eylül hareketini gösterir |
| GKP yıllarını Trends eksenine yazmak | Grafik yanlış yılı gösterir |
| Boş haftayı 0 saymak | Düşüş varmış gibi görünür. `null` bırakılır |
| Trends değerlerini keyword'ler arasında kıyaslamak | Ölçek keyword'e özel, kıyaslanamaz |
