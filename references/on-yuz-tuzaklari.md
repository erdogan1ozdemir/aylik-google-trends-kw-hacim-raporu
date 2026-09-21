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

## 11. Tablodan grafiğe atlama üç ayrı yerden kırılır

Kullanıcı "keyword'e tıklayınca grafiğe gitmiyor" dedi; tek bir test örneği ise çalışıyordu. Üç ayrı kusur vardı:

- **Sayfa bölüm başına kaydırılıyordu.** Bölüm girişi ve filtre ~450px tutuyor, kart kabı ekranın altına taşıyordu. Listenin sonundaki kartta kap daha fazla kayamadığı için kart ekranın altında yarım kalıyordu; dizüstü ekranında ortadaki kartlar da. Düzeltme: sayfa **kart kabının** başına kaydırılır, kap en fazla 62vh olduğu için tamamı ekrana sığar.
- **Grafik bölümünde filtre açıkken** başka kategoriden bir başlığa tıklanınca hedef kart gizli kalıyor, konumu 0 okunuyordu. Düzeltme: hedef gizliyse bölüm filtresi önce Tümü'ne döner.
- **Keskin yükselişler tablosu** başlıkları kalın yazıyor ama bağlamıyordu. Tıklanabilir görünen öğe tıklanmıyordu. Düzeltme: grafik kartı olan her başlık bağlanır.

Kap içi hedef konumu `offsetTop` ile değil kabın kendi kutusuna göre (`getBoundingClientRect`) hesaplanır; `offsetTop` ortak konumlanmış ataya bağlı olduğu için düzen değişince kayar.

**Ders:** tek örnek yetmez. İlk, orta ve son öğe, filtre açıkken ve kısa ekranda ayrı ayrı denenir.

## 12. Mobilde içindekiler kayboluyordu

1080px altında yan liste `display:none` oluyor ve yerine hiçbir şey gelmiyordu; tablet ve telefonda bölümler arası gezinme yoktu. Yüzen düğme + alttan açılan panel eklendi. Panel, masaüstü listesinin çalışma anında kopyalanmış halidir (iki liste ayrışmasın diye elle yazılmaz). Açıkken arka plan kilitlenir; örtü, bağlantı ve Escape kapatır; pencere genişleyince kendiliğinden kapanır. Scroll-spy iki listeyi birlikte işaretler.

## 13. Test aracında emülasyon ve tıklama

Tarayıcı paneli gizliyken pencere genişliği 0 okunur ve ekran görüntüsü boş gelir. Görünüm boyutu emüle edildiğinde ise koordinatla ya da öğe referansıyla yapılan tıklamalar sayfanın dışına (`HTML`) düşebilir. Bu durumda sayfa "çalışmıyor" sanılır. Gerçek tıklama testi emülasyonsuz yapılır; ölçüm testleri programatik tıklamayla emüle boyutta yapılır.

## Teslim Öncesi Tarayıcı Testi

Göz kontrolü yetmez, ölçerek doğrula. `scripts/tarayici-testi/` altındaki iki betik her sayfada çalıştırılır ve hata listesi boş dönmelidir:

- `sayfa.js`: içindekiler (kırık bağlantı, hizalama, scroll-spy), ay sekmeleri, her `th` balonu, grafik çubuğu balonları, keyword bağlantıları (ilk, orta, son, keskin tablo, filtre açıkken), filtre adetleri ve çoklu seçim, Kat 2 filtresi, yatay taşma, "bu hafta" ve em dash
- `mobil.js`: yüzen düğme, panelin masaüstü listesinin kopyası olması, açma/kapama (Escape, örtü, bağlantı), panelden bölüme gitme, aktif vurgu, aktif ay sekmesinin görünürlüğü

Sayfayı yerel bir sunucudan açıp betiği aynı kaynaktan yükle:

```js
await eval(await (await fetch('/sayfa.js')).text())   // { hatalar: [] }
```

En az üç boyutta çalıştır: 1366×860, 1440×700 (kısa dizüstü) ve 375×812. Ekran görüntüsü boş çıkıyorsa panel gizli olabilir; ölçüm sonuçlarına güven, görüntüye değil.
