import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';


export default function HeatmapLayer({
  points = [],
  radius = 28,
  blur = 18,
  maxZoom = 12,
  minOpacity = 0.4,
}) {
  const map = useMap();
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!map || !points || points.length === 0) return;

    // Check for Leaflet Heat plugin on imported L or global window.L
    const heatFactory = (L && typeof L.heatLayer === 'function' ? L.heatLayer : null) || 
                       (window.L && typeof window.L.heatLayer === 'function' ? window.L.heatLayer : null);

    if (heatFactory) {
      const heatPoints = points.map((p) => [
        p.lat,
        p.lon,
        p.score !== undefined ? p.score : (p.riskScore || 0.5)
      ]);

      const heatLayer = heatFactory(heatPoints, {
        radius,
        blur,
        maxZoom,
        max: 1.0,
        minOpacity,
        gradient: {
          0.10: '#159447', // Low Risk Green
          0.35: '#D9A441', // Moderate Risk Yellow
          0.60: '#E57A17', // High Risk Orange
          0.85: '#C92A2A'  // Critical Risk Red
        }
      });

      heatLayer.addTo(map);

      return () => {
        if (heatLayer && map) {
          map.removeLayer(heatLayer);
        }
      };
    }

    // High-performance HTML5 Canvas Fallback Heatmap Renderer
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '400';

    const container = map.getContainer();
    container.appendChild(canvas);
    canvasRef.current = canvas;

    const renderCanvasHeatmap = () => {
      const size = map.getSize();
      canvas.width = size.x;
      canvas.height = size.y;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, size.x, size.y);

      points.forEach((p) => {
        const point = map.latLngToContainerPoint([p.lat, p.lon]);
        // Bounding box filter for off-screen points
        if (point.x < -radius || point.x > size.x + radius || point.y < -radius || point.y > size.y + radius) {
          return;
        }

        const score = p.score !== undefined ? p.score : 0.5;
        let color, alpha;

        if (score >= 0.75) {
          color = '201, 42, 42'; // Critical Red (#C92A2A)
          alpha = 0.70;
        } else if (score >= 0.50) {
          color = '229, 122, 23'; // High Orange (#E57A17)
          alpha = 0.60;
        } else if (score >= 0.25) {
          color = '217, 164, 65'; // Moderate Yellow (#D9A441)
          alpha = 0.50;
        } else {
          color = '21, 148, 71'; // Low Green (#159447)
          alpha = 0.40;
        }

        const grad = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
        grad.addColorStop(0, `rgba(${color}, ${alpha})`);
        grad.addColorStop(0.5, `rgba(${color}, ${alpha * 0.5})`);
        grad.addColorStop(1, `rgba(${color}, 0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    renderCanvasHeatmap();

    map.on('move', renderCanvasHeatmap);
    map.on('zoomend', renderCanvasHeatmap);
    map.on('resize', renderCanvasHeatmap);

    return () => {
      map.off('move', renderCanvasHeatmap);
      map.off('zoomend', renderCanvasHeatmap);
      map.off('resize', renderCanvasHeatmap);
      if (canvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    };
  }, [map, points, radius, blur, minOpacity, maxZoom]);

  return null;
}
