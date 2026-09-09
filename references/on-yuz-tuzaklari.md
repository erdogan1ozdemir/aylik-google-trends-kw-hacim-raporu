# Ön Yüz Tuzakları

Bu raporda **fiilen kırılmış** davranışlar ve kök nedenleri. Hepsi sessizce kırıldı: sayfa hatasız açılıyordu, davranış çalışmıyordu. Teslim öncesi tarayıcıda test edilmezse fark edilmezler.

## 1. Kaydırma olayı ve requestAnimationFrame ilerlemeyebilir

**Belirti:** İçindekiler tıklaması çalışmıyor, aktif bölüm vurgusu takılı kalıyor.

**Kök neden:** Bazı gömülü görüntüleyicilerde ve önizleme bağlamlarında `window.scrollTo` çalışır ama **scroll olayı hiç tetiklenmez**; `requestAnimationFrame` döngüsü de ilerlemez. Ölçüldü: dinleyici sayacı üç ayrı kaydırmadan sonra 0.

**Sonuç:** `behavior:'smooth'` ve `scroll-behavior:smooth` bu bağlamlarda tamamen inert - hash değişir, sayfa kaymaz.

**Çözüm:**
- Yumuşak kaydırma `setInterval` ile yürütülür (ease-out kübik, 420ms). Zamanlayıcılar her yerde çalışır.
- Scroll-spy konum yoklaması da `setInterval(150ms)` ile yapılır; scroll dinleyicisi gerçek tarayıcılar için ayrıca durur.
- Tıklama işleyicileri kaydırma sonrası `spy()` çağırır, olaya güvenmez.
- `prefers-reduced-motion` açıksa anında geçiş.

## 2. `overflow` kabı açıklama balonunu kırpar

**Belirti:** Sütun başlığına gelince açıklama görünmüyor.

**Kök neden:** `.kaydir{overflow-y:auto}` kabı içindeki mutlak konumlu `::after` balonu kırpılır. Bir eksende `overflow` görünür değilse diğeri de `auto` hesaplanır, yani yatayda da kırpar.

**Çözüm:** Sayfada tek bir `position:fixed` `#tt` ögesi. Hedefin altına konumlanır, ekran kenarına taşarsa içeri çekilir, altına sığmazsa üstüne alınır, kaydırmada kapanır.

## 3. İki `class` niteliği - ikincisi yok sayılır

**Belirti:** Sütun açıklamaları hiç çalışmıyordu.

**Kök neden:** Yardımcı fonksiyon ` class="tip" data-tip="..."` döndürüyordu ve çağrı `<th class="sag"${tipAttr(...)}>` şeklindeydi. Sonuç: `<th class="sag" class="tip">`. HTML ayrıştırıcısı **ikinci class niteliğini yok sayar**, `tip` sınıfı hiç uygulanmaz.

Aynı hata ters yönde de vurdu: `<span${tipAttr(not)} class="uyari">` çağrısında `tip` kazandı, `uyari` rengi kayboldu.

**Çözüm:** Yardımcı yalnızca `data-*` döndürür, CSS `[data-tip]` seçicisini kullanır. Sınıf çakışması sınıfı tamamen ortadan kalkar.

**Genel kural:** Bir niteliği kod üretiyorsa, aynı elemanda elle yazılmış eşi olmadığından emin ol.

## 4. `[hidden]` niteliğini `display:flex` ezer

**Belirti:** Kat 1 ve Kat 2 çipleri aynı anda görünüyor, seçim çalışmıyor gibi.

**Kök neden:** JS doğru çalışıyordu (`el.hidden = true`), ama `.cipler{display:flex}` yazar kuralı tarayıcının `[hidden]{display:none}` varsayılan stilini ezer. Yazar stili UA stilinden her zaman önceliklidir.

**Çözüm:** `.cipler[hidden]{display:none}` açıkça yazılır.

## 5. `box-sizing:border-box` altında logo yüksekliği

**Belirti:** İki logo aynı `height` değerini taşıdığı halde biri belirgin küçük görünüyor.

**Kök neden:** Global `*{box-sizing:border-box}` altında `img{height:32px;padding:6px 10px}` kuralında yükseklik **dolguyu da içine alır**, görsel 32 değil 20px kalır.

**Çözüm:** Dolgulu logo `box-sizing:content-box` alır. Asset'te gizli boşluk olup olmadığı canvas ile ölçülebilir (mürekkep sınırı / kutu oranı).

## 6. Yapışkan bar ofseti sabit yazılmaz

**Belirti:** İkinci yapışkan şerit üsttekinin altında kalıyor.

**Kök neden:** `.aytabs{top:55px}` sabitti, üst bar ise 80px'ti - 25px binme.

**Çözüm:** Bar yüksekliği JS ile ölçülüp `--appbar-h` değişkenine yazılır, ikinci şerit ve `scroll-margin-top` bunu kullanır, yeniden boyutlandırmada güncellenir.

## 7. Yerel `title` niteliği açıklama için yetersiz

**Belirti:** "Çubuğun üzerine gelince tarih ve değer görünür" notu vardı, hiçbir şey görünmüyordu.

**Kök neden:** Tarayıcının kendi balonu yaklaşık bir saniye gecikmeyle açılır, biçimlendirilemez, pratikte fark edilmez.

**Çözüm:** Aynı `#tt` balonuna bağlanır. **Binlerce öge varsa olay delegasyonu şart** - 103 kart × 53 çubuk = 5.459 ögeye tek tek dinleyici bağlanmaz. `document` üzerinde `mouseover` + `closest('[data-tip]')`, aktif öge değişmediğinde yeniden konumlandırma yok.

Çubuklara `tabindex` **verilmez**; klavye gezinmesi binlerce durakla dolar. Sütun başlıkları ve KPI kartları odaklanabilir kalır.

## 8. Bantlanmış hacimler çizgileri üst üste getirir

**Belirti:** Grafik ayın ortasında bitiyor gibi görünüyor.

**Kök neden:** Veri eksik değil - iki seri birebir çakışıyor. GKP hacimleri bantlanmış olduğu için (450K/550K/673K) iki dönem aynı değeri alabiliyor; üstteki çizgi alttakini tamamen örtüyor.

**Çözüm:** Karşılaştırma serisi kesikli çizilir ve en üstte kalır; çakışmada alttaki solid çizgi kesik aralarından görünür.

## 9. İçindekiler var olmayan bölüme bağlanır

**Belirti:** ToC'de bölüm var, tıklayınca hiçbir şey olmuyor.

**Kök neden:** ToC sabit yazılmıştı, bölümler ise veriye göre koşullu açılıyordu. Trends yoksa veya `brands` boşsa ToC kırık bağlantı taşıyor, numaralar kayıyordu.

**Çözüm:** Bölüm listesi tek kaynaktan türetilir; hem ToC hem bölüm numaraları o listeden gelir.

## 10. Rapor kendi vaadini doğrulamalı

Rapor içindeki "şuna gelince şu görünür" cümleleri **teslimden önce fiilen denenir**. Bu rapor bu hatayı bir kez yaptı: çubuk ipucu notu vardı, ipucu çalışmıyordu.

## Teslim Öncesi Tarayıcı Testi

Göz kontrolü yetmez, ölçerek doğrula:

```js
// ToC: her bağlantı gerçek bir bölüme gidiyor mu, hizada mı
[...document.querySelectorAll('.sidenav a')].filter(a =>
  !document.getElementById(a.getAttribute('href').slice(1))).length   // 0 olmalı

// Balon: hedefin altında ve ekran içinde mi
el.dispatchEvent(new MouseEvent('mouseover', {bubbles:true}));
tt.getBoundingClientRect()

// Filtre: sayılar toplamı toplamla eşit mi
// Scroll-spy: farklı konumlarda doğru bölüm aktif mi
```

Ekran görüntüsü boş çıkıyorsa panel gizli olabilir; ölçüm sonuçlarına güven, görüntüye değil.
