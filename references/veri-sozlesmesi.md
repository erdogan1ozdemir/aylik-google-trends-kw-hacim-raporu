# Veri Sözleşmesi

Üretim script'leri tek bir JSON okur. Bu dosya o şemayı ve kaynaklardan nasıl üretileceğini tanımlar.

## Şema

```json
{
  "keywords": [
    {
      "kw":    "okul çantası",
      "k1":    "Kırtasiye & Oyuncak",
      "k2":    "Kırtasiye",
      "k3":    "Okul Çantaları",
      "brand": "",
      "m24":   [12000, 9000, ...],
      "m25":   [14000, 9500, ...]
    }
  ],
  "brands": [
    { "brand": "Coach", "catalog": "Yok", "r12": 84528, "ryoy": 0.31, "m25": [...] }
  ]
}
```

| Alan | Zorunlu | Açıklama |
|---|---|---|
| `kw` | evet | Arama terimi |
| `k1` | evet | Ana kategori. Filtre ve kategori tablosu buna dayanır |
| `k2` | hayır | Alt kategori. Yoksa "Alt kategori görünümü" bölümü boş kalır |
| `k3` | hayır | Detay kırılım. Yoksa "Alt kırılımda büyüyenler" açılmaz |
| `brand` | hayır | Terimin bağlı olduğu marka, varsa |
| `m24` | evet | Karşılaştırma yılının 12 aylık hacmi. Ocak=0 ... Aralık=11 |
| `m25` | evet | Son tam yılın 12 aylık hacmi, aynı sıra |

`m24` / `m25` adları tarihseldir; hangi yıllar olduğunu `proje.json` içindeki `yilOnc` ve `yilSon` söyler. İki dizi de **tam 12 eleman** olmalı; `proje.js` bunu doğrular ve eksikse üretimi durdurur.

### brands (opsiyonel)

Yalnızca **kendi kataloğunu bilen** markada doldurulur: hangi markaları sattığını listeleyebilen bir e-ticaret. Alanlar:

| Alan | Açıklama |
|---|---|
| `brand` | Marka adı |
| `catalog` | `"Var"` katalogda, başka bir değer katalog dışı |
| `r12` | Son 12 ayın aylık ortalama arama hacmi |
| `ryoy` | Son 12 ayın önceki 12 aya göre oransal değişimi (0.31 = +%31) |
| `m25` | Markanın son tam yıl aylık hacmi, mevsimsel endeks için |

`brands` boş veya yoksa "Katalogda yer almayan büyüyen markalar" bölümü hiç açılmaz. Bu doğru davranış - boş bir bölüm "bulgu yok" gibi okunur, oysa "böyle bir veri yok" demektir.

## Kaynaklardan Üretim

### Google Keyword Planner export'u

En doğrudan kaynak. Aylık arama hacmi sütunları iki takvim yılını kapsamalı. Dönüştürürken:

- Kategori kırılımı export'ta yoksa elle eşlenir. Kategori ağacı markanın kendi site yapısından alınır, uydurulmaz.
- **Eş anlamlı tekilleştirme:** GKP `okul çantası` ve `okul çantaları` için birebir aynı diziyi döndürebiliyor. Aynı hacim imzasını taşıyan terimler tek satıra indirilir, yoksa aynı talep iki kez sayılır.
- GKP hacimleri **bantlanmıştır** (450K/550K/673K gibi sabit basamaklar). Rapor bunu kapsam notunda beyan eder ve değerleri yön göstergesi olarak sunar.

### SEOmonitor (keyword listesi yoksa)

Marka için keyword araştırması yapılmamışsa takip edilen kelimelerden başlanır - bunlar zaten marka için seçilmiş kelimelerdir.

```
seomonitor_list_companies              → kampanya kimliği
seomonitor_get_keyword_data            → takip edilen kelimeler + arama hacmi
seomonitor_get_keyword_vault_data      → daha geniş havuz
seomonitor_get_keyword_groups          → kategori kırılımı olarak kullanılabilir
```

Keyword grupları çoğu kurulumda kategori ağacına yakındır; `k1`/`k2` için başlangıç noktası olur. Aylık hacim geçmişi SEOmonitor'da tek değer olarak gelirse GKP veya Ahrefs `keywords-explorer-volume-history` ile tamamlanır.

### Ahrefs

`keywords-explorer-volume-history` aylık seri verir. `keywords-explorer-overview` hacim ve zorluk taşır.

## Kapsam Beyanı

Hangi kaynağın kullanıldığı raporun kapsam satırında yazılır. Kaynak karıştırılmışsa (ör. kelime listesi SEOmonitor'dan, hacimler GKP'den) ikisi de belirtilir. Kaynağı gizlemek, sayıyı olduğundan güvenilir göstermek olur.

## Doğrulama

`scripts/lib/proje.js` üretim öncesi şunları kontrol eder ve ihlalde durur:

- `keywords` var ve boş değil
- `kw`, `k1`, `m24`, `m25` alanları mevcut
- `m24` / `m25` tam 12 elemanlı dizi
- `brands` varsa `brand`, `catalog`, `r12`, `ryoy` alanları mevcut

Sessizce boş tabloya düşmek yerine durması bilinçli: eksik veri raporda fark edilmeden geçebilir.
