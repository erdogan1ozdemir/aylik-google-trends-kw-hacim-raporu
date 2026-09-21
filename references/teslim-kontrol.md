# Teslim Kontrol Listesi

Her ay, teslimden önce.

## Veri

- [ ] `keywords` şemaya uygun, `m24`/`m25` tam 12 elemanlı (script doğruluyor)
- [ ] Eş anlamlı keyword'ler tekilleştirildi
- [ ] Kategori kırılımı markanın kendi ağacından, uydurulmadı
- [ ] `brands` yoksa marka bölümü hiç açılmıyor (boş bölüm yok)

## Trends

- [ ] Bütün keyword'ler **aynı pencereyle** çekildi; pencere Pazar başlıyor, son tamamlanmış Cumartesi bitiyor, 53 kova (`dagit.py` doğruluyor)
- [ ] Geçmiş aylar kendi ay sonu penceresinde; aktif aylar ortak pencerede
- [ ] Donmuş sayfalarda "Canlı" ve "bu hafta" yok (`grep -c "Canlı\|bu hafta"` = 0)
- [ ] Her keyword **ayrı istekte** çekildi
- [ ] `seriBaslangic` çıktıda var, grafik ekseni bundan türüyor
- [ ] Jenerik tek kelimelik başlıklarda anlam karışması kontrol edildi; vekil terim gerekiyorsa eklendi ve raporda belirtildi
- [ ] Seyrek veri işaretlendi
- [ ] Ölçülmeyen başlıklar `-` ile işaretli, kapsam notu kaç başlığın ölçüldüğünü yazıyor

## Dil ve Biçim

```bash
grep -c "—" rapor.html          # 0
grep -c "[âîû]" rapor.html      # 0
grep -o "&#10162;" rapor.html   # yok, doğrusu &#10132;
grep -ri "<önceki marka>" scripts/   # 0 - marka adı sızıntısı
```

- [ ] Yüzde biçimi tek: `+%X` / `-%X`, ondalık nokta
- [ ] Çarpan `1.46x` biçiminde
- [ ] Büyük harfli İngilizce terimlerde "İ" tuzağı yok (INSIGHT, VISIBILITY)
- [ ] Emir kipi, kesin vaat, emoji yok
- [ ] Çift boşluk ve typo taraması

## Tarayıcı Testi

Göz kontrolü yetmez. Ölçerek doğrula, ayrıntı `on-yuz-tuzaklari.md`:

- [ ] **İçindekiler**: her bağlantı gerçek bir bölüme gidiyor (kırık bağlantı 0), başlık yapışkan barın altında kalmıyor
- [ ] **Scroll-spy**: farklı konumlarda doğru bölüm aktif
- [ ] **Sütun açıklamaları**: `th` üzerine gelince balon açılıyor, ekran içinde, son sütunda da
- [ ] **Grafik çubukları**: üzerine gelince hafta tarihi ve değeri görünüyor
- [ ] **Filtreler**: adetler toplamı toplamla eşit, çoklu seçim birleşiyor, Tümü sıfırlıyor
- [ ] **Tablodan grafiğe atlama**: ilk, orta ve son başlıkta, keskin tabloda, grafik filtresi açıkken ve 700px yüksek ekranda kart görünür alana geliyor
- [ ] **Mobil içindekiler**: 375px'te düğme görünüyor, panel masaüstü listesinin kopyası, Escape / örtü / bağlantı kapatıyor
- [ ] `scripts/tarayici-testi/sayfa.js` ve `mobil.js` her sayfada boş hata listesi döndürüyor
- [ ] **Ay sekmeleri**: yalnızca hazır aylar bağlantılı
- [ ] Konsol hatası yok

## İçerik Doğruluğu

- [ ] **Raporun kendi vaatleri doğru mu.** "Şuna gelince şu görünür" yazan her cümle denendi
- [ ] Yıllar doğru: GKP tabloları takvim yılı, Trends penceresi son 12 ay. Etiketler karışmamış
- [ ] Kapsam notu iki kaynağın farklı dönemleri kapsadığını söylüyor
- [ ] Sayılar tutarlı: KPI'daki başlık sayısı tablodaki satır sayısıyla, filtre adetleri toplamla eşit
- [ ] Eşikler geçen ayla aynı; değiştiyse gerekçe raporda yazılı

## Çıktılar

- [ ] Web raporu tek dosya, logolar gömülü, dış istek yok
- [ ] E-posta sürümü e-posta istemcisinde bozulmuyor (tablo düzeni, satır içi CSS)
- [ ] Excel'de boş hücre yok; `-` işaretinin iki anlamı sözlükte açıklı
- [ ] Excel indirme bağlantısı çalışıyor (HTTP 200)

## Yayın

- [ ] Veri deposu değiştirilmedi (salt okunur)
- [ ] Yayın sonrası canlı adres önbellek atlatılarak kontrol edildi (`?cb=$RANDOM`)
- [ ] Proje günlüğüne tarihli kayıt işlendi

## Eksik Veri Politikası

Rapora placeholder metrik, boş bölüm veya "sonraki sürümde eklenecek" vaadi bırakılmaz. Veri çekilemediyse:

1. Durum chat'ten bildirilir
2. Manuel iletilmesi istenir
3. Gelmiyorsa alan rapordan çıkarılır ve bu da chat'te belirtilir
