# ODOS Backend — Teknik Analiz ve Yol Haritası

Bu doküman, yayalara yönelik eğim-destekli navigasyon uygulaması ODOS’un backend tarafının teknik analizi, mimari önerileri ve uygulama yol haritasını içerir.

---

## 1. Proje Fikrinin Teknik Analizi

### 1.1 Amaçlar ve Teknik Karşılıkları

| Amaç | Teknik gereksinim |
|------|-------------------|
| Yayalar için navigasyon | Yürüyüş (walking) graph, yaya geçişleri, kaldırım bilgisi; gerçek zamanlı rota API’si |
| Eğim verisi ile rota | DEM → edge bazlı maliyet (yukarı/aşağı asimetrik); segment bazlı eğim profili |
| Kolay / orta / zor alternatifler | Çoklu maliyet fonksiyonu veya tek maliyet + alternatif rotalar (k-shortest / pareto) |
| Sosyal özellikler | Kullanıcı, paylaşım, favori, yorum; ilişkisel/NoSQL veri modeli; auth |
| Fitness + kişiselleştirme | Kullanıcı profili (kondisyon, eğim toleransı); rota süresi/tahmin modeli; opsiyonel HealthKit/Google Fit entegrasyonu |

### 1.2 Mevcut Backend Değerlendirmesi

**Elinizde olanlar:**

- **`yol_egim_bagla6.py`**: Yol ağı (GeoPackage edges/nodes) + DEM (GeoTIFF) entegrasyonu.
  - **Güçlü yönler:**
    - Metrik CRS (EPSG:32635) kullanımı — mesafe/eğim hesabı doğru.
    - Segment bazlı örnekleme (50 m), hareketli ortalama ile DEM gürültü azaltma.
    - **Asimetrik maliyet**: Yukarı (K_YUKARI=8) / aşağı (K_ASAGI=1) — yaya fiziğiyle uyumlu.
    - Çıktı: `maliyet_uv`, `maliyet_vu`, `egim_orani_mutlak`, yukarı/aşağı segment uzunlukları — routing ve UI için uygun.
  - **İyileştirme alanları:**
    - Tüm edge’ler üzerinde Python loop — büyük ağlarda yavaş; toplu (vectorized) işlem veya C++/Rust core düşünülmeli.
    - Raster örnekleme her edge için ayrı; toplu `sample()` veya önceden raster → graph enrichment pipeline ile hızlanabilir.
    - Çıktı sadece dosya (GPKG); canlı routing için bir graph DB veya in-memory graph + API katmanı gerekli.

- **Veri:** `istanbul_yol_agi.gpkg`, `output_hh.tif`, `istanbul_avrupa_asimetrik_graf.gpkg` — pipeline’ın devamı için sağlam temel.

**Eksik / sonraki adımlar:**

1. **Routing motoru**: GPKG’deki maliyetlerle gerçek shortest-path (Dijkstra/A*) — henüz yok.
2. **REST/GraphQL API**: Mobil istemcinin rota isteği (origin, destination, preference) ve cevap (geometry, süre, eğim profili).
3. **Çoklu rota**: En kolay / dengeli / en hızlı için farklı maliyet veya farklı algoritma çalıştırma.
4. **Ölçeklenebilirlik**: Şu an tek bölge, tek script; ileride bölge bazlı graflar, cache, yatay ölçekleme.

---

## 2. Backend Mimarisi — Yol Haritası

### 2.1 Faz Özeti

```
Faz 1: Graph + API temeli     → GPKG’den graph yükleme, tek rota API
Faz 2: Çoklu rota & eğim API  → Kolay/dengeli/hızlı, eğim profili
Faz 3: Kullanıcı & kişiselleştirme → Auth, profil, fitness, öneri
Faz 4: Sosyal & ölçek         → Paylaşım, favori, bölge/ölçek
```

### 2.2 Faz 1 — Graph + Tek Rota API (4–6 hafta)

**Hedef:** Mobil uygulamanın “A’dan B’ye rota ver” isteğine tek, eğim-duyarlı rota dönen API.

- **1.1 Graph yükleme**
  - `istanbul_avrupa_asimetrik_graf.gpkg` (edges + nodes) okunacak.
  - Edge maliyeti: `maliyet_uv` / `maliyet_vu` (yönlü); geometri WKT/GeoJSON saklanacak.
  - Tercih: In-memory graph (C++/Java/Rust) veya PostGIS + pgRouting (hızlı prototip).

- **1.2 En yakın düğüm (snap)**
  - İstek: (lat, lon). Cevap: Graph’taki en yakın node id (veya en yakın edge + projeksiyon).
  - Yöntem: Spatial index (R-tree, STR-tree) veya PostGIS `ST_ClosestPoint` / `ST_DWithin`.

- **1.3 Shortest path**
  - Dijkstra veya A* (heuristic: düz mesafe), maliyet = `maliyet_uv` (yönlü).
  - Çıktı: ordered list of edges → geometri birleştir → polyline; toplam maliyet → tahmini süre (sabit yürüyüş hızı veya eğim-bazlı formül).

- **1.4 REST endpoint**
  - `GET /v1/route?origin=lat,lon&destination=lat,lon&preference=balanced`
  - Cevap: `{ coordinates: [...], distance_km, duration_min, total_climb_m, elevation_profile: [...] }`.

**Çıktı:** Tek preference (örn. balanced) ile çalışan, eğim-maliyetli rota API’si.

### 2.3 Faz 2 — Çoklu Rota & Eğim Profili (3–4 hafta)

- **2.1 Üç maliyet / üç rota**
  - **En kolay**: Maliyet = `maliyet_uv` (zaten eğim ağırlıklı; K_YUKARI yüksek).
  - **En hızlı**: Maliyet = `length` (veya hafif eğim cezası) — kısa mesafe öncelikli.
  - **Dengeli**: Maliyet = `α * length + β * maliyet_uv` (örn. α=0.5, β=0.5) veya sadece `maliyet_uv` ile farklı K_YUKARI/K_ASAGI.

  Alternatif: Aynı graf üzerinde tek Dijkstra ile “alternatif segment” toplama (deviation routes) veya k-shortest path (Yen’s algorithm).

- **2.2 Eğim profili**
  - Rota edge’leri için zaten `egim_orani_mutlak`, segment uzunlukları ve yükseklik bilgisi var.
  - Her edge için kümülatif mesafe + yükseklik → `elevation_profile: [{distance_m, elevation_m}, ...]` ve `total_climb_m`, `max_slope_pct`.

- **2.3 API genişletme**
  - `GET /v1/routes?origin=...&destination=...` → 3 rota (easiest, balanced, fastest) + her biri için distance, duration, total_climb_m, avg_slope_pct, elevation_profile.
  - Frontend’deki `RouteSelectionModal` bu 3 rotayı doğrudan kullanabilir.

### 2.4 Faz 3 — Kullanıcı & Kişiselleştirme (4–6 hafta)

- **3.1 Auth**
  - JWT veya session; e-posta/şifre veya OAuth (Google/Apple) — mobil uyumlu.

- **3.2 Kullanıcı profili**
  - Tercihler: “Eğimden ne kadar etkileniyorum?” (1–5), “Hedef: kalori / hız / rahatlık”.
  - İsteğe bağlı: kondisyon seviyesi, yaş, kiloya göre kalori/süre tahmini.

- **3.3 Kişiselleştirilmiş maliyet**
  - Edge maliyeti = `base_cost * (1 + user_slope_factor * egim_orani)`.
  - `user_slope_factor`: profil “eğim hassasiyeti”ne göre; yüksek → daha düz rotalar.

- **3.4 Fitness entegrasyonu (opsiyonel)**
  - HealthKit / Google Fit’ten adım, mesafe, kalori okuyup “tahmini yürüyüş hızı” veya “eşdeğer eğim toleransı” çıkarımı.
  - Backend: kullanıcıya “önerilen rota” (easiest/balanced/fastest) seçimi veya süre tahminini kullanıcı hızına göre güncelleme.

### 2.5 Faz 4 — Sosyal & Ölçek (sürekli)

- Paylaşım (rota linki), favori rotalar, geçmiş rotalar, basit sosyal feed.
- Bölge bazlı graflar (şehir/ülke parçaları), cache (Redis), CDN (statik tile’lar varsa), yük dengeleme.

---

## 3. Performans: C++ vs Java (ve Alternatifler)

### 3.1 Nerede Performans Kritik?

- **Rota hesaplama**: Dijkstra/A* — on binler~yüz binler düğüm, milisaniye–yüzlerce ms hedefi.
- **DEM + yol ağı birleştirme**: Mevcut Python pipeline — büyük ağlarda dakikalar sürebilir; günlük/haftalık batch için kabul edilebilir, canlı değil.
- **Snap (en yakın düğüm)**: Spatial index sorgusu — çok hızlı olmalı (ms).

### 3.2 C++

- **Artıları:** Maksimum hız, bellek kontrolü; routing kütüphaneleri (OSRM, GraphHopper çekirdeği C++) ile uyum.
- **Eksileri:** Geliştirme süresi uzun, API katmanı için ayrı dil (Node/Go/Java) gerekebilir; build/deploy daha karmaşık.

**Ne zaman mantıklı:** Graf çok büyük (örn. tüm Türkiye), <50 ms rota süresi hedefi, uzun vadede kendi routing motorunuzu yazacaksanız.

### 3.3 Java (ve JVM)

- **Artıları:** Hızlı geliştirme, güçlü kütüphaneler (JGraphT — Dijkstra/A*, spatial: JTS), tek dilde API + routing; Spring Boot ile REST kolay.
- **Eksileri:** C++ kadar “tam kontrol” yok; ilk açılış (cold start) biraz daha yavaş (serverless için dikkat).

**Ne zaman mantıklı:** Orta ölçek (birkaç şehir), 100–300 ms rota kabul edilebilir, ekip Java biliyorsa.

### 3.4 Hibrit / Pratik Öneri

- **Kısa vadede:**  
  - **Seçenek A:** Python (FastAPI) + NetworkX veya **pgRouting (PostGIS)** ile graf + routing. GPKG → PostGIS’e aktar; API sadece SQL/ST_ShortestPath. Hızlı MVP, performans yeterli olabilir.  
  - **Seçenek B:** Java (Spring Boot) + **JGraphT** (graph) + **JTS** (geometri + spatial index). GPKG okuyup in-memory graph; REST aynı uygulamada. Ölçek büyüdükçe cache ve graf bölümleme eklenir.

- **Orta/uzun vadede:**  
  - Rota motoru C++ veya **Rust** (library olarak); API (Java/Go/Node) bu kütüphaneyi FFI veya ayrı servis olarak çağırır.  
  - Veya hazır çözüm: **OSRM** (C++) veya **GraphHopper** (Java) — custom edge weight = eğim maliyeti enjekte edilerek kullanılabilir; bu durumda veri pipeline’ınız (DEM + yol ağı) OSRM/GraphHopper formatına çıktı üretecek şekilde uyarlanır.

**Özet öneri:** Önce **Java + JGraphT + JTS** veya **PostGIS + pgRouting** ile MVP; performans ihtiyacı artarsa C++/Rust routing core veya OSRM/GraphHopper entegrasyonu.

---

## 4. Veritabanı Yapısı ve Teknolojiler

### 4.1 Veri Türleri

| Veri | Özellik | Önerilen teknoloji |
|------|---------|---------------------|
| Yol ağı + eğim maliyetleri | Graf (nodes, directed edges), geometri, ağırlıklar | **PostGIS + pgRouting** veya **in-memory (Java/C++)** + kalıcılık için DB |
| DEM / raster | Bölgesel; rota hesaplaması önceden edge’e yazıldığı için canlıda zorunlu değil | Dosya (GeoTIFF) veya PostGIS raster; pipeline tarafında kullanım |
| Kullanıcılar, profiller, auth | İlişkisel, transaction | **PostgreSQL** (aynı instance’da PostGIS ile) |
| Favori rotalar, paylaşımlar | Rota meta + referans | PostgreSQL (JSONB ile geometry özeti veya sadece origin/dest + preference) |
| Oturum / cache | Geçici, hızlı | **Redis** (session, rota sonuç cache) |
| Geçmiş rotalar, analytics | Zaman serisi, büyüyebilir | PostgreSQL (partition by date) veya ileride **TimescaleDB** |

### 4.2 Önerilen Birleşik Yapı

- **PostgreSQL + PostGIS (+ pgRouting)**
  - **nodes**: id, osm_id, lat, lon, geom, elevation (opsiyonel).
  - **edges**: id, source, target, length_m, cost_forward, cost_backward, max_slope_pct, geom (LineString), elevation_profile (JSONB — segment bazlı yükseklik).
  - Rota: `pgr_dijkstra` veya `pgr_a*` ile maliyet sütunu = `cost_forward` / `cost_backward`; geometri `pgr_geomResult` veya edge id’lerden birleştirilir.
  - Kullanıcı, auth, favori rotalar aynı PostgreSQL’de ayrı şemada.

- **Redis**
  - Son N rota isteği (origin, destination, preference) → sonuç cache (TTL 5–15 dk).
  - Session / JWT blacklist (çıkış sonrası).

### 4.3 Alternatif: Graf Ayrı, İş Mantığı Ayrı

- **Graf:** In-memory (Java/C++) veya özelleştirilmiş graph DB (Neo4j — daha az yaygın routing’de).
- **İş mantığı:** PostgreSQL (kullanıcı, sosyal, analytics).
- **Avantaj:** Routing katmanı tamamen özelleştirilebilir; **Dezavantaj:** İki sistem senkron (graf güncellemesi) ve operasyon yükü.

**Pratik:** İlk aşamada **PostgreSQL + PostGIS + pgRouting** ile başlayıp, gerektiğinde “routing-only” servisi (C++/Java in-memory) eklemek en dengeli seçenek.

---

## 5. Routing Algoritmaları ve Eğimin Cost Function’a Entegrasyonu

### 5.1 Algoritma Seçimi

| Algoritma | Kullanım | Not |
|-----------|----------|-----|
| **Dijkstra** | Genel shortest path, yönlü maliyet | Basit, her yönde aynı mantık; eğim maliyeti zaten edge weight’te. |
| **A*** | Tek hedef; heuristic ile daha az düğüm açma | Heuristic: Haversine veya düz mesafe × min_edge_cost. Admissible olmalı (tahmin gerçek maliyeti aşmamalı). |
| **Bidirectional A*** | Büyük graflar, daha hızlı | Baştan ve sondan aynı anda; ortada buluşma. Implementasyon daha karmaşık. |
| **k-shortest (Yen)** | Alternatif rotalar | Aynı origin/destination için k farklı rota; “en kolay / dengeli / en hızlı” için 3 ayrı maliyet çalıştırmak genelde daha basit. |

**Öneri:**  
- **MVP:** Dijkstra veya A* (tek maliyet).  
- **Çoklu rota:** Aynı graf üzerinde 3 farklı edge weight sütunu (cost_easiest, cost_balanced, cost_fastest) ile 3 kez Dijkstra/A*; veya 1 kez “balanced”, alternatifler için k-shortest.  
- **Ölçek büyüyünce:** Bidirectional A* veya Contraction Hierarchies (CH) — ön işlem ile sorgu süresi düşer.

### 5.2 Eğimin Cost Function’da Kullanımı (Mevcut Mantığınız)

Sizin formülünüz (segment bazlı):

- Yukarı: `cost_segment = length * (1 + egim_orani_mutlak * K_YUKARI)`  
- Aşağı: `cost_segment = length * (1 + egim_orani_mutlak * K_ASAGI)`  

Edge’in toplam `maliyet_uv` / `maliyet_vu` bu segmentlerin toplamı. Bu **zaten cost function**; routing algoritması sadece bu ağırlığı kullanır.

**Genel form (alternatif):**

```
cost(u→v) = length(u→v) × (1 + α × slope_penalty_up + β × slope_penalty_down)
```

- `slope_penalty_up/down`: Eğim oranına göre (örn. lineer veya eşik sonrası artan) fonksiyon.  
- **En kolay:** α büyük, β küçük (yokuştan kaçın).  
- **En hızlı:** α ve β küçük veya 0 (mesafe öncelikli).  
- **Dengeli:** α orta, β küçük.

Sizin K_YUKARI=8, K_ASAGI=1 bu mantığa uygun; ileride kullanıcı profili için α, β’yı kullanıcıya göre ölçekleyebilirsiniz.

### 5.3 Heuristic (A* için)

- **Haversine mesafe × minimum edge cost per metre:**  
  `h(n) = haversine(n, goal) * min_cost_per_m`  
  Eğimli graflarda “min_cost_per_m” = düz yol için tahmini (örn. length’e göre minimum cost/length oranı). Böylece heuristic admissible kalır.

- **Sadece mesafe:**  
  `h(n) = haversine(n, goal) * k`  
  k = 1 en düşük hızda kat edilecek süre veya maliyet birimi; eğim nedeniyle gerçek maliyet daha yüksek olacağından admissible olur.

---

## 6. Veri İşleme, Optimizasyon ve Ölçeklenebilirlik

### 6.1 Veri İşleme Pipeline (DEM + Yol Ağı)

- **Mevcut:** Python script, tek seferde tüm edge’ler.  
- **İyileştirmeler:**
  - **Vectorized raster sample:** Tüm örnek noktaları tek listede toplayıp `rasterio.sample()` tek çağrı; sonucu edge id ile eşle.
  - **Paralel:** Edge’leri parti parti (multiprocessing) işle; her parti kendi DEM penceresini okusun.
  - **Ön işlem:** DEM’i metrik CRS’e reproject edip, sadece yol ağı bbox’ına crop’layan bir “prepared” raster üret; ana script bunu kullansın.
  - **Uzun vadede:** C++/Rust modül: segment noktaları + raster → maliyetler; Python sadece orchestration.

### 6.2 Rota API Optimizasyonu

- **Cache:** (origin_snap, dest_snap, preference) → Redis’te sonuç (geometry polyline, süre, climb). TTL 5–15 dk.
- **Snap cache:** Sık kullanılan noktalar (ör. meydanlar) için en yakın node id cache.
- **Graf:** Mümkünse RAM’de tut (Java/C++); PostGIS kullanıyorsanız `work_mem` ve spatial index (GIST) ile sorgu hızı artırılır.

### 6.3 Ölçeklenebilirlik

- **Yatay:** API sunucuları stateless; Redis + PostgreSQL paylaşımlı. Rota servisi ayrı pod/sunucu olabilir (graf bellekte).
- **Bölge:** Graf bölgelere ayrılır (örn. İstanbul Avrupa / Anadolu); istek bölgeye göre ilgili grafı seçer; sınır geçişi için “birleşik” sınır düğümleri tanımlanabilir.
- **Güncelleme:** Yol ağı / DEM güncellemesi periyodik (gece batch); yeni GPKG → PostGIS import veya in-memory graf yeniden yükleme (rolling restart).

---

## 7. Frontend ile Uyum — Beklenen API Özeti

Mobil taraftaki `RouteSelectionModal` ve `NavigationView` ile uyum için önerilen sözleşme:

**Çoklu rota isteği:**

```
GET /v1/routes?origin=41.037,28.985&destination=41.025,28.974
```

**Cevap (önerilen):**

```json
{
  "routes": [
    {
      "id": "easiest",
      "type": "easiest",
      "label": "En Kolay",
      "description": "Düz yollar, minimum yokuş.",
      "coordinates": [[lat,lon], ...],
      "distance_km": 2.8,
      "duration_min": 22,
      "total_climb_m": 15,
      "avg_slope_pct": 2,
      "elevation_profile": [{ "distance_m": 0, "elevation_m": 10 }, ...],
      "color": "#4CAF50",
      "recommended": false
    },
    {
      "id": "balanced",
      "type": "balanced",
      "label": "Dengeli",
      "coordinates": [...],
      "distance_km": 2.4,
      "duration_min": 18,
      "total_climb_m": 45,
      "avg_slope_pct": 5,
      "elevation_profile": [...],
      "color": "#4ECDC4",
      "recommended": true
    },
    {
      "id": "fastest",
      "type": "fastest",
      "label": "En Hızlı",
      "coordinates": [...],
      "distance_km": 1.9,
      "duration_min": 15,
      "total_climb_m": 86,
      "avg_slope_pct": 12,
      "elevation_profile": [...],
      "color": "#FF6B6B",
      "recommended": false
    }
  ]
}
```

Frontend’deki `duration` alanı "18 dk" gibi string olarak kullanılıyorsa API’den `duration_min` alıp istemci tarafında formatlayabilirsiniz; veya API `duration_display: "18 dk"` da ekleyebilir.

---

## 8. Kısa Özet ve Sonraki Adımlar

1. **Mevcut Python pipeline** mantıklı ve kullanılabilir; performans için vectorize/paralel ve ileride C++/Rust modül düşünün.  
2. **Backend mimarisi:** Faz 1 (graph + tek rota API) → Faz 2 (3 rota + eğim profili) → Faz 3 (kullanıcı, kişiselleştirme) → Faz 4 (sosyal, ölçek).  
3. **Dil:** MVP için **Java (JGraphT + JTS)** veya **PostGIS + pgRouting**; performans ihtiyacı artarsa C++/Rust routing core veya OSRM/GraphHopper.  
4. **Veritabanı:** **PostgreSQL + PostGIS (+ pgRouting)** + **Redis** (cache/session).  
5. **Routing:** Dijkstra veya A*; eğim zaten edge cost’ta (maliyet_uv/maliyet_vu). Çoklu rota için 3 ayrı maliyet sütunu ile 3 sorgu veya k-shortest.  
6. **Cost function:** Mevcut asimetrik formül (K_YUKARI / K_ASAGI) uygun; kişiselleştirme için kullanıcı katsayıları eklenebilir.

İlk somut adım: GPKG’yi PostGIS’e aktarıp `pgr_dijkstra` ile tek rota üretmek **veya** Java + JGraphT ile aynı grafi okuyup tek endpoint’ten polyline döndürmek. Ardından 3 preference (easiest, balanced, fastest) için 3 maliyet sütunu ekleyip `/v1/routes` cevabını yukarıdaki formata getirmek.
