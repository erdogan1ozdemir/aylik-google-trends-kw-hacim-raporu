# Rapor Yapısı ve Metin Kuralları

## Bölümler

| No | Bölüm | Koşul | İçerik |
|---|---|---|---|
| 00 | Ayın Görünümü | her zaman | 4 KPI kartı + madde listesi özet |
| 01 | Yükselen Başlıklar | her zaman | Havuzun tamamı, filtreli, kaydırmalı |
| 02 | En Keskin Mevsimsel Yükselişler | havuz doluysa | Endekse göre ilk 15 |
| 03 | Google Trends Insight'ları | Trends çekildiyse | Başlık başına haftalık grafik kartı |
| 04 | Alt Kategori Görünümü | `k2` varsa | Kat 2 tablosu, Kat 1 filtreli |
| 05 | Alt Kırılımda Büyüyenler | `k3` varsa | Kat 3 büyüyenler |
| 06 | Katalog Dışı Markalar | `brands` varsa | **Yalnızca kendi kataloğunu bilen markada** |
| 07 | Değerlendirilebilecek Adımlar | her zaman | Veriden türetilen öneri maddeleri |

Numaralar ve içindekiler **render edilen bölümlerden** türetilir, sabit yazılmaz.

## Üst Bar

- Marka logosu solda, ajans logosu sağda, **aynı görsel yükseklikte**
- Logolar `data:` URI olarak gömülür
- Bant raporda **bir kez** bulunur, hero'da tekrarlanmaz
- Ay sekmeleri ikinci şeritte, Excel indirme butonu aynı satırda en sağda
- Yalnızca hazırlanmış aylar bağlantılıdır; diğerleri pasif

## KPI Kartları

Ayın Hacmi · Mevsimsel Endeks · Yıl İçi Sıra · Yükselen Başlık. Her birinin üzerine gelince hesabını ve kaynağını söyleyen açıklama açılır.

## Tablolar

- Her `<th>` `data-tip` taşır: o sütun hangi veriyi, hangi kaynaktan, hangi dönemden alıyor
- Zebra şeritleme, kaydırılabilir kap (`max-height: min(62vh, 700px)`)
- Filtre çubuğu: Tümü / Kat 1 / Kat 2, her düğmede kapsadığı satır sayısı
- **Çoklu seçim**: aynı kırılımda birden fazla kategori seçilebilir, VEYA ile birleşir
- Kırılım değişince önceki seçim taşınmaz, seçim boşalınca Tümü etkin olur

## Trends Grafik Kartları

Her kartta: başlık, kategori, arama hacmi + endeks, Trends değeri + durum, 53 haftalık çubuk grafik, iki metrik rozeti (geçen yıl aynı hafta, son 30 gün).

- Son 30 gün çubukları coral, öncesi nötr gri
- Çubuğun üzerine gelince hafta tarihi ve değeri açılır
- Yükselen başlıklar tablosundaki arama adı ilgili grafiğe bağlanır

## Metin Kuralları

İçerik Dili Rehberi **[A] kurumsal rejim** geçerlidir.

| Kural | Uygulama |
|---|---|
| Em dash yok | `grep "—"` = 0 |
| Şapkalı harf yok | `grep "[âîû]"` = 0 |
| Yüzde biçimi | `+%22`, `-%16` - işaret önce, ondalık nokta |
| Çarpan | `1.46x` |
| Insight oku | `➔` (`&#10132;`) - başka ok kullanılmaz |
| Emir kipi yok | "değerlendirilebilir", "önerilir" |
| Kesin vaat yok | "potansiyel taşımaktadır" |
| Büyük harfli etiketler | Kaynakta doğru harflemeyle. `lang="tr"` + CSS uppercase İngilizce "i"yi "İ" yapar (INSIGHT → İNSİGHT tuzağı) |

### Açılış Özeti

Giriş cümlesi + madde listesi. Üç iş yapar: ayın yıl içindeki yerini söyler, tablonun kategorilere eşit dağılmadığını **adlarıyla ve sayılarıyla** gösterir, okuyucuyu aşağıdaki listeye bağlar.

Tek bir keyword üzerinden kurulmaz - örnek keyword seçmek ayın hikayesini o kelimenin şansına bırakır.

Yıl bilgisi **giriş satırında bir kez** verilir, her maddede tekrarlanmaz.

### Adımlar

Veriden türetilir, uydurulmaz. Her madde `➔` ile başlar, somut sayı taşır ve öneri kipiyle biter.

### Kapsam Notu

Altbilgide: kaynak, keyword sayısı, kapsanan yıllar, Trends penceresi. İki veri kaynağının **farklı dönemleri kapsadığı** açıkça yazılır.

## E-posta Sürümü

Ayrı şablon. E-posta istemcisi script, flex/grid ve `data:` görsel desteklemez.

- Tablo tabanlı düzen, satır içi CSS, 640px
- Logo yok (Gmail `data:` görselleri engelliyor)
- Grafik sayısı 8 ile sınırlı (kaydırılabilir kap yok, kırpılırsa erişilemez olur)
- Yükselen başlık 30 ile sınırlı
- Web raporuna ve Excel'e bağlantı verir

## Excel

Sayfalar: Özet · Yükselen Başlıklar · Keskin Yükselişler · Alt Kategoriler · Alt Kırılımda Büyüyenler · [Katalog Dışı Markalar] · [Trends Haftalık Seri] · Terim Sözlüğü.

Köşeli parantezli olanlar veri varsa açılır.

- Sütun adları dönem ve kaynak taşır: `Arama Hacmi · Kas 2025 (Google Keyword Planner)`
- Biçim İçerik Dili Rehberi Bölüm 15.3(b): başlık `#434343` dolgu + beyaz kalın, gövde Calibri + ink teal, delta sütunlarında yalnızca yazı rengi (dolgu yok)
- Not satırları coral etiketli
- Terim sözlüğü her metriği ve `-` işaretinin iki anlamını açıklar
