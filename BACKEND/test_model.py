import joblib, json
import numpy as np
import pandas as pd
import rasterio
import requests
import time
import os

SAVE_DIR = os.path.join(os.path.dirname(__file__), "model")

print("Loading models from:", SAVE_DIR)

model_v3 = joblib.load(os.path.join(SAVE_DIR, "model_v3_susceptibility.joblib"))
try:
    with open(os.path.join(SAVE_DIR, "model_v3_feature_cols.json")) as f:
        feature_cols_v3 = json.load(f)
    print("Loaded model_v3, features:", feature_cols_v3)
except Exception as e:
    print("Could not load model_v3_feature_cols.json:", e)

model_trigger = joblib.load(os.path.join(SAVE_DIR, "model_trigger.joblib"))
try:
    with open(os.path.join(SAVE_DIR, "model_trigger_feature_cols.json")) as f:
        feature_cols_trigger = json.load(f)
    print("Loaded model_trigger, features:", feature_cols_trigger)
except Exception as e:
    print("Could not load model_trigger_feature_cols.json:", e)


def tile_url(lat, lon):
    lat_tag = f"N{int(np.floor(lat)):02d}" if lat >= 0 else f"S{abs(int(np.floor(lat))):02d}"
    lon_tag = f"E{int(np.floor(lon)):03d}" if lon >= 0 else f"W{abs(int(np.floor(lon))):03d}"
    name = f"Copernicus_DSM_COG_10_{lat_tag}_00_{lon_tag}_00_DEM"
    return f"/vsicurl/https://copernicus-dem-30m.s3.amazonaws.com/{name}/{name}.tif"

def get_terrain_features(lat, lon, src, px_size_m_y, px_size_m_x):
    row_idx, col_idx = src.index(lon, lat)
    window = rasterio.windows.Window(col_idx - 1, row_idx - 1, 3, 3)
    data = src.read(1, window=window).astype(float)
    if data.shape != (3, 3) or np.any(data == src.nodata):
        return np.nan, np.nan, np.nan
    dz_dy, dz_dx = np.gradient(data, px_size_m_y, px_size_m_x)
    dzdx_c, dzdy_c = dz_dx[1, 1], dz_dy[1, 1]
    slope_deg = np.degrees(np.arctan(np.sqrt(dzdx_c**2 + dzdy_c**2)))
    aspect_deg = (np.degrees(np.arctan2(dzdy_c, -dzdx_c)) + 360) % 360
    laplacian = (data[0,1]+data[2,1]+data[1,0]+data[1,2]-4*data[1,1]) / (px_size_m_x*px_size_m_y)
    return slope_deg, aspect_deg, laplacian

def get_geomorphometric_features(lat, lon, src, cell_size_m, window_size=5):
    row_idx, col_idx = src.index(lon, lat)
    half = window_size // 2
    window = rasterio.windows.Window(col_idx - half, row_idx - half, window_size, window_size)
    data = src.read(1, window=window).astype(float)
    if data.shape != (window_size, window_size) or np.any(data == src.nodata):
        return np.nan, np.nan, np.nan, np.nan
    relief_amplitude = np.nanmax(data) - np.nanmin(data)
    roughness = np.nanstd(data)
    c = half
    z1,z2,z3 = data[c-1,c-1], data[c-1,c], data[c-1,c+1]
    z4,z5,z6 = data[c,c-1],   data[c,c],   data[c,c+1]
    z7,z8,z9 = data[c+1,c-1], data[c+1,c], data[c+1,c+1]
    L = cell_size_m
    fx = (z3+z6+z9-z1-z4-z7)/(6*L)
    fy = (z1+z2+z3-z7-z8-z9)/(6*L)
    fxx = (z1+z3+z4+z6+z7+z9-2*(z2+z5+z8))/(3*L**2)
    fyy = (z1+z2+z3+z7+z8+z9-2*(z4+z5+z6))/(3*L**2)
    fxy = (z3+z7-z1-z9)/(4*L**2)
    denom = fx**2 + fy**2
    if denom < 1e-9:
        profile_curv, plan_curv = 0.0, 0.0
    else:
        profile_curv = -2*(fxx*fx**2 + 2*fxy*fx*fy + fyy*fy**2)/denom
        plan_curv = 2*(fxx*fy**2 - 2*fxy*fx*fy + fyy*fx**2)/denom
    return relief_amplitude, roughness, plan_curv, profile_curv

RAINFALL_WINDOWS = [1, 3, 7, 15, 30]

def fetch_antecedent_rainfall(lat, lon, event_date, max_window=30, retries=3):
    start = (event_date - pd.Timedelta(days=max_window)).strftime("%Y%m%d")
    end = event_date.strftime("%Y%m%d")
    for attempt in range(retries):
        try:
            r = requests.get(
                "https://power.larc.nasa.gov/api/temporal/daily/point",
                params={"parameters": "PRECTOTCORR", "community": "AG",
                        "longitude": lon, "latitude": lat,
                        "start": start, "end": end, "format": "JSON"},
                timeout=30,
            )
            r.raise_for_status()
            data = r.json()["properties"]["parameter"]["PRECTOTCORR"]
            series = pd.Series(data).sort_index().replace(-999.0, np.nan)
            return {f"rain_{w}d": series.tail(w).sum(skipna=True) for w in RAINFALL_WINDOWS}
        except Exception as e:
            if attempt == retries - 1:
                print(f"Rainfall fetch failed: {e}")
                return {f"rain_{w}d": np.nan for w in RAINFALL_WINDOWS}
            time.sleep(1.5)

def to_modis_date(d):
    return f"A{d.year}{d.timetuple().tm_yday:03d}"

def fetch_ndvi(lat, lon, event_date, lookback_days=40, retries=3):
    start = to_modis_date(event_date - pd.Timedelta(days=lookback_days))
    end = to_modis_date(event_date)
    for attempt in range(retries):
        try:
            r = requests.get(
                "https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset",
                params={"latitude": lat, "longitude": lon,
                        "startDate": start, "endDate": end,
                        "kmAboveBelow": 0, "kmLeftRight": 0},
                timeout=30,
            )
            r.raise_for_status()
            subset = r.json().get("subset", [])
            ndvi_rows = [row for row in subset if row["band"] == "250m_16_days_NDVI"]
            if not ndvi_rows:
                return {"ndvi": np.nan, "ndvi_date": None}
            latest = ndvi_rows[-1]
            return {"ndvi": latest["data"][0] / 10000.0, "ndvi_date": latest["calendar_date"]}
        except Exception as e:
            if attempt == retries - 1:
                print(f"NDVI fetch failed: {e}")
                return {"ndvi": np.nan, "ndvi_date": None}
            time.sleep(1.5)

def get_susceptibility_features(lat, lon):
    """Pull the 9 static terrain features model_v3 expects, for one point."""
    lat_t, lon_t = int(np.floor(lat)), int(np.floor(lon))
    url = tile_url(lat_t, lon_t)
    with rasterio.open(url) as src:
        px_size_deg = src.transform[0]
        px_size_m_y = px_size_deg * 111000
        px_size_m_x = px_size_deg * 111000 * np.cos(np.radians(lat))
        cell_size_m = (px_size_m_x + px_size_m_y) / 2

        elevation = list(src.sample([(lon, lat)]))[0][0]
        slope_deg, aspect_deg, curvature = get_terrain_features(
            lat, lon, src, px_size_m_y, px_size_m_x
        )
        relief_amp, roughness, plan_curv, profile_curv = get_geomorphometric_features(
            lat, lon, src, cell_size_m, window_size=5
        )

    return {
        "elevation": elevation,
        "slope_deg": slope_deg,
        "aspect_sin": np.sin(np.radians(aspect_deg)),
        "aspect_cos": np.cos(np.radians(aspect_deg)),
        "curvature": curvature,
        "relief_amplitude": relief_amp,
        "roughness": roughness,
        "plan_curvature": plan_curv,
        "profile_curvature": profile_curv,
    }

def get_trigger_features(lat, lon, event_date, elevation=None):
    """Pull the 7 features model_trigger expects: elevation, rain windows, NDVI."""
    if elevation is None:
        lat_t, lon_t = int(np.floor(lat)), int(np.floor(lon))
        url = tile_url(lat_t, lon_t)
        with rasterio.open(url) as src:
            elevation = list(src.sample([(lon, lat)]))[0][0]

    rain = fetch_antecedent_rainfall(lat, lon, event_date)
    ndvi_feats = fetch_ndvi(lat, lon, event_date)

    return {
        "elevation_m": elevation,
        "rain_1d": rain["rain_1d"],
        "rain_3d": rain["rain_3d"],
        "rain_7d": rain["rain_7d"],
        "rain_15d": rain["rain_15d"],
        "rain_30d": rain["rain_30d"],
        "ndvi": ndvi_feats.get("ndvi", np.nan),
    }

def combined_risk(lat, lon, event_date):
    susc_feats = get_susceptibility_features(lat, lon)
    susc_cols = ["elevation", "slope_deg", "aspect_sin", "aspect_cos", "curvature",
                 "relief_amplitude", "roughness"]
    susc_X = np.array([[susc_feats[c] for c in susc_cols]])
    susc_prob = model_v3.predict_proba(susc_X)[0, 1]

    trig_feats = get_trigger_features(lat, lon, event_date, elevation=susc_feats["elevation"])
    trig_cols = ["elevation_m", "rain_1d", "rain_3d", "rain_7d", "rain_15d", "rain_30d", "ndvi"]
    trig_X = np.array([[trig_feats[c] for c in trig_cols]])
    trig_prob = model_trigger.predict_proba(trig_X)[0, 1]

    return {
        "susceptibility": round(float(susc_prob), 4),
        "trigger": round(float(trig_prob), 4),
        "combined_risk": round(float(susc_prob * trig_prob), 4),
    }

if __name__ == "__main__":
    test_points = [
        ("Known landslide-prone (Sikkim hills)", 27.33, 88.61),
    ]
    event_date = pd.Timestamp.today().normalize()

    for name, lat, lon in test_points:
        print("Testing point:", name, lat, lon)
        try:
            res = combined_risk(lat, lon, event_date)
            print("Result:", res)
        except Exception as e:
            print("Failed to run combined_risk:", e)
