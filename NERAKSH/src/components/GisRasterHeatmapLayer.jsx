import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

// Spatial index for fast grid cell lookup by tile bounds
function buildSpatialIndex(points, cellSizeDeg) {
  const index = {};
  const resolution = cellSizeDeg;
  points.forEach((p) => {
    const gx = Math.round(p.lon / resolution);
    const gy = Math.round(p.lat / resolution);
    const key = `${gx},${gy}`;
    index[key] = p;
  });
  return { index, resolution };
}

function getColorForScore(score) {
  // Lower alpha values for subtle overlay that doesn't block the base map
  if (score >= 0.75) return { r: 183, g: 28, b: 28, a: 160 };     // Very High - Crimson Red
  if (score >= 0.60) return { r: 226, g: 109, b: 64, a: 145 };    // High - Terracotta Orange
  if (score >= 0.40) return { r: 255, g: 243, b: 176, a: 120 };   // Moderate - Cream Yellow
  if (score >= 0.20) return { r: 135, g: 195, b: 75, a: 110 };    // Low - Sage Green
  return { r: 30, g: 107, b: 41, a: 100 };                         // Very Low - Forest Green
}

const GisGridLayer = L.GridLayer.extend({
  options: {
    tileSize: 256,
    cellSizeDeg: 0.05,
    spatialIndex: null,
    showLandslidePoints: true,
  },

  createTile: function (coords) {
    const tile = document.createElement('canvas');
    const size = this.getTileSize();
    // Render at 2x for smoother output, then scale down
    const pad = 8; // extra padding pixels for blur edge bleeding
    const renderW = size.x + pad * 2;
    const renderH = size.y + pad * 2;
    tile.width = size.x;
    tile.height = size.y;

    const ctx = tile.getContext('2d');
    if (!ctx || !this.options.spatialIndex) return tile;

    const { index, resolution } = this.options.spatialIndex;
    const map = this._map;
    const cellSizeDeg = this.options.cellSizeDeg;

    // Get geographic bounds of this tile
    const nwPoint = coords.scaleBy(size);
    const sePoint = nwPoint.add(size);
    const nw = map.unproject(nwPoint, coords.z);
    const se = map.unproject(sePoint, coords.z);

    const latMin = se.lat;
    const latMax = nw.lat;
    const lonMin = nw.lng;
    const lonMax = se.lng;

    // Expand search bounds by two cells to catch edge cells for blur bleed
    const expand = cellSizeDeg * 2;
    const searchLatMin = latMin - expand;
    const searchLatMax = latMax + expand;
    const searchLonMin = lonMin - expand;
    const searchLonMax = lonMax + expand;

    // Create offscreen canvas with padding for blur
    const offscreen = document.createElement('canvas');
    offscreen.width = renderW;
    offscreen.height = renderH;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return tile;

    const landslidePoints = [];
    const halfCell = cellSizeDeg / 2.0;
    // Slight cell expansion to close gaps between adjacent cells
    const cellExpand = 1.5;

    // Draw all grid cells to offscreen canvas
    for (let lat = Math.floor(searchLatMin / resolution) * resolution;
         lat <= searchLatMax;
         lat += resolution) {
      for (let lon = Math.floor(searchLonMin / resolution) * resolution;
           lon <= searchLonMax;
           lon += resolution) {
        const gx = Math.round(lon / resolution);
        const gy = Math.round(lat / resolution);
        const key = `${gx},${gy}`;
        const p = index[key];
        if (!p) continue;

        const score = p.score !== undefined ? p.score : 0.5;

        const cellNW = map.project([p.lat + halfCell, p.lon - halfCell], coords.z);
        const cellSE = map.project([p.lat - halfCell, p.lon + halfCell], coords.z);

        const x = cellNW.x - nwPoint.x + pad;
        const y = cellNW.y - nwPoint.y + pad;
        const w = Math.ceil(cellSE.x - cellNW.x) + cellExpand;
        const h = Math.ceil(cellSE.y - cellNW.y) + cellExpand;

        const c = getColorForScore(score);
        offCtx.fillStyle = `rgba(${c.r},${c.g},${c.b},${(c.a / 255).toFixed(3)})`;
        offCtx.fillRect(x - cellExpand / 2, y - cellExpand / 2, w, h);

        // Collect high-risk points for blue dot overlay
        if (this.options.showLandslidePoints && score >= 0.65) {
          const ptX = (cellNW.x + cellSE.x) / 2 - nwPoint.x;
          const ptY = (cellNW.y + cellSE.y) / 2 - nwPoint.y;
          landslidePoints.push({ x: ptX, y: ptY });
        }
      }
    }

    // Apply Gaussian blur to smooth out grid lines
    ctx.filter = 'blur(3px)';
    ctx.drawImage(offscreen, -pad, -pad);

    // Reset filter for crisp landslide point dots
    ctx.filter = 'none';
    landslidePoints.forEach(({ x, y }) => {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#0288D1';
      ctx.fill();
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();
    });

    return tile;
  },
});

export default function GisRasterHeatmapLayer({
  points = [],
  cellSizeDeg = 0.05,
  showLandslidePoints = true,
  opacity = 0.55,
}) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!map || !points || points.length === 0) return;

    const spatialIndex = buildSpatialIndex(points, cellSizeDeg);

    if (layerRef.current) {
      map.removeLayer(layerRef.current);
    }

    const gridLayer = new GisGridLayer({
      cellSizeDeg,
      spatialIndex,
      showLandslidePoints,
      opacity,
      pane: 'overlayPane',
    });

    gridLayer.addTo(map);
    layerRef.current = gridLayer;

    return () => {
      if (layerRef.current && map) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, points, cellSizeDeg, showLandslidePoints, opacity]);

  return null;
}
