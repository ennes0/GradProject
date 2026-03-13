# Yol–Eğim Pipeline: Eşit Segmentler ve 30 m DEM Gürültü Azaltma

Bu doküman, `yol_egim_bagla7.py` ile yapılan iyileştirmeleri ve parametre seçimlerini açıklar.

---

## 1. Neden önce grafi iyileştirmek mantıklı?

- **Rota API’sinden önce** graf kalitesi (eğim maliyetleri, segment çözünürlüğü) iyi olursa:
  - Snap (kullanıcı koordinatı → en yakın düğüm) daha tutarlı çalışır.
  - Eğim profili ve süre tahmini daha anlamlı olur.
- **Eşit uzunlukta parçalar** (örn. 10–20 m): İleride “başlangıç koordinatıyla iş yapma” (snap, rota başlangıç/bitiş) daha kolaylaşır; isteğe bağlı olarak grafı bu parçalara bölerek daha düzgün bir çözünürlük elde edersiniz.

---

## 2. Eşit uzunlukta segmentler (10–20 m)

### 2.1 Mevcut durum (bagla6)

- Örnekleme **sabit 50 m** aralıklarla; yol parça uzunlukları eşit değil.
- Son segment (50 m’den kısa) değişken uzunlukta kalıyor.
- Graf yapısı **değişmiyor**: her OSM edge tek edge; sadece maliyet 50 m’lik parçalardan hesaplanıyor.

### 2.2 Yeni davranış (bagla7)

- **SEGMENT_LENGTH_M** (örn. 15 m): Örnekleme **eşit aralıklı** (0, 15, 30, … , length).
- Her iki ardışık nokta arası = bir “segment”; maliyet segment bazlı hesaplanıyor (eşit uzunluk, son segment hariç).
- **SPLIT_EDGES_INTO_SEGMENTS = True** ise:
  - Her orijinal edge, 15 m’lik (veya sonunda kalan daha kısa) **sub-edge’lere** bölünür.
  - Arada **yeni düğümler** (ara noktalar) eklenir; her sub-edge’in `u` ve `v`’si tanımlı.
  - Sonuç: Graf daha fazla düğüm ve kenar içerir; snap “en yakın düğüm” ile yaklaşık 15 m çözünürlük sağlar.

### 2.3 Ne zaman bölmeli?

| Amaç | Öneri |
|------|--------|
| Rota hesaplarken snap’i kolaylaştırmak, daha düzgün çözünürlük | `SPLIT_EDGES_INTO_SEGMENTS = True`, `SEGMENT_LENGTH_M = 15` (veya 10–20) |
| Graf boyutunu küçük tutmak, mevcut yapıyı korumak | `SPLIT_EDGES_INTO_SEGMENTS = False`; sadece eşit aralıklı örnekleme ile maliyet kalitesi artar |

---

## 3. 30 m DEM ve gürültü azaltma

### 3.1 Sorun

- **30 m piksel** DEM’de noktalar piksel köşelerine veya sınırlarına denk gelince tek piksel değeri veya keskin geçişler okunuyor → **gürültü**, testere dişi eğim.
- 50 m örneklemede bile, 15–20 m örneklemede çok daha fazla nokta piksel sınırına yakın olur.

### 3.2 Yapılan iyileştirmeler

1. **Bilinear örnekleme**
   - Her (x, y) için DEM değeri artık **en yakın 4 pikselin ağırlıklı ortalaması** (bilinear interpolasyon) ile hesaplanıyor.
   - Piksel köşesine tam denk gelse bile tek değer yerine komşu piksellerin ortalaması alınır → köşe/kenar gürültüsü azalır.

2. **Pencere tabanlı yumuşatma**
   - **SMOOTH_WINDOW = 7** (veya 5–9): 15 m örneklemede 7 nokta ≈ 90 m → yaklaşık **3 DEM pikseli** kapsanır; kısa dalga gürültü bastırılır.
   - 30 m DEM için kural: Pencere en az **2 piksel** (≈ 60 m) kapsasın; 15 m’de bu 4+ nokta → 5 veya 7 nokta uygun.

3. **Savitzky–Golay (USE_SAVGOL = True)**
   - Hareketli ortalama yerine (veya ek olarak) **Savitzky–Golay** filtresi: trend (eğim) korunur, yüksek frekanslı gürültü azalır.
   - `SAVGOL_WINDOW = 7`, `SAVGOL_POLY = 2` makul başlangıç; daha yumuşak için pencere büyütülebilir.

4. **Median ön filtre (USE_MEDIAN_PREFILTER = True)**
   - Önce **3’lü median** filtresi: ani sıçramalar (spike) temizlenir; sonra Savitzky–Golay veya MA uygulanır.
   - Özellikle tek piksel hataları ve keskin çıkışlar için faydalı.

### 3.3 Parametre özeti (30 m DEM)

| Parametre | Önerilen | Açıklama |
|-----------|----------|----------|
| SEGMENT_LENGTH_M | 10–20 | Eşit segment uzunluğu; 15 m dengeli. |
| SMOOTH_WINDOW | 5–7 | 30 m DEM’de 2–3 piksel kapsasın (60–90 m). |
| USE_SAVGOL | True | Eğim trendini korur. |
| SAVGOL_WINDOW | 5–7 | SMOOTH_WINDOW ile uyumlu. |
| SAVGOL_POLY | 2 | Düşük polinom = daha yumuşak. |
| USE_MEDIAN_PREFILTER | True | Spike’ları azaltır. |
| MEDIAN_WINDOW | 3 | Küçük pencere yeterli. |

---

## 4. Bağımlılıklar

- **scipy**: `savgol_filter`, `median_filter` için (isteğe bağlı; yoksa sadece hareketli ortalama kullanılır).
- **rasterio**, **geopandas**, **numpy**, **shapely**: mevcut pipeline ile aynı.

```bash
pip install scipy rasterio geopandas numpy shapely
```

---

## 5. Çıktı farkı

- **bagla6:** `istanbul_avrupa_asimetrik_graf.gpkg` — edge sayısı = orijinal edge sayısı; örnekleme 50 m.
- **bagla7 (SPLIT_EDGES = False):** Aynı edge sayısı; örnekleme SEGMENT_LENGTH_M (15 m), bilinear + gürültü azaltma.
- **bagla7 (SPLIT_EDGES = True):** Edge sayısı artar (her edge ~length/15 kadar parçaya bölünür); yeni ara düğümler `nodes` katmanına eklenir; çıktı `istanbul_avrupa_asimetrik_graf_v2.gpkg`.

Routing’e geçerken `v2` grafını kullanırsanız, snap ve rota çözünürlüğü daha iyi olur; graf büyüdüğü için sorgu süresi biraz artabilir, gerekirse ileride bölge bazlı veya Contraction Hierarchies ile hızlandırılabilir.
