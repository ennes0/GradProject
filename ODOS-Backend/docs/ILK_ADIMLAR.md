# ODOS Backend — İlk Adımlar

**Şu anda ilk yapmanız gereken:** Eğim-maliyetli graftan **tek bir rota** hesaplayıp **REST API** ile döndürmek.

> **Graf v2 hazırsa:** Proje kökünde `route_from_gpkg.py` ile rota hesaplamayı test edin; ardından aynı mantığı PostGIS veya REST endpoint’e taşıyın. Böylece mobil uygulama gerçek backend’e bağlanabilir; sonra çoklu rota ve kişiselleştirme eklenir.

---

## Önerilen sıra

### 1. Graph’ı erişilebilir hale getirin (1–2 gün)

**Seçenek A — PostGIS (hızlı prototip, SQL ile rota)**

- PostgreSQL’e PostGIS + pgRouting extension’larını ekleyin.
- `istanbul_avrupa_asimetrik_graf.gpkg` içindeki **nodes** ve **edges** katmanlarını PostGIS tablolarına aktarın (ogr2ogr veya GeoPandas ile).
- Edge tablosunda sütunlar: `source`, `target`, `length`, `cost_forward` (= maliyet_uv), `cost_backward` (= maliyet_vu), `geom`.
- Spatial index: `CREATE INDEX ON edges USING GIST(geom);`

**Seçenek B — In-memory (Java/Python)**

- Uygulama başlarken GPKG’yi okuyup nodes/edges’i bellekte tutun.
- Java: JGraphT (graph) + JTS (geometri, spatial index).
- Python: NetworkX veya Shapely + basit dict/list graph; geometri için Shapely.

**Öneri:** Zaten Python ve GeoPandas kullanıyorsanız, **önce Seçenek A (PostGIS)** ile ilerleyin; pgRouting ile rota tek SQL çağrısı. Sonra isterseniz Java in-memory’e geçersiniz.

---

### 2. Snap: (lat, lon) → graph düğümü (0.5–1 gün)

- İstekte gelen `origin` ve `destination` koordinatları graf üzerinde bir düğüme (veya en yakın edge’e) “snap” edilmeli.
- **PostGIS:** `ST_ClosestPoint` + nodes tablosu veya `ST_DWithin` ile aday düğümleri alıp en yakını seçin.
- **In-memory:** JTS STR-tree veya Shapely ile tüm node noktalarından en yakınını bulun (veya R-tree).
- Çıktı: `origin_node_id`, `destination_node_id` (veya edge id + projeksiyon).

---

### 3. Tek shortest path (1–2 gün)

- **PostGIS/pgRouting:** `pgr_dijkstra` veya `pgr_a*`; maliyet sütunu = `cost_forward`.
- **In-memory:** JGraphT Dijkstra veya A*; edge weight = `maliyet_uv`.
- Çıktı: Sıralı edge listesi → her edge’in geometrisini birleştir → tek polyline (lat/lon dizisi).
- Toplam maliyet → tahmini süre: örn. `duration_min = toplam_maliyet / (sabit_veya_ortalama_hiz)`; toplam tırmanış edge’lerdeki yükseklik bilgisinden.

---

### 4. REST endpoint (1 gün)

- **Endpoint:** `GET /v1/route?origin=41.037,28.985&destination=41.025,28.974`
- **Cevap (örnek):**
  ```json
  {
    "coordinates": [[41.037, 28.985], [41.036, 28.984], ...],
    "distance_km": 2.4,
    "duration_min": 18,
    "total_climb_m": 45,
    "elevation_profile": [{ "distance_m": 0, "elevation_m": 10 }, ...]
  }
  ```
- Dil: PostGIS kullanıyorsanız Python (FastAPI/Flask) veya Node; Java kullanıyorsanız Spring Boot.

---

### 5. Mobil uygulamayı bu API’ye bağlayın (0.5–1 gün)

- Şu an MapScreen’de Google Directions API veya fallback kullanılıyor. Origin/destination seçildiğinde **kendi backend’inize** istek atın (`/v1/route`).
- Dönen `coordinates` ile haritada polyline çizin; `duration_min`, `total_climb_m` vb. ile RouteSelectionModal’da tek kart (veya ileride 3 rota) gösterin.

---

## Özet checklist

| # | Adım | Tahmini süre |
|---|------|----------------|
| 1 | Graph’ı PostGIS’e (veya in-memory) yükleyin | 1–2 gün |
| 2 | Snap: koordinat → node id | 0.5–1 gün |
| 3 | Dijkstra/A* ile tek rota, polyline çıktı | 1–2 gün |
| 4 | GET /v1/route endpoint’i | 1 gün |
| 5 | Mobil uygulamada bu API’yi kullanın | 0.5–1 gün |

**Toplam:** yaklaşık 1–2 hafta (part-time çalışılsa bile).

Bu tamamlandığında “eğim-duyarlı tek rota API’niz” çalışır. Sonrasında Faz 2: 3 maliyet, 3 rota, `GET /v1/routes` (bkz. [TECHNICAL_ROADMAP.md](TECHNICAL_ROADMAP.md) ve [DETAYLI_OZET_VE_ONERILER.md](DETAYLI_OZET_VE_ONERILER.md)).
