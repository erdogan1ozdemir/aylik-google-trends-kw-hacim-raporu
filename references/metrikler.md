# Metrik Tanımları ve Eşikler

Tanımlar `scripts/lib/mailing-data.js` içindeki `LIMITS` sabitinde toplanır. **Aylar arası kıyas ancak bu tanımlar sabit kaldığında mümkündür.** Değiştirilecekse gerekçe yazılır ve o ayın raporunda belirtilir.

## Dönem Modeli

İki farklı zaman ekseni vardır ve birbirine karıştırılmaz:

| | Kaynak | Pencere | Cevapladığı soru |
|---|---|---|---|
| **Hacim / Endeks / Değişim** | Keyword Planner | İki tam takvim yılı (`yilOnc`, `yilSon`) | Bu ay normalde ne kadar aranır |
| **Canlı** | Google Trends | Bugünden geriye 12 ay, haftalık | Bu yıl da işliyor mu |

Trends serisinin sol ucu **bugüne göre** hesaplanır, GKP yıllarından bağımsızdır. Bir kez bu karıştırıldı ve grafik ekseni "Eyl 24" diye etiketlendi; doğrusu Trends penceresinin kendi başlangıcıdır. `trendsSol` bu yüzden ayrı hesaplanır.

## Mevsimsel Endeks

```
endeks(ay) = o ayın hacmi / yılın aylık ortalaması
```

`1.00x` yıl ortalamasına eşit, `2.00x` iki katı demektir. Biçim `1.46x` (çarpan sonda, İçerik Dili Rehberi Bölüm 6.1).

**Neden ortalama, medyan değil:** Endeks bütün aylarda tutarlı okunmalı ve toplamı yıl hacmine bağlanmalı. Medyan taban zirve aylarını daha yüksek gösterir ama ay-ay kıyası bozar.

## Yükselen Başlık

```
yukselenBasliklar():
  her iki yılda da  ayHacmi >= yilOrtalamasi * 1.15
  ve  o ayın hacmi >= 20.000
```

| Eşik | Değer | Gerekçe |
|---|---|---|
| `kwYukselisEsigi` | 1.15 | Yıl ortalamasının %15 üzeri. Gürültüyü eler, mevsimselliği tutar |
| **iki yıl şartı** | - | Tek yıllık sıçrama mevsimsellik kanıtı değil. En kritik kural budur |
| `kwMinAyHacim` | 20.000 | Altında GKP bantlaması sonucu bozuyor |

Havuz hacme göre sıralanır. Web raporunda **tamamı** gösterilir (kaydırma + filtre okunurluğu sağlar), e-posta özetinde ilk 30.

## Keskin Yükselişler

Havuzdaki başlıklar endekse göre sıralanır; ayın en belirgin sıçrayanları. Ayrı bir eşik yoktur, aynı havuzun farklı sıralamasıdır.

## Kategori Tabloları

`kategoriTablosu(keywords, ay, { seviye, minHacim })`

- **Kat 1**: her ana kategori
- **Kat 2**: `kat2MinHacim` (varsayılan 100.000) üzerindeki alt kategoriler

Kolonlar: Hacim, Endeks, Değişim (YoY), **Fark**.

```
fark = ayınYıllıkDeğişimi - yılGenelininYıllıkDeğişimi   (puan)
```

Pozitif fark, kategorinin bu ayda yıl geneline kıyasla daha dirençli olduğunu gösterir. Pazar genel olarak daralırken hangi kategorinin bütçesini korumak gerektiği sorusunu yanıtlar.

## Alt Kırılımda Büyüyenler

Kat 3 seviyesinde `kat3MinBuyume` (0.02) üzerinde büyüyen kırılımlar. `k3` yoksa bölüm açılmaz.

## Katalog Dışı Markalar (opsiyonel)

```
catalog !== 'Var'  ve  r12 >= markaMinAylik  ve  ryoy > markaMinBuyume
```

| Eşik | Değer |
|---|---|
| `markaMinAylik` | 5.000 aylık ortalama |
| `markaMinBuyume` | 0.20 |

Eşik seçimi markaya göre gözden geçirilir. Özdilek örneğinde 15.000'lik taban katalog dışı 42 büyüyen markanın 33'ünü **büyümesi değil hacmi yüzünden** eliyordu; 5.000'e çekilince Intimissimi (+%166) ve Selsil (+%71) gibi gerçek sinyaller listeye girdi.

Yöntem satırı eşikleri sabit metin olarak değil `LIMITS`ten okuyup yazar. Eşik değişince açıklama kendiliğinden güncellenir.

## Trends Metrikleri

| Metrik | Tanım |
|---|---|
| **Bu hafta** | Serinin son değeri, 0-100 |
| **Son 30 gün** | Son değerin 4 hafta öncesine göre yüzde değişimi |
| **Geçen yıl aynı hafta** | Son değerin 52 hafta öncesine göre yüzde değişimi |
| **Durum** | Zirveye yakınlık (kendi 12 aylık zirvesinin ≥%85'i) + son 4 haftanın yönü |

Durum etiketleri: Zirvede / Zirve geçildi / Yükselişte / Geriliyor / Yatay.

**0-100 ölçeği her başlığın kendi zirvesine göredir; başlıklar arasında kıyaslanmaz.** Bu her tabloda ve grafik bölümünde yazılır, yoksa okuyucu iki keyword'ün Trends değerini karşılaştırır.

`SEYREK_ESIK = 0.20`: haftaların %20'sinden fazlasında veri gelmediyse başlık işaretlenir ve değerler yön göstergesi olarak sunulur.

## Sayı Biçimleri

| Tip | Biçim | Örnek |
|---|---|---|
| Hacim | K/M, ondalık nokta | `550.0K`, `45.2M` |
| Yüzde | işaret önce, `%` sayıdan önce | `+%22`, `-%16` |
| Çarpan | sonda `x` | `1.46x` |
| Puan farkı | işaret + "puan" | `+4 puan` |
| Veri yok | `-` | |

Renk: artış yeşil `#2E7D32`, düşüş kırmızı `#D32F2F`, vurgu coral `#E85F36`.
