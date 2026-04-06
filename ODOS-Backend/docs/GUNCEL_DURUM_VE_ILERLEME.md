# ODOS — Güncel Durum ve İlerleme Raporu (2026-04)

Bu doküman, proposal’daki hedefleri (CMPE_IAR3) **mevcut ürün** (backend + mobil) üzerinden yeniden özetler: “ne yaptık, neyi neden değiştirdik, sıradaki mantıklı adım ne?”.

Kapsam: **yürüyüş odaklı rota planlama + navigasyon**, eğim/yükselti metrikleri, performans ve UX. (Sosyal/leaderboard gibi WP IV–V işleri bu projede **çekirdek rotaya göre düşük öncelik** kabul edildi.)

---

## 1) Proposal hedefleri → bugünkü ürünün kısa özeti

| Başlık | Proposal | Şu an (özet) |
|---|---|---|
| Veri | OSM yaya ağı + DEM, segment bazlı eğim | **Var**: GPKG → PostGIS → backend graf |
| Maliyet | Tobler, (opsiyonel Naismith) | **Var**: Tobler-türevi kenar maliyeti + profillere göre ceza terimleri |
| Algoritma | A* / Dijkstra / (bidirectional) + performans | **Var**: A* (optimizasyonlar + hızlı snap); Dijkstra/bidirectional **yok** (raporda gerekçelendirilebilir) |
| Ürün UI | Çoklu rota, yükselti profili, eğim renkleri, navigasyon | **Var**: çoklu rota + interaktif profil↔harita + eğim renkli çizim + navigasyon (off-route + reroute + canlı ETA) |
| Değerlendirme | RQ1–RQ5: karşılaştırma/benchmark + kullanıcı testi | **Kısmi**: otomatik ölçüm/anket paketi henüz standardize edilmedi |

---

## 2) Veri hattı ve graf

### 2.1 Ön işleme (OSM + DEM)

- **DEM örnekleme + eğim türetme**: segment bazlı işleme ile “node başı gürültü” azaltılıyor.
- **Asimetrik maliyet**: `u→v` ve `v→u` yönüne göre maliyet (tırmanış/iniş farkı) destekleniyor.

### 2.2 PostGIS ve yükleme

- **`scripts/load_gpkg_to_postgres.py`** ile `nodes`/`edges` PostGIS’e alınıyor.
- Backend grafı açılışta DB’den okuyor; bunun üzerine route hesaplıyor.

### 2.3 Bellek / performans notu (bugünkü gerçek trade-off)

- Başlangıçta tüm kenar geometrisini belleğe almak RAM’i büyütüyor.
- Bu yüzden varsayılan olarak geometri yükleme **kapalı**; bu, çizgilerin “daha köşeli” görünmesine yol açabiliyor.
- **Şu anki en büyük teknik kalan iş**: “geometriyi startup’ta değil, rota bulunduğunda sadece rota kenarları için DB’den çek” (bkz. Roadmap).

---

## 3) Backend (`odos-backend`) — mevcut durum

### 3.1 Rota API’si ve profiller

- **`GET /v1/routes`**: bir başlangıç–bitiş için birden çok rota varyantı döndürür.
- **Profil yaklaşımı**:
  - **SHORTEST**: `lengthM` üzerinden (baseline / klasik “en kısa mesafe”).
  - **BALANCED / EASIEST**: Tobler ve yükselti cezalarıyla “daha yürünebilir” alternatifler.

### 3.2 Süre / metrikler

- **Süre**: Tobler “relative cost” modelinden **dakika** türetiliyor (kalibrasyon net).
- **Tırmanış/iniş**: profil üretiminde blok bazlı yaklaşım ile daha stabil toplamlar.
- **Eğim metrikleri**: ortalama eğim gibi kullanıcıya anlamlı metrikler UI’da gösterilecek biçimde üretiliyor (aşırı uç “tepe eğim” değerleri kullanıcı geri bildirimiyle gizlendi).

### 3.3 Performans ve doğruluk iyileştirmeleri

- **Snap (en yakın node)**: `NodeSpatialIndex` ile hızlı nearest-node (fallback olarak lineer tarama).
- **A***: heuristik hesapları için cache + stale queue girişleriyle daha sağlam yürüyüş.

### 3.4 Harita ve navigasyon için “mühendislik doğru” veri

- **`shapePoints`**: rota boyunca kümülatif mesafe (km) + lat/lon listesi.
  - Profil üzerindeki mesafe → harita üzerindeki nokta eşlemesi artık “yaklaşık değil”.
  - Navigasyonda ilerleme hesabı (projeksiyon) ve ETA da bu veriyle daha tutarlı.
- **`slopePolylineChunks`**: eğim gürültüsünü azaltmak için kenarları bloklayarak “segment/çunk” bazlı polyline + ortalama mutlak eğim.

---

## 4) Mobil (`ODOS` — Expo / React Native) — mevcut durum

### 4.1 Çoklu rota + kartlar

- Birden fazla rota varyantı listeleniyor; **seçim** ile haritada vurgulama yapılıyor.
- Kart metrikleri: mesafe, süre, tırmanış, kalori ve **ortalama eğim** (kullanıcı geri bildirimiyle seçildi).

### 4.2 Eğim renkli çizim (segment bazlı)

- Rota, tek renk yerine **chunk bazlı** renklendiriliyor (yeşil→sarı→kırmızı geçişleri).
- iOS’ta Google provider ile `strokeColor` tutarsızlığı görüldüğü için, iOS’ta **Apple MapKit**, Android’de **Google** kullanımı ile daha stabil render hedeflendi.

### 4.3 Profil ↔ harita senkronu (ileri seviye)

- Profil üzerinde seçilen mesafe, `shapePoints` üzerinden haritada doğru konuma marker koyuyor.
- Seçime göre harita otomatik odaklanıyor.

### 4.4 Navigasyon (ileri seviye)

- Rota geometrisinden talimat üretimi (yumuşatma/merge mantığı ile “zigzag spam” azaltma).
- Kullanıcı konumu rotaya projekte edilerek ilerleme yüzdesi çıkarılıyor.
- **Off-route algılama** + otomatik **reroute** + **canlı ETA**.

---

## 5) Proposal “vaat → durum” (bitirme raporuna hazır tablo)

| Madde | Durum | Not |
|---|---|---|
| OSM + DEM entegrasyonu | **Tamam** | GPKG + PostGIS hattı |
| Tobler tabanlı maliyet | **Tamam** | Süre hesabı dakikaya oturtuldu |
| “En kısa” baseline | **Tamam** | SHORTEST profili |
| A* ile performanslı routing | **Tamam** | Snap index + cache |
| Çoklu rota + kartlar | **Tamam** | Mobilde canlı |
| Yükselti profili | **Tamam** | Segment blok yaklaşımı |
| Profil↔harita | **Tamam (ileri)** | `shapePoints` ile doğru eşleme |
| Eğim renkli polyline | **Tamam** | Chunk bazlı renklendirme |
| Turn-by-turn + navigasyon | **Tamam (ileri)** | Off-route + reroute + ETA |
| Dijkstra / bidirectional / C++ | **Yapılmadı** | Kapsam/öncelik gerekçesi yazılabilir |
| Naismith runtime karşılaştırma | **Yapılmadı** | Opsiyonel, raporda “gelecek iş” |
| Kullanıcı testi / ölçüm paketi | **Kısmi** | Roadmap’te standardize edilecek |
| Sosyal / leaderboard | **Kapsam dışı** | Çekirdek rota önceliklendirildi |

---

## 6) Bugün için en kritik açık konu

**Harita çizgisi “yol geometrisi gibi” görünmüyor** geri bildirimi, doğrudan şu trade-off’a bağlı:

- Geometri yükleme kapalıyken: çizim node-to-node → daha köşeli
- Geometri yükleme açıkken: çizim çok doğru → RAM artar

Bu yüzden bir sonraki teknik hedef: **rota bulunduğunda sadece o rotanın kenar geometrisini DB’den çekip** `coordinates/shapePoints/slopeChunks` üretmek (RAM şişmeden doğruluk).
