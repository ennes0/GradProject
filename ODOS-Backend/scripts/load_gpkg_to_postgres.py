"""
GPKG (nodes + edges) içeriğini PostgreSQL/PostGIS veritabanına yükler.

Kullanım:
  1. PostgreSQL + PostGIS kurulu ve odos_routing veritabanı + tablolar oluşturulmuş olmalı.
  2. Bağlantı: ortam değişkeni ODOS_DB_URL veya aşağıdaki varsayılan.
  3. Çalıştır: python scripts/load_gpkg_to_postgres.py

Bağlantı örneği: postgresql://postgres:SIFRE@localhost:5432/odos_routing

Gerekli: pip install geopandas geoalchemy2 sqlalchemy psycopg2-binary
"""

import os
import sys

# Proje kökü (ODOS-Backend)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SCRIPT_DIR)
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

import geopandas as gpd
import pandas as pd
import numpy as np

# Bağlantı: ODOS_DB_URL kullan veya varsayılan (şifreyi kendin yaz)
DATABASE_URL = os.environ.get(
    "ODOS_DB_URL",
    "postgresql://postgres:179492@localhost:5432/odos_routing"
)

GPKG_PATH = os.path.join(ROOT, "graphRelatedFiles/istanbul_avrupa_asimetrik_graf_v5.gpkg")


def main():
    if not os.path.isfile(GPKG_PATH):
        print(f"HATA: GPKG bulunamadı: {GPKG_PATH}")
        return 1

    try:
        from sqlalchemy import create_engine
        from geoalchemy2 import Geometry
    except ImportError:
        print("Gerekli paketler: pip install geoalchemy2 sqlalchemy geopandas psycopg2-binary")
        return 1

    print("GPKG okunuyor...")
    nodes = gpd.read_file(GPKG_PATH, layer="nodes")
    edges = gpd.read_file(GPKG_PATH, layer="edges")

    # Sütun adları Postgres tarafına uyumlu olsun
    if nodes.geometry.name != "geom":
        nodes = nodes.rename(columns={nodes.geometry.name: "geom"}).set_geometry("geom")

    # Edges: Konum bazlı kopya (iloc) — index/FID hizası u,v'yi kaydırmasın
    n = len(edges)
    def _col_values(df, candidates, default_val=0.0):
        for name in candidates:
            if name in df.columns:
                return df[name].values
        return np.full(n, default_val, dtype=float)

    def _fid_values(edf):
        if "fid" in edf.columns:
            return edf["fid"].values
        # GPKG bazen FID'yi index yapar, sütun olmaz
        return edf.index.values.astype(np.int64)

    edges_out = pd.DataFrame()
    edges_out["fid"] = _fid_values(edges)
    edges_out["u"] = edges["u"].values
    edges_out["v"] = edges["v"].values
    edges_out["length"] = edges["length"].values
    edges_out["maliyet_uv"] = edges["maliyet_uv"].values
    edges_out["maliyet_vu"] = edges["maliyet_vu"].values
    edges_out["egim_orani_mutlak"] = _col_values(edges, ["egim_orani_mutlak"], 0.0)
    edges_out["toplam_uv_yukari_egim_orani"] = _col_values(
        edges, ["toplam_uv_yukari_egim_orani", "toplam_uv_yukarı_egim_orani"], 0.0
    )
    edges_out["toplam_uv_asagi_egim_orani"] = _col_values(
        edges, ["toplam_uv_asagi_egim_orani", "toplam_uv_aşağı_egim_orani"], 0.0
    )
    edges_out["toplam_uv_yukari_segment_uzunlugu"] = _col_values(
        edges,
        ["toplam_uv_yukari_segment_uzunlugu", "toplam_uv_yukarı_segment_uzunlugu"],
        0.0,
    )
    edges_out["toplam_uv_asagi_segment_uzunlugu"] = _col_values(
        edges,
        ["toplam_uv_asagi_segment_uzunlugu", "toplam_uv_aşağı_segment_uzunlugu"],
        0.0,
    )
    edges_out["mean_grade"] = _col_values(edges, ["mean_grade"], 0.0)
    edges_out["mean_absolute_grade"] = _col_values(edges, ["mean_absolute_grade"], 0.0)
    edges_out["total_ascent"] = _col_values(edges, ["total_ascent"], 0.0)
    edges_out["total_descent"] = _col_values(edges, ["total_descent"], 0.0)
    edges_out["segment_slope_signed"] = _col_values(edges, ["segment_slope_signed"], 0.0)
    edges_out["segment_slope_absolute"] = _col_values(edges, ["segment_slope_absolute"], 0.0)
    edges_out["geom"] = edges.geometry.values

    nodes_gdf = gpd.GeoDataFrame(nodes, geometry="geom", crs=nodes.crs)
    edges_gdf = gpd.GeoDataFrame(edges_out, geometry="geom", crs=edges.crs)

    # Doğrulama: GPKG'de fid=401288 satırı (varsa) u,v,length ile logla
    mask = edges_out["fid"] == 401288
    if mask.any():
        r = edges_out.loc[mask].iloc[0]
        print(f"  [GPKG] fid=401288 -> u={r['u']}, v={r['v']}, length={r['length']:.4f}")

    print("PostgreSQL'e bağlanılıyor...")
    engine = create_engine(DATABASE_URL)

    print("nodes yazılıyor...")
    nodes_gdf.to_postgis("nodes", engine, if_exists="replace", index=False)
    print("edges yazılıyor...")
    edges_gdf.to_postgis("edges", engine, if_exists="replace", index=False)

    print("Bitti.")
    print(f"  nodes: {len(nodes_gdf)}")
    print(f"  edges: {len(edges_gdf)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
