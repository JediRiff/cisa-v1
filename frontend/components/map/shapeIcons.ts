// ============================================================
// Programmatic shape icon generator for MapLibre GL JS
// Draws geometric shapes on offscreen canvases and registers
// them as images on the map instance.
// ============================================================

import type maplibregl from 'maplibre-gl';
import type { EnergySector, MarkerShape } from './types';
import { SECTOR_COLORS, SECTOR_SHAPES } from './types';

const ICON_SIZE = 32; // Base icon size in pixels (will be scaled by icon-size in layer)
const PIXEL_RATIO = 2; // Retina quality

/**
 * Draw a shape on a canvas context centered at (cx, cy) with given radius.
 */
function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: MarkerShape,
  cx: number,
  cy: number,
  r: number,
) {
  ctx.beginPath();

  switch (shape) {
    case 'triangle': {
      // Equilateral triangle pointing up
      const h = r * Math.sqrt(3) / 2;
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx - h, cy + r * 0.5);
      ctx.lineTo(cx + h, cy + r * 0.5);
      ctx.closePath();
      break;
    }
    case 'square': {
      const s = r * 0.85;
      ctx.rect(cx - s, cy - s, s * 2, s * 2);
      break;
    }
    case 'diamond': {
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r * 0.75, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r * 0.75, cy);
      ctx.closePath();
      break;
    }
    case 'star': {
      const spikes = 5;
      const outerR = r;
      const innerR = r * 0.45;
      for (let i = 0; i < spikes * 2; i++) {
        const angle = (i * Math.PI) / spikes - Math.PI / 2;
        const radius = i % 2 === 0 ? outerR : innerR;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      break;
    }
    case 'hexagon': {
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3 - Math.PI / 6;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      break;
    }
    case 'dot': {
      // Smaller filled circle
      ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2);
      break;
    }
    case 'circle':
    default: {
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      break;
    }
  }
}

/**
 * Generate a single shape icon as ImageData for MapLibre.
 */
function createShapeIcon(
  shape: MarkerShape,
  color: string,
  size: number = ICON_SIZE,
): { width: number; height: number; data: Uint8ClampedArray } {
  const canvas = document.createElement('canvas');
  const pxSize = size * PIXEL_RATIO;
  canvas.width = pxSize;
  canvas.height = pxSize;
  const ctx = canvas.getContext('2d')!;

  const cx = pxSize / 2;
  const cy = pxSize / 2;
  const r = (pxSize / 2) * 0.7; // Leave margin for glow

  // Glow effect — draw blurred shape behind
  ctx.save();
  ctx.filter = `blur(${PIXEL_RATIO * 2}px)`;
  ctx.globalAlpha = 0.4;
  drawShape(ctx, shape, cx, cy, r);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();

  // Main shape
  drawShape(ctx, shape, cx, cy, r);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.9;
  ctx.fill();

  // No white stroke — risk border circle layer provides the outline

  const imageData = ctx.getImageData(0, 0, pxSize, pxSize);
  return {
    width: pxSize,
    height: pxSize,
    data: new Uint8ClampedArray(imageData.data.buffer),
  };
}

/**
 * Icon name convention: "sector-{sectorName}"
 */
export function sectorIconName(sector: EnergySector): string {
  return `sector-${sector}`;
}

/**
 * Register all sector shape icons on the map.
 * Call this once after map load, before adding symbol layers.
 */
export function registerShapeIcons(map: maplibregl.Map): void {
  const sectors = Object.keys(SECTOR_SHAPES) as EnergySector[];

  for (const sector of sectors) {
    const shape = SECTOR_SHAPES[sector];
    const color = SECTOR_COLORS[sector];
    const iconName = sectorIconName(sector);

    if (map.hasImage(iconName)) continue;

    const icon = createShapeIcon(shape, color);
    map.addImage(iconName, icon, { pixelRatio: PIXEL_RATIO });
  }
}

/**
 * Build a MapLibre match expression that maps sector property to icon name.
 * Returns: ['match', ['get', 'sector'], 'nuclear', 'sector-nuclear', ..., fallback]
 */
export function sectorIconExpression(): unknown[] {
  const expr: unknown[] = ['match', ['get', 'sector']];
  const sectors = Object.keys(SECTOR_SHAPES) as EnergySector[];
  for (const sector of sectors) {
    expr.push(sector, sectorIconName(sector));
  }
  expr.push(sectorIconName('other')); // fallback
  return expr;
}
