# ODOS — Sonraki Adımlar Roadmap’i (2026-04)

Bu roadmap, [GUNCEL_DURUM_VE_ILERLEME.md](GUNCEL_DURUM_VE_ILERLEME.md) ile uyumlu şekilde “bugün ürün nerede?” sorusundan hareketle **en çok değer üreten** sonraki işleri sıralar.

Önemli not: Proposal’da yazan her şeyi yapmaya çalışmak yerine, **bu projeye mantıklı olan** (çekirdek routing doğruluğu, performans, demo kalitesi, raporlanabilir değerlendirme) işler öne alınmıştır.

---

## 0) Öncelik ilkeleri

- **Doğruluk**: rota geometrisi ve metrikler kullanıcının gördüğüyle uyumlu olmalı.
- **Performans**: RAM’i şişirmeden düşük gecikme.
- **Demo / rapor**: ölçülebilir sonuç tablosu + tekrar edilebilir test akışı.
- **Kapsam disiplini**: sosyal/leaderboard gibi modüller “nice-to-have”.

---

## Faz 1 — “Gerçek yol geometrisi” (RAM şişmeden) (en kritik)

Problem: Geometri yükleme kapalıyken polyline köşeli; açıkken RAM artıyor. En iyi çözüm:

### 1.1 Rota-bazlı geometri çekme (on-demand)

- **Amaç**: A* path (edge/fid listesi) bulunduğunda **sadece o kenarların** `geom`’unu DB’den çekmek.
- **Çıktı**:
  - `RouteResponse.coordinates` gerçek yol geometrisine göre dolsun
  - `shapePoints` ve `slopePolylineChunks` bu geometri üzerinden üretildiği için profil/navigasyon daha da tutarlı olsun
- **Teknik notlar**:
  - Büyük `IN (...)` listeleri için parça parça sorgu veya `UNNEST` ile join
  - `ST_AsText` yerine mümkünse `ST_AsGeoJSON` ile parse kolaylığı (veya WKT parser’ı)
  - Cache opsiyonu: `(fid -> geom)` için LRU (sadece sıcak kenarlar)

### 1.2 Geometri stratejisi seçimi (config)

- `odos.graph.load-edge-geometry`:
  - **false**: startup hızlı, RAM düşük, on-demand devrede
  - **true**: offline/benchmark için “tam doğruluk” modu

---

## Faz 2 — Güvenli deploy + gerçek cihaz testi

### 2.1 Secrets ve config

- DB şifreleri repodan çıkar, sadece env var.
- Mobilde API base URL için ortam bazlı config (`dev/staging/prod`).

### 2.2 Deploy hedefi (ücretsiz/kolay)

- Backend için: ücretsiz/ucuz bir PaaS ya da VM (Postgres + app birlikte düşünülmeli).
- Minimum: sağlık endpoint + basit rate limit + loglar.

---

## Faz 3 — Değerlendirme paketi (bitirme raporu için “sonuç üret”)

### 3.1 Otomatik kıyas tablosu (RQ3/RQ4)

- Aynı O–D seti için: **SHORTEST vs BALANCED vs EASIEST**
- Çıktı tablo: mesafe, süre, tırmanış, ort. eğim, kalori, (opsiyonel) hesaplama süresi.

### 3.2 Performans ölçümü (hafif)

- İstek başına:
  - graph size (node/edge)
  - route compute time (ms)
  - memory snapshot (opsiyonel)

---

## Faz 4 — Veri kalitesi (eğim “saçmalamasın”)

- Çok kısa segmentlerde yüksek eğim oranlarını bastırmak için:
  - minimum segment uzunluğu eşiği
  - robust smoothing / winsorizing (percentile cap)
  - UI’da “tepe eğim” yerine daha güvenli metrikler (zaten bu yönde ilerledik)

---

## Faz 5 — UX cilası (zaten güçlü, ama demo kalitesini artırır)

- Navigasyonda:
  - talimat metinlerini Türkçe daha doğal hale getirme
  - reroute cooldown / eşiklerin ayarı (şehir içi vs parkur)
- Erişilebilirlik:
  - renk körlüğü için alternatif gösterim (desen / stroke style)

---

## “Yapıldı” olarak kapanan büyük maddeler (referans)

- Eğim renkli polyline (chunk bazlı)
- Profil ↔ harita (ileri; `shapePoints`)
- Navigasyon (ileri; projeksiyon, off-route, reroute, canlı ETA)
- Snap performansı (spatial index)
- Süre modelinin Tobler’dan dakikaya oturtulması

---

## Sunum öncesi hızlı kontrol listesi

- [ ] Gerçek cihazda rota çizgisi “yol gibi” görünüyor (Faz 1 tamam).
- [ ] iOS/Android’da renkli chunk polyline tutarlı.
- [ ] 5–10 O–D ile otomatik kıyas tablosu çıktısı alındı (rapora konabilir).
- [ ] Deploy edilmiş backend ile dışarıda (wifi yokken) test edildi.
