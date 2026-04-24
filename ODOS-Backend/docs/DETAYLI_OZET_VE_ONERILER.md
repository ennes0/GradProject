# ODOS Backend — Detaylı Özet ve Öneriler

Bu doküman, [TECHNICAL_ROADMAP.md](TECHNICAL_ROADMAP.md) içindeki ana kararların **detaylı özeti** ve ek açıklamaları içerir. Yol haritasına hızlı referans ve ekip içi paylaşım için kullanılabilir.

---

## 1. Proje Fikrinin Teknik Analizi (Detaylı)

### 1.1 Mevcut Durum — Ne İyi Çalışıyor?

**Python pipeline (`yol_egim_bagla6.py`)**

- **Coğrafi doğruluk**
  - Yol ağı ve DEM farklı CRS’te; mesafe/eğim hesabı **metrik CRS (EPSG:32635)** ile yapılıyor. Bu, İstanbul için UTM Zone 35N ve metre cinsinden doğru uzunluk/eğim oranı demek.
  - Segment üzerinde **normalized=True** ile coğrafi interpolasyon, raster örnekleme için doğru koordinatları veriyor.

- **Eğim modeli**
  - **50 m** aralıklı örnekleme: Çok sıkı değil (hesap maliyeti makul), çok seyrek de değil (eğim değişimini yakalıyor).
  - **3 noktalı hareketli ortalama**: DEM gürültüsünü azaltıyor; kenar noktalar korunarak segment uçları bozulmuyor.

- **Maliyet formülü**
  - **Asimetrik maliyet**: Yukarı yürüme `K_YUKARI=8`, aşağı `K_ASAGI=1`. Yaya için yokuş çıkmak aşağı inmekten çok daha “pahalı” — literatür ve deneyimle uyumlu.
  - Her segment için `maliyet_parcasi = segment_uzunlugu * (1 + egim_orani_mutlak * K)`; toplam `maliyet_uv` / `maliyet_vu` doğrudan routing’de **edge weight** olarak kullanılabilir.

- **Çıktı zenginliği**
  - Edge’lerde: `maliyet_uv`, `maliyet_vu`, `egim_orani_mutlak`, yukarı/aşağı segment uzunlukları ve oranları. Hem shortest path hem de UI’da eğim profili / istatistik için yeterli.

**Veri setleri**

- `istanbul_yol_agi.gpkg` (edges + nodes), `output_hh.tif` (DEM), `istanbul_avrupa_asimetrik_graf.gpkg` (zenginleştirilmiş graf) — pipeline’ın bir sonraki adımı (routing, API) için doğrudan kullanılabilir.

### 1.2 Eksikler ve İyileştirme Alanları

| Eksik / zayıf nokta | Neden önemli | Olası çözüm (kısa) |
|--------------------|--------------|---------------------|
| **Rota hesaplama yok** | Kullanıcı A→B rota isteyemiyor; sadece hazır graf var. | Dijkstra/A* ile shortest path; maliyet = `maliyet_uv` (yönlü). |
| **REST API yok** | Mobil uygulama rota isteğini iletecek ve cevabı (koordinatlar, süre, eğim) alacak bir uç nokta yok. | Faz 1’de `GET /v1/route` (ve Faz 2’de `GET /v1/routes`) eklenmeli. |
| **Çoklu rota yok** | “En kolay / dengeli / en hızlı” seçeneği frontend’de var ama backend’den tek tip veya farklılaşmamış rota geliyor. | 3 farklı maliyet sütunu veya 3 ayrı weight ile 3 rota hesaplanmalı. |
| **Python loop performansı** | Tüm edge’ler üzerinde tek tek döngü + raster sample; çok büyük ağlarda (tüm Türkiye vb.) dakikalar sürebilir. | Vectorized örnekleme, multiprocessing, ileride C++/Rust modül. |
| **Canlı graph yok** | Çıktı sadece GPKG dosyası; sunucu başlarken veya istek anında graph’ın bellekte/veritabanında hazır olması gerekiyor. | PostGIS’e import veya uygulama başlangıcında in-memory graph yükleme. |

### 1.3 Sonuç

- Mevcut **eğim–yol ağı entegrasyonu** ve **maliyet modeli** sağlam; değiştirmenize gerek yok.
- Odaklanılacaklar: **routing motoru**, **API katmanı**, **çoklu rota**, **performans ve ölçek**.

---

## 2. Backend Mimarisi — 4 Fazlı Yol Haritası (Detaylı)

### 2.1 Faz Özet Tablosu

| Faz | Ana hedef | Tahmini süre | Kritik çıktılar |
|-----|-----------|--------------|-----------------|
| **Faz 1** | Graph + tek rota API | 4–6 hafta | GPKG → graph (PostGIS veya in-memory), snap, shortest path, `GET /v1/route` |
| **Faz 2** | Çoklu rota + eğim profili | 3–4 hafta | 3 rota (easiest/balanced/fastest), elevation_profile, `GET /v1/routes` |
| **Faz 3** | Kullanıcı + kişiselleştirme | 4–6 hafta | Auth, profil, eğim hassasiyeti, kişiye özel maliyet, opsiyonel fitness |
| **Faz 4** | Sosyal + ölçek | Sürekli | Paylaşım, favori, geçmiş; bölge/ölçek, cache, yük dengeleme |

### 2.2 Faz 1 — Adım Adım Detay

- **Graph yükleme**
  - Kaynak: `istanbul_avrupa_asimetrik_graf.gpkg` (edges + nodes).
  - Edge’lerde kullanılacak alanlar: `u`, `v`, `length`, `maliyet_uv`, `maliyet_vu`, `geometry`.
  - Tercih 1: PostGIS tablolarına aktar; spatial index (GIST) aç; pgRouting ile rota.
  - Tercih 2: Uygulama başlarken GPKG okuyup in-memory graph (Java: JGraphT, C++: custom) oluştur.

- **Snap (en yakın düğüm)**
  - Girdi: kullanıcının (lat, lon) noktası.
  - Çıktı: Graph’taki en yakın node id (veya en yakın edge + edge üzerinde projeksiyon noktası).
  - Yöntem: R-tree / STR-tree (JTS, GEOS) veya PostGIS `ST_ClosestPoint`, `ST_DWithin` + sıralama.

- **Shortest path**
  - Algoritma: Dijkstra veya A*; maliyet = `maliyet_uv` (origin → destination yönünde).
  - Çıktı: Sıralı edge listesi → geometrileri birleştir → tek polyline (lat/lon dizisi).
  - Toplam maliyet → tahmini süre: örn. `duration_min = total_cost / (ortalama_hiz * birim)` veya eğim-bazlı basit formül.

- **REST endpoint**
  - Örnek: `GET /v1/route?origin=41.037,28.985&destination=41.025,28.974&preference=balanced`
  - Cevap: `{ coordinates: [[lat,lon],...], distance_km, duration_min, total_climb_m, elevation_profile: [...] }`.
  - İlk aşamada `preference` tek değer (örn. balanced) ile çalışabilir; Faz 2’de genişler.

### 2.3 Faz 2 — Çoklu Rota ve Eğim Profili

- **Üç maliyet tanımı**
  - **En kolay (easiest):** Edge weight = `maliyet_uv` (mevcut; eğim ağırlıklı).
  - **En hızlı (fastest):** Edge weight = `length` (veya `length` + çok küçük eğim cezası).
  - **Dengeli (balanced):** Edge weight = `0.5 * length + 0.5 * maliyet_uv` veya benzeri bir kombinasyon; veya farklı K_YUKARI/K_ASAGI ile önceden hesaplanmış ikinci bir maliyet sütunu.

- **Eğim profili**
  - Rota edge’lerindeki segment bilgisi (mesafe, yükseklik) → kümülatif mesafe ve yükseklik dizisi.
  - API cevabında: `elevation_profile: [{ distance_m: 0, elevation_m: 10 }, { distance_m: 100, elevation_m: 12 }, ...]`.
  - Toplam tırmanış: `total_climb_m`. Maksimum/ortalama eğim: mevcut edge alanlarından türetilebilir.

- **Endpoint**
  - `GET /v1/routes?origin=...&destination=...` → 3 rota; her biri için coordinates, distance_km, duration_min, total_climb_m, avg_slope_pct, elevation_profile, type (easiest/balanced/fastest). Frontend’deki `RouteSelectionModal` bu yapıyı doğrudan kullanabilir.

### 2.4 Faz 3 ve 4 — Kısa Hatırlatma

- **Faz 3:** Auth (JWT/OAuth), kullanıcı profili (eğim hassasiyeti 1–5), kişiselleştirilmiş edge maliyeti (`user_slope_factor`), opsiyonel HealthKit/Google Fit ile hız veya kondisyon çıkarımı.
- **Faz 4:** Rota paylaşımı, favoriler, geçmiş; bölge bazlı graflar, Redis cache, API yatay ölçekleme.

---

## 3. C++ vs Java — Detaylı Öneri

### 3.1 Performansın Kritik Olduğu Yerler

- **Rota sorgusu:** Hedef genelde 50–300 ms civarı; çok büyük graf ve çok düşük gecikme hedefi (örn. &lt;50 ms) C++/Rust’ı düşündürür.
- **DEM + yol ağı birleştirme:** Batch iş; günlük/haftalık çalışıyorsa Python yeterli olabilir; süre çok uzarsa vectorize/paralel veya C++/Rust modül.
- **Snap:** Spatial index sorgusu; iyi implementasyonla her iki dilde de milisaniye altı.

### 3.2 C++ Ne Zaman Mantıklı?

- **Artılar:** Maksimum hız, bellek kontrolü; OSRM/GraphHopper gibi routing motorları C++ tabanlı.
- **Eksiler:** Geliştirme süresi, API katmanı için ayrı dil (Node/Go/Java), build/deploy karmaşıklığı.
- **Önerilen kullanım:** Graf çok büyük (ülke çapı), &lt;50 ms rota hedefi, uzun vadede kendi routing çekirdeğinizi yazacaksanız.

### 3.3 Java (JVM) Ne Zaman Mantıklı?

- **Artılar:** JGraphT (Dijkstra, A*), JTS (geometri, STR-tree), Spring Boot ile tek dilde API + routing; geliştirme hızı yüksek.
- **Eksiler:** C++ kadar “tam kontrol” yok; soğuk başlangıç (cold start) serverless için dikkat edilmeli.
- **Önerilen kullanım:** Orta ölçek (birkaç şehir), 100–300 ms kabul edilebilir, ekip Java biliyorsa.

### 3.4 Hibrit ve Pratik Karar

- **Kısa vade (MVP):**
  - **Seçenek A:** Python (FastAPI) + PostGIS/pgRouting: GPKG → PostGIS, rota SQL ile; hızlı prototip.
  - **Seçenek B:** Java (Spring Boot) + JGraphT + JTS: GPKG okuyup in-memory graph; REST aynı uygulamada.
- **Orta/uzun vade:** Rota motoru C++ veya Rust (kütüphane veya ayrı servis); API (Java/Go/Node) bunu çağırır. Alternatif: OSRM/GraphHopper’a custom edge weight (eğim maliyeti) enjekte etmek; veri pipeline’ınız bu formatı üretecek şekilde uyarlanır.

**Özet öneri:** Önce **Java + JGraphT + JTS** veya **PostGIS + pgRouting** ile MVP; performans ihtiyacı artarsa C++/Rust core veya OSRM/GraphHopper entegrasyonu.

---

## 4. Veritabanı Yapısı (Detaylı)

### 4.1 Kullanım Amaçlarına Göre Tablolar

| Veri türü | Amaç | Önerilen teknoloji | Not |
|-----------|------|--------------------|-----|
| **Nodes** | Graf düğümleri, snap | PostGIS (point, spatial index) veya in-memory | id, osm_id, lat, lon, geom, elevation (opsiyonel) |
| **Edges** | Graf kenarları, maliyet, geometri | PostGIS (LineString) veya in-memory | source, target, length_m, cost_forward, cost_backward, max_slope_pct, geom, elevation_profile (JSONB) |
| **Kullanıcı / auth** | Kayıt, giriş, oturum | PostgreSQL (aynı instance) | users, sessions; JWT veya session tablosu |
| **Profil / tercihler** | Eğim hassasiyeti, hedef | PostgreSQL | user_preferences (user_id, slope_sensitivity, goal_type, …) |
| **Favori / paylaşım** | Rota meta bilgisi | PostgreSQL | saved_routes (user_id, origin, dest, preference, summary JSONB) |
| **Rota sonuç cache** | Aynı isteğe hızlı cevap | Redis | Key: (origin_snap, dest_snap, preference), value: JSON cevap, TTL 5–15 dk |

### 4.2 PostgreSQL + PostGIS Şeması (Örnek)

- **nodes:** `id` (bigint), `osm_id`, `lon`, `lat`, `geom` (geometry(Point,4326)), `elevation` (numeric).
- **edges:** `id`, `source`, `target`, `length_m`, `cost_forward`, `cost_backward`, `cost_easiest`, `cost_balanced`, `cost_fastest` (Faz 2’de), `geom` (geometry(LineString,4326)), `elevation_profile` (JSONB).
- **Spatial index:** `CREATE INDEX ON edges USING GIST(geom);` ve nodes için benzeri.
- pgRouting ile: `pgr_dijkstra` veya `pgr_a*`; maliyet sütunu olarak `cost_forward` / `cost_easiest` vb. kullanılır.

### 4.3 Redis Kullanımı

- **Cache key örneği:** `route:{origin_lat}:{origin_lon}:{dest_lat}:{dest_lon}:{preference}`.
- **Value:** API cevabının JSON’ı (coordinates, distance_km, duration_min, …).
- **TTL:** 5–15 dakika; trafik/yarışım değişmediği varsayılır.

### 4.4 DEM / Raster

- Canlı rota hesabında DEM doğrudan kullanılmak zorunda değil; eğim zaten edge’lere yazılmış. DEM, sadece **veri hazırlama pipeline’ında** (yol_egim_bagla6 benzeri) kullanılır.
- İstenirse DEM’i PostGIS raster olarak saklayabilirsiniz; yeni bölge eklerken veya edge’leri yeniden hesaplarken kullanılırsın.

---

## 5. Routing Algoritmaları ve Eğimin Cost Function’da Kullanımı (Detaylı)

### 5.1 Algoritma Seçimi

- **Dijkstra:** Her yönde aynı mantık; edge weight = `maliyet_uv` (yönlü). Basit, doğru, yeterli performans.
- **A*:** Heuristic ile daha az düğüm açar. Heuristic = hedefe mesafe (Haversine) × birim maliyet tahmini; admissible olmalı (tahmin gerçek maliyeti aşmamalı).
- **Bidirectional A*:** Büyük graflarda daha hızlı; baştan ve sondan aynı anda; ortada buluşma. Implementasyon daha karmaşık.
- **k-shortest (Yen):** Aynı origin/destination için k farklı rota. “3 alternatif” için kullanılabilir; pratikte 3 farklı maliyet ile 3 kez Dijkstra genelde daha anlaşılır ve yeterli.

**Öneri:** MVP’de **Dijkstra** veya **A***; çoklu rota için **3 ayrı maliyet sütunu + 3 kez shortest path**. Ölçek büyüyünce **Bidirectional A*** veya **Contraction Hierarchies** (ön işlem ile sorgu hızı artar).

### 5.2 Eğimin Cost Function’da Kullanımı

Mevcut formülünüz (segment bazlı):

- **Yukarı:** `cost_segment = length * (1 + egim_orani_mutlak * K_YUKARI)`  
- **Aşağı:** `cost_segment = length * (1 + egim_orani_mutlak * K_ASAGI)`  

Edge’in toplam `maliyet_uv` / `maliyet_vu` bu segmentlerin toplamı. **Routing algoritması sadece bu ağırlığı kullanır;** ek bir “eğim formülü” yazmanız gerekmez.

**Genel form (ileride kişiselleştirme için):**

```text
cost(u→v) = length(u→v) × (1 + α × slope_penalty_up + β × slope_penalty_down)
```

- **En kolay:** α büyük, β küçük (yokuştan kaçın).
- **En hızlı:** α ≈ 0, β ≈ 0 (mesafe öncelikli).
- **Dengeli:** α ve β orta değerler.
- **Kullanıcı profili:** “Eğim hassasiyeti” 1–5 ise, α = base_α × sensitivity gibi ölçeklenebilir.

### 5.3 A* Heuristic (Kısaca)

- `h(n) = haversine(n, goal) * min_cost_per_metre`  
  `min_cost_per_metre`, grafın en düşük cost/length oranına yakın seçilerek heuristic admissible kalır.
- Veya `h(n) = haversine(n, goal) * k` (k sabit, eğim nedeniyle gerçek maliyet ≥ bu tahmin).

---

## 6. Ek Öneriler (Detaylı)

### 6.1 Veri İşleme Pipeline (DEM + Yol Ağı)

- **Vectorized raster örnekleme:** Tüm segment örnek noktalarını tek listede toplayıp `rasterio.sample()` tek çağrı; sonuçları edge id ile eşle.
- **Paralel işleme:** Edge’leri parti parti `multiprocessing` ile işle; her worker kendi DEM penceresini okusun.
- **Ön işlem:** DEM’i metrik CRS’e reproject edip yol ağı bbox’ına crop’layan “hazır” raster; ana script bunu kullansın.
- **Uzun vadede:** C++/Rust modül: segment noktaları + raster → maliyetler; Python sadece orchestration ve GPKG yazma.

### 6.2 Rota API Optimizasyonu

- **Cache:** (origin_snap, dest_snap, preference) → Redis’te sonuç; TTL 5–15 dk.
- **Snap cache:** Sık kullanılan noktalar (meydanlar, istasyonlar) için en yakın node id cache’lenebilir.
- **Graf:** Mümkünse RAM’de tut (Java/C++); PostGIS kullanıyorsanız `work_mem` ve GIST index ile sorgu optimize edilir.

### 6.3 Ölçeklenebilirlik

- **Yatay:** API sunucuları stateless; Redis + PostgreSQL paylaşımlı. Rota servisi ayrı pod/sunucu olabilir (graf bellekte).
- **Bölge:** Graf bölgelere ayrılır (İstanbul Avrupa / Anadolu vb.); istek bölgeye göre ilgili grafı seçer; sınır geçişi için birleşik sınır düğümleri tanımlanabilir.
- **Güncelleme:** Yol ağı / DEM güncellemesi periyodik (gece batch); yeni GPKG → PostGIS import veya in-memory graf yeniden yükleme (rolling restart).

### 6.4 Frontend ile Uyum

Mobil taraftaki `RouteSelectionModal` ve `NavigationView` ile uyum için:

- **Çoklu rota cevabı:** Her rota için `id`, `type` (easiest/balanced/fastest), `label`, `description`, `coordinates`, `distance_km`, `duration_min`, `total_climb_m`, `avg_slope_pct`, `elevation_profile`, `color`, `recommended` alanları. Detaylı örnek JSON [TECHNICAL_ROADMAP.md](TECHNICAL_ROADMAP.md) içinde “Frontend ile Uyum” bölümünde.
- **Tek rota (Faz 1):** `coordinates`, `distance_km`, `duration_min`, `total_climb_m`, `elevation_profile` yeterli; frontend tek kart olarak gösterebilir.

---

## 7. İlk Somut Adımlar (Checklist)

1. [ ] GPKG’yi PostGIS’e aktar **veya** Java ile GPKG okuyup in-memory graph oluştur.
2. [ ] Snap: (lat, lon) → en yakın node id (spatial index veya PostGIS).
3. [ ] Dijkstra veya A* ile tek maliyet (`maliyet_uv`) üzerinden shortest path; çıktı = edge listesi → polyline.
4. [ ] `GET /v1/route?origin=...&destination=...` endpoint’i; cevap JSON (coordinates, distance_km, duration_min, total_climb_m, elevation_profile).
5. [ ] Faz 2: 3 maliyet (easiest, balanced, fastest) tanımla; 3 rota hesapla; `GET /v1/routes` ve frontend’in beklediği formatta 3 rota döndür.

Bu doküman, [TECHNICAL_ROADMAP.md](TECHNICAL_ROADMAP.md) ile birlikte kullanıldığında karar alma ve uygulama takibi için yeterli detayı sağlar.
