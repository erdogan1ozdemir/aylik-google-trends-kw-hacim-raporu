#!/usr/bin/env python3
"""Excel çıktısı üretir.

Biçimlendirme İçerik Dili Rehberi Bölüm 15.3(b) Excel kurallarına göre:
başlık #434343 dolgu + beyaz kalın, gövde Calibri + ink teal, dikeyde ortalı,
delta sütunlarında yalnızca yazı rengi (dolgu yok), kenarlık #E0E0E0.

Kullanım: python3 scripts/build-excel.py out/excel-veri.json out/rapor.xlsx
"""
import io, json, sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

INK = "10332F"; BASLIK_BG = "434343"; CIZGI = "E0E0E0"
YESIL = "2E7D32"; KIRMIZI = "D32F2F"; CORAL = "FF7B52"

F_BASLIK = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
F_GOVDE  = Font(name="Calibri", size=10, color=INK)
F_POZ    = Font(name="Calibri", size=10, bold=True, color=YESIL)
F_NEG    = Font(name="Calibri", size=10, bold=True, color=KIRMIZI)
F_NOT    = Font(name="Calibri", size=10, bold=True, color=CORAL)
FILL_BASLIK = PatternFill("solid", fgColor=BASLIK_BG)
KENAR = Border(top=Side(style="thin", color=CIZGI))
ORTA_SOL   = Alignment(horizontal="left",   vertical="center", wrap_text=False)
ORTA_ORTA  = Alignment(horizontal="center", vertical="center", wrap_text=True)
ORTA_SARIL = Alignment(horizontal="left",   vertical="center", wrap_text=True)


def sayfa_yaz(ws, basliklar, satirlar, genislikler, delta_sutunlar=(), yuzde_sutunlar=()):
    """Başlık + gövde yazar. delta_sutunlar 0-indeksli; pozitif yeşil, negatif kırmızı."""
    for j, b in enumerate(basliklar, start=1):
        c = ws.cell(row=1, column=j, value=b)
        c.font, c.fill, c.alignment = F_BASLIK, FILL_BASLIK, ORTA_ORTA
    ws.row_dimensions[1].height = 34
    ws.freeze_panes = "A2"

    for i, satir in enumerate(satirlar, start=2):
        for j, v in enumerate(satir, start=1):
            c = ws.cell(row=i, column=j, value=v)
            c.border = KENAR
            idx = j - 1
            if idx in delta_sutunlar and isinstance(v, (int, float)):
                c.font = F_POZ if v > 0 else (F_NEG if v < 0 else F_GOVDE)
            else:
                c.font = F_GOVDE
            c.alignment = ORTA_SOL if idx == 0 else ORTA_ORTA
            if idx in yuzde_sutunlar and isinstance(v, (int, float)):
                c.number_format = "+0%;-0%;0%"
            elif isinstance(v, float):
                c.number_format = "0.00"
            elif isinstance(v, int) and idx != 0:
                c.number_format = "#,##0"
    for j, g in enumerate(genislikler, start=1):
        ws.column_dimensions[get_column_letter(j)].width = g


def not_satiri(ws, satir, etiket, metin, genislik=6):
    c = ws.cell(row=satir, column=1, value=etiket); c.font = F_NOT; c.alignment = ORTA_SOL
    c2 = ws.cell(row=satir, column=2, value=metin); c2.font = F_GOVDE; c2.alignment = ORTA_SARIL
    ws.merge_cells(start_row=satir, start_column=2, end_row=satir, end_column=genislik)
    ws.row_dimensions[satir].height = 30


def main(veri_yolu, cikti_yolu):
    d = json.load(io.open(veri_yolu, encoding="utf-8"))
    m = d["meta"]
    ay, ayK, ys, yo = m["ayAdi"], m["ayKisa"], m["yilSon"], m["yilOnc"]
    GKP = "(Google Keyword Planner)"
    TR = "(Google Trends)"

    wb = Workbook(); wb.remove(wb.active)

    # ——— Özet ———
    ws = wb.create_sheet("Özet")
    o = d["ozet"]
    ws["A1"] = f"{m['marka']} · {ay} {ys} Arama Talebi Insight'ları"
    ws["A1"].font = Font(name="Calibri", size=13, bold=True, color=INK)
    ws.merge_cells("A1:B1"); ws.row_dimensions[1].height = 24
    kpi = [
        (f"Toplam arama hacmi · {ayK} {ys} {GKP}", o["hacim25"]),
        (f"Toplam arama hacmi · {ayK} {yo} {GKP}", o["hacim24"]),
        (f"Mevsimsel endeks · {ys} yıl ortalamasına oran", round(o["endeks"], 2)),
        (f"Yıl içi sıra · {ys} hacmine göre (1 = en yüksek)", o["siraYil"]),
        (f"Değişim · {ayK} {yo} → {ayK} {ys}", o["ayYoY"]),
        ("Kapsanan keyword sayısı", m["kwToplam"]),
        ("Kapsanan marka sayısı", m["markaToplam"]),
        (f"{ay} ayında yıl ortalamasının %15 üzerine çıkan başlık", m["havuzAdet"]),
        ("Sayfada listelenen başlık", m["sayfadaGosterilen"]),
        ("Google Trends son hafta" + (" (ay sonunda sabitlendi)" if m["trendsDil"]["donmus"] else ""), m["trendsDil"]["haftaTarih"] if m["trendsTarih"] else ""),
        (f"Google Trends seri başlangıcı", m["trendsBaslangic"]),
    ]
    for i, (etiket, deger) in enumerate(kpi, start=3):
        a = ws.cell(row=i, column=1, value=etiket); a.font = F_GOVDE; a.alignment = ORTA_SOL; a.border = KENAR
        b = ws.cell(row=i, column=2, value=deger); b.alignment = ORTA_ORTA; b.border = KENAR
        b.font = (F_POZ if deger > 0 else F_NEG) if (etiket.startswith("Değişim") and isinstance(deger,(int,float))) else F_GOVDE
        if etiket.startswith("Değişim"): b.number_format = "+0%;-0%;0%"
        elif isinstance(deger, int): b.number_format = "#,##0"
    ws.column_dimensions["A"].width = 58; ws.column_dimensions["B"].width = 22
    not_satiri(ws, len(kpi) + 4, "Kaynak:",
               f"Arama hacimleri Google Keyword Planner · Türkiye · {yo} ve {ys} takvim yılları. "
               f"Google bu değerleri bantlayarak verdiği için yön göstergesi olarak değerlendirilmelidir. "
               f"{m['trendsDil']['ozetEtiketi']}: Google Trends · {m['trendsBaslangic']} - {m['trendsTarih']}.", genislik=2)

    # ——— Yükselen başlıklar ———
    ws = wb.create_sheet("Yükselen Başlıklar")
    # Hiç ölçüm yoksa Trends sütunları hiç açılmaz; baştan sona "-" dolu altı
    # sütun taşımak ve başlıklarında olmayan bir metriği anlatmak yanıltıcıdır.
    olculen = sum(1 for r in d["yukselenler"] if r["trSimdi"] is not None)
    trends_var = olculen > 0
    basliklar = ["Arama", "Kat 1", "Kat 2", "Kat 3", "Marka",
                 f"Arama Hacmi · {ayK} {ys} {GKP}",
                 f"Mevsimsel Endeks · {ys} yıl ort. {GKP}",
                 f"Değişim · {ayK} {yo} → {ayK} {ys} {GKP}"]
    if trends_var:
        basliklar += [f"Trends Endeksi · son hafta · 0-100 {TR}",
                      f"Trends Değişim · son 30 gün {TR}",
                      f"Trends Değişim · geçen yıl aynı hafta {TR}",
                      "Trends Vekil Terim", "Trends Veri Gelmeyen Hafta"]
    basliklar += ["E-posta Özetinde Listelendi"]
    OLCULMEDI = "-"
    satirlar = []
    for r in d["yukselenler"]:
        olculdu = r["trSimdi"] is not None
        satir = [r["kw"], r["k1"], r["k2"], r["k3"], r["marka"], r["hacimSon"],
                 round(r["endeks"], 2) if r["endeks"] is not None else None,
                 r["degisim"]]
        if trends_var:
            satir += [
                r["trSimdi"] if olculdu else OLCULMEDI,
                (r["tr30"] if r["tr30"] is not None else OLCULMEDI) if olculdu else OLCULMEDI,
                (r["trYoY"] if r["trYoY"] is not None else OLCULMEDI) if olculdu else OLCULMEDI,
                (r["trVekil"] or "") if olculdu else OLCULMEDI,
                r["trEksik"] if olculdu else OLCULMEDI,
            ]
        satir += [r["sayfada"]]
        satirlar.append(satir)
    genislikler = [30, 18, 24, 26, 14, 20, 20, 20] + ([18, 18, 20, 18, 16] if trends_var else []) + [14]
    delta = {7, 9, 10} if trends_var else {7}
    sayfa_yaz(ws, basliklar, satirlar, genislikler,
              delta_sutunlar=delta, yuzde_sutunlar=delta)
    not_satiri(ws, len(satirlar) + 3, "Kapsam:",
               f"{ay} ayında kendi {ys} yıl ortalamasının en az %15 üzerine çıkan tüm başlıklar listelenmektedir. "
               f"Web raporunda başlıkların tamamı yer almaktadır; e-posta özetinde hacme göre ilk {m['sayfadaGosterilen']} tanesi gösterilmektedir.", genislik=9)
    olculmeyen = len(satirlar) - olculen
    trends_not = ("Bu ay için Google Trends ölçümü yapılmamıştır; tablo yalnızca Keyword Planner "
                  "geçmiş hacimlerine dayanmaktadır. " if not trends_var else
                  f"Trends ölçümü {olculen} başlığın tamamı için yapılmıştır. "
                  if olculmeyen == 0 else
                  f"Trends ölçümü {olculen} başlık için yapılmıştır; kalan {olculmeyen} başlıkta "
                  'tüm Trends sütunları "-" ile işaretlenmiştir. ')
    if trends_var:
        trends_not += ('Tekil hücrelerdeki "-" işareti, ilgili karşılaştırma haftasında Google Trends\'in '
                   "arama hacmi eşiğinin altında kalıp değer döndürmediğini göstermektedir; ölçümün yapılmadığı "
                   "anlamına gelmez. Trends her başlık için ayrı sorgu ile çekilmektedir.")
    not_satiri(ws, len(satirlar) + 4, "Google Trends:", trends_not, genislik=9)

    # ——— Keskin yükselişler ———
    ws = wb.create_sheet("Keskin Yükselişler")
    sayfa_yaz(ws,
        ["Arama", "Kat 1", f"Mevsimsel Endeks · {ys} yıl ort. {GKP}",
         f"Arama Hacmi · {ayK} {ys} {GKP}", f"Değişim · {ayK} {yo} → {ayK} {ys} {GKP}"],
        [[r["kw"], r["k1"], round(r["endeks"], 2), r["hacimSon"], r["degisim"]] for r in d["keskinler"]],
        [30, 20, 22, 20, 22], delta_sutunlar={4}, yuzde_sutunlar={4})
    not_satiri(ws, len(d["keskinler"]) + 3, "Not:",
               "Aynı havuzun mevsimsel keskinliğe göre sıralanmış hali. Yıl geneline yayılmış talebi sınırlı, "
               f"{ay} ayında yoğunlaşan başlıklardır; zamanlama hassasiyeti en yüksek gruptur.", genislik=5)

    # ——— Alt kategoriler ———
    ws = wb.create_sheet("Alt Kategoriler (Kat 2)")
    sayfa_yaz(ws,
        ["Alt Kategori (Kat 2)", "Ana Kategori (Kat 1)",
         f"Arama Hacmi · {ayK} {ys} {GKP}", f"Mevsimsel Endeks · {ys} yıl ort. {GKP}",
         f"Değişim · {ayK} {yo} → {ayK} {ys} {GKP}", "Yıl Geneline Fark (puan)"],
        [[r["kat"], r["ust"], r["hacimSon"],
          round(r["endeks"], 2) if r["endeks"] is not None else None,
          r["degisim"], round(r["fark"] * 100) if r["fark"] is not None else None] for r in d["altKategoriler"]],
        [30, 22, 20, 22, 22, 20], delta_sutunlar={4, 5}, yuzde_sutunlar={4})

    # ——— Alt kırılım büyüyenler ———
    ws = wb.create_sheet("Alt Kırılımda Büyüyenler")
    sayfa_yaz(ws,
        ["Alt Kırılım (Kat 3)", "Ana Kategori (Kat 1)",
         f"Arama Hacmi · {ayK} {ys} {GKP}", f"Değişim · {ayK} {yo} → {ayK} {ys} {GKP}"],
        [[r["k3"], r["k1"], r["hacimSon"], r["degisim"]] for r in d["buyuyenler"]],
        [30, 22, 20, 22], delta_sutunlar={3}, yuzde_sutunlar={3})

    # ——— Marka fırsatları ———
    # Yalnızca kendi kataloğunu bilen markalarda anlamlı; veride brands yoksa
    # sayfa hiç açılmaz (boş sayfa "veri yok" değil "bulgu yok" gibi okunuyor).
    if d["markalar"]:
        ws = wb.create_sheet("Katalog Dışı Markalar")
        sayfa_yaz(ws,
            ["Marka", f"Aylık Ortalama Hacim · son 12 ay {GKP}",
             f"Değişim · son 12 ay / önceki 12 ay {GKP}", f"Mevsimsel Endeks · {ayK} {ys} {GKP}"],
            [[r["marka"], round(r["aylik"]), r["yoy"],
              round(r["endeks"], 2) if r["endeks"] is not None else None] for r in d["markalar"]],
            [24, 30, 30, 26], delta_sutunlar={2}, yuzde_sutunlar={2})
        not_satiri(ws, len(d["markalar"]) + 3, "Not:",
                   f"{m['marka']} katalogunda yer almayan, son 12 ayda büyüyen markalardır.", genislik=4)

    # ——— Trends haftalık ———
    if d["trendsHaftalik"]:
        ws = wb.create_sheet("Trends Haftalık Seri")
        ilk = d["trendsHaftalik"][0]
        basliklar = ["Arama", "Trends Vekil Terim"] + [f"{h} haftası · Trends 0-100 {TR}" for h in ilk["haftalar"]]
        satirlar = [[r["kw"], r["vekil"]] + r["seri"] for r in d["trendsHaftalik"]]
        sayfa_yaz(ws, basliklar, satirlar, [28, 20] + [15] * len(ilk["haftalar"]))
        not_satiri(ws, len(satirlar) + 3, "Not:",
                   "0-100 ölçeği her başlığın kendi 53 haftalık penceresindeki zirvesine göredir; başlıklar arasında kıyaslanmaz. "
                   "Boş hücreler Google Trends'in veri döndürmediği haftalardır.", genislik=8)

    # ——— Terim sözlüğü ———
    ws = wb.create_sheet("Terim Sözlüğü")
    terimler = [
        ("Arama Hacmi", f"Google Keyword Planner'ın ilgili ay için verdiği ortalama aylık arama sayısı, Türkiye. Google bu değerleri bantlayarak verir; yön göstergesi olarak değerlendirilmelidir."),
        ("Mevsimsel Endeks", f"Bir başlığın ilgili aydaki hacminin, aynı başlığın o yılki aylık ortalamasına oranı. 1.00 yıl ortalamasına eşittir; 2.00 o ayda yıl ortalamasının iki katı arandığını gösterir."),
        ("Değişim (YoY)", f"İki yılın aynı ayı arasındaki yüzde fark. Mevsimsellikten bağımsız olarak talebin yıllık yönünü verir."),
        ("Yıl Geneline Fark", f"Kategorinin ilgili aydaki yıllık değişimi ile yıl genelindeki yıllık değişimi arasındaki puan farkı. Pozitif değer, kategorinin bu ayda yıl geneline kıyasla daha dirençli seyrettiğine işaret eder."),
        ("Trends Endeksi", "Google Trends'in 0-100 arası göreli arama ilgisi ölçüsü. Her başlığın kendi 53 haftalık penceresindeki zirvesine göredir; başlıklar arasında kıyaslanmaz. Seri Pazar-Cumartesi haftalarından oluşur ve son tamamlanmış haftada biter."),
        ("Trends Değişim · son 30 gün", "Serinin son tamamlanmış haftasındaki Trends değerinin, dört hafta öncesine göre yüzde değişimi."),
        ("Trends Değişim · geçen yıl aynı hafta", "Serinin son tamamlanmış haftasındaki Trends değerinin, elli iki hafta öncesine göre yüzde değişimi."),
        ("Trends Vekil Terim", "Google Trends'in başlığı farklı bir varlıkla karıştırdığı durumlarda ölçümün yapıldığı alternatif terim. Örnek: 'kemer' terimi Antalya'daki Kemer ilçesiyle karıştığı için ölçüm 'kemer modelleri' üzerinden yapılmaktadır."),
        ("Trends Veri Gelmeyen Hafta", "Google Trends'in arama hacmi eşiğinin altında kaldığı için değer döndürmediği hafta sayısı. Yüksek değerlerde seri yön göstergesi olarak okunmalıdır."),
        ('Trends sütunlarında "-"', 'Satırın tüm Trends sütunları "-" ise o başlık için ölçüm yapılmamıştır. Yalnızca tek bir hücre "-" ise ölçüm yapılmış, ancak ilgili karşılaştırma haftasında Google Trends arama hacmi eşiğinin altında kaldığı için değer döndürmemiştir.'),
        ("E-posta Özetinde Listelendi", "Başlığın e-posta özetindeki kısa tabloda gösterilip gösterilmediği. Web raporunda ve bu dosyada başlıkların tamamı yer almaktadır."),
        ("Kat 1 / Kat 2 / Kat 3", f"{m['marka']} kategori ağacının sırasıyla ana, alt ve detay seviyeleri."),
        ("Katalog Dışı Marka", f"Arama talebi bulunan ancak {m['marka']} katalogunda yer almayan marka."),
        ("Keskin Yükseliş", "Hacim sıralamasında geride kalan, ancak kendi yıl ortalamasına göre en belirgin ayrışan başlıklar. Zamanlama hassasiyeti yüksektir."),
    ]
    sayfa_yaz(ws, ["Terim", "Açıklama"], [[a, b] for a, b in terimler], [34, 118])
    for i in range(2, len(terimler) + 2):
        ws.cell(row=i, column=2).alignment = ORTA_SARIL
        ws.row_dimensions[i].height = 32

    wb.save(cikti_yolu)
    print(f"Excel hazır: {cikti_yolu}")
    print(f"  sayfa: {', '.join(wb.sheetnames)}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
