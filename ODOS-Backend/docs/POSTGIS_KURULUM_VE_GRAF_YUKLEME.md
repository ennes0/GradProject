# PostGIS Kurulumu ve Graf Yükleme Rehberi

Bu rehber: PostgreSQL kurulumu → PostGIS etkinleştirme → GPKG grafını Postgres’e yükleme. Sonrasında C++/Java routing servisi bu veriyi okuyup kullanacak.

---

## 1. PostgreSQL Kurulumu (Windows)

### 1.1 İndir ve kur

1. **İndir:** https://www.postgresql.org/download/windows/  
   - “Download the installer” → PostgreSQL 16 veya 15 seç.
2. **Çalıştır:** Kurulumda:
   - **Password:** postgres kullanıcısı için bir şifre belirle (örn. `postgres123`) — unutma, lazım olacak.
   - **Port:** 5432 (varsayılan) bırak.
   - “Stack Builder” ile devam etme seçeneği gelirse atlayabilirsin; PostGIS’i aşağıda ayrı ekleyeceğiz.
3. Kurulum bitince **pgAdmin 4** veya **psql** (Command Line Tools) kurulu olur. Path’e eklenmiş olur: `C:\Program Files\PostgreSQL\16\bin` (sürüm numarası değişebilir).

### 1.2 Kontrol

PowerShell veya CMD:

```bash
psql -U postgres -c "SELECT version();"
```

Şifre sorar; doğru şifreyle PostgreSQL sürümü yazılıyorsa kurulum tamam.

---

## 2. PostGIS Extension’ı Etkinleştirme

PostgreSQL ile gelen “PostGIS” paketi yoksa önce onu kurman gerekir; çoğu Windows installer’da “PostGIS” seçeneği vardır. Kurmadıysan:

- **Yeniden kur:** Installer’ı tekrar çalıştırıp “Add/Remove components” → PostGIS işaretle, **veya**
- **PostGIS’i ayrı indir:** https://postgis.net/windows_downloads/ — PostgreSQL sürümüne uyumlu olanı seç (örn. PostgreSQL 16).

Sonra veritabanında extension’ı aç:

```bash
psql -U postgres -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```

Veya pgAdmin’den: sol ağaçtan bir veritabanı seç (örn. `postgres`) → Query Tool → şunu çalıştır:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

Kontrol:

```sql
SELECT PostGIS_Version();
```

Sürüm dönüyorsa PostGIS hazır.

---

## 3. ODOS İçin Veritabanı ve Tablolar

### 3.1 Veritabanı oluştur

```bash
psql -U postgres -c "CREATE DATABASE odos_routing ENCODING 'UTF8';"
```

### 3.2 Bağlan ve tabloları oluştur

```bash
psql -U postgres -d odos_routing
```

Aşağıdaki SQL’i çalıştır (tek seferde yapıştırabilirsin):

```sql
-- Nodes: düğümler (kavşaklar + bölünmüş ara noktalar)
CREATE TABLE nodes (
  id        BIGSERIAL PRIMARY KEY,
  osmid     BIGINT NOT NULL UNIQUE,
  geom      GEOMETRY(Point, 4326),
  rakim     NUMERIC(10,2) DEFAULT 0
);
CREATE INDEX idx_nodes_geom ON nodes USING GIST(geom);
CREATE INDEX idx_nodes_osmid ON nodes(osmid);

-- Edges: kenarlar (yönlü; u -> v)
CREATE TABLE edges (
  id         BIGSERIAL PRIMARY KEY,
  u          BIGINT NOT NULL,
  v          BIGINT NOT NULL,
  length     NUMERIC(12,4) NOT NULL,
  cost_forward   NUMERIC(12,4) NOT NULL,
  cost_backward  NUMERIC(12,4) NOT NULL,
  geom       GEOMETRY(LineString, 4326),
  -- Ham eğim (C++/Java’da katsayı ile maliyet hesaplamak için)
  toplam_uv_yukari_egim_orani  NUMERIC(12,6) DEFAULT 0,
  toplam_uv_asagi_egim_orani   NUMERIC(12,6) DEFAULT 0
);
CREATE INDEX idx_edges_uv ON edges(u, v);
CREATE INDEX idx_edges_geom ON edges USING GIST(geom);
```

Not: Sütun adlarında Türkçe karakter (ı, ş) sorun çıkarırsa `toplam_uv_yukari_egim_orani` / `toplam_uv_asagi_egim_orani` kullan; GPKG’deki isimlerle eşleştirirken script’te bu isimlere bakabilirsin.

---

## 4. GPKG’yi Postgres’e Yükleme

İki yol var: **ogr2ogr** (önerilen) veya **Python script**.

### 4.1 Yol A: ogr2ogr (GDAL)

1. **GDAL kur:** https://gisinternals.com/ (Windows) veya `conda install gdal` / `choco install gdal`.
2. **GPKG’yi aktar:**

```bash
set PGPASSWORD=postgres123
ogr2ogr -f PostgreSQL "PG:host=localhost dbname=odos_routing user=postgres password=postgres123" ^
  istanbul_avrupa_asimetrik_graf_v2.gpkg ^
  -nln nodes nodes -overwrite
ogr2ogr -f PostgreSQL "PG:host=localhost dbname=odos_routing user=postgres password=postgres123" ^
  istanbul_avrupa_asimetrik_graf_v2.gpkg ^
  -nln edges edges -overwrite
```

Şifreyi kendi belirlediğinle değiştir. Linux/Mac’te `\` ile satır devam eder; `^` Windows CMD’de.

Eğer tabloları sen oluşturduysan ve ogr2ogr “table exists” hatası verirse, `-overwrite` kullanıyorsun; sütun isimleri GPKG ile aynı gelir. İlk kez açıyorsan tabloları ogr2ogr’ın oluşturmasına da bırakabilirsin; sonra gerekirse `cost_forward` / `cost_backward` ekleyip Python ile güncellersin.

### 4.2 Yol B: Python script (GeoPandas + SQLAlchemy)

Proje kökünde bir script: GPKG’yi okuyup `odos_routing` veritabanındaki `nodes` ve `edges` tablolarına yazar. Bağlantı bilgisini (host, dbname, user, password) kendine göre düzenle.

Örnek bağlantı: `postgresql://postgres:postgres123@localhost:5432/odos_routing`

Hazır script kullan:

```bash
# Şifreyi kendin ayarla (script içinde veya ortam değişkeni)
set ODOS_DB_URL=postgresql://postgres:SIFRE@localhost:5432/odos_routing
python scripts/load_gpkg_to_postgres.py
```

Script: `scripts/load_gpkg_to_postgres.py` — GPKG’yi okur, `nodes` ve `edges` tablolarına `if_exists='replace'` ile yazar. Tablolar yoksa oluşturur; varsa siler ve yeniden doldurur.

---

## 5. Veriyi Kontrol Etme

```sql
-- psql -U postgres -d odos_routing
SELECT 'nodes' AS tablo, count(*) FROM nodes
UNION ALL
SELECT 'edges', count(*) FROM edges;
```

Beklenti: nodes ~1.7M, edges ~1.8M (v2 graf).

```sql
SELECT u, v, length, cost_forward, cost_backward
FROM edges
LIMIT 5;
```

---

## 6. Sonraki Adım: C++ / Java Routing Servisi

PostGIS + PostgreSQL tarafı burada bitiyor: graf artık Postgres’te.

Yapılacaklar (genel sıra):

1. **C++ veya Java projesi** aç (örn. Spring Boot veya minimal C++ HTTP servisi).
2. **Açılışta:** Postgres’e bağlan; `SELECT osmid, ST_X(geom) as lon, ST_Y(geom) as lat, rakim FROM nodes` ve `SELECT u, v, cost_forward, cost_backward FROM edges` (veya ham eğim sütunları) çek; bellekte graf yapısı kur (adjacency list; cost = cost_forward / cost_backward veya katsayılarla hesaplanmış değer).
3. **Snap:** İstekte gelen (lat, lon) için en yakın düğümü bul (tüm noktaları yüklediysen in-memory spatial index veya ilk aşamada basit döngü).
4. **Rota:** Dijkstra (veya A*) ile başlangıç düğümünden hedef düğüme maliyet toplamı; path’i edge listesi olarak tut, geometriyi edges’ten veya path’teki node koordinatlarından birleştir.
5. **API:** HTTP `GET /route?origin=lat,lon&destination=lat,lon` → JSON (coordinates, distance_km, duration_min, total_climb_m).

Graf güncellemesi: GPKG’yi yeniden üretip yukarıdaki yükleme adımını tekrarlarsın; C++/Java servisi yeniden başlayıp grafı tekrar Postgres’ten (veya bir export dosyasından) okuyabilir.

---

## Özet Checklist

- [ ] PostgreSQL kur (Windows installer)
- [ ] PostGIS extension’ı kur ve `CREATE EXTENSION postgis;`
- [ ] `odos_routing` veritabanı ve `nodes` / `edges` tabloları
- [ ] GPKG → Postgres (ogr2ogr veya Python script)
- [ ] `SELECT count(*)` ile nodes/edges kontrol
- [ ] C++/Java: bağlantı string’i, graf yükleme, Dijkstra, HTTP API

İstersen bir sonraki adımda `load_gpkg_to_postgres.py` betiğini de yazabilirim; tek komutla yükleme yaparsın.
