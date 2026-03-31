#!/usr/bin/env node
/**
 * Fetch US Electric Substations and Transmission Lines from HIFLD
 * (Homeland Infrastructure Foundation-Level Data)
 *
 * Substations source: HIFLD mirror hosted on ArcGIS Online
 * Transmission Lines source: FEMA/Esri HIFLD mirror
 *
 * Usage: node scripts/fetch-hifld.mjs
 */

import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'public', 'data');

// ArcGIS endpoints
const SUBSTATIONS_URL =
  'https://services1.arcgis.com/PMShNXB1carltgVf/arcgis/rest/services/Electric_Substations/FeatureServer/0/query';
const TRANSMISSION_URL =
  'https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/services/US_Electric_Power_Transmission_Lines/FeatureServer/0/query';

const PAGE_SIZE = 2000;
const TODAY = new Date().toISOString().slice(0, 10);

// ─── Helpers ────────────────────────────────────────────────────────

/** POST to an ArcGIS query endpoint and return parsed JSON */
function arcgisQuery(baseUrl, params) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams(params).toString();
    const parsed = new URL(baseUrl);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`JSON parse error: ${e.message}\nBody: ${data.slice(0, 500)}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/** Convert Web Mercator (EPSG:3857) x,y to WGS84 lon,lat */
function webMercatorToWgs84(x, y) {
  const lon = (x / 20037508.34) * 180;
  let lat = (y / 20037508.34) * 180;
  lat = (180 / Math.PI) * (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2);
  return [round6(lon), round6(lat)];
}

function round6(n) {
  return Math.round(n * 1e6) / 1e6;
}

/** Douglas-Peucker line simplification */
function simplifyLine(coords, tolerance) {
  if (coords.length <= 2) return coords;

  let maxDist = 0;
  let maxIdx = 0;
  const first = coords[0];
  const last = coords[coords.length - 1];

  for (let i = 1; i < coords.length - 1; i++) {
    const d = perpendicularDistance(coords[i], first, last);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }

  if (maxDist > tolerance) {
    const left = simplifyLine(coords.slice(0, maxIdx + 1), tolerance);
    const right = simplifyLine(coords.slice(maxIdx), tolerance);
    return left.slice(0, -1).concat(right);
  }
  return [first, last];
}

function perpendicularDistance(point, lineStart, lineEnd) {
  const dx = lineEnd[0] - lineStart[0];
  const dy = lineEnd[1] - lineStart[1];
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    const ex = point[0] - lineStart[0];
    const ey = point[1] - lineStart[1];
    return Math.sqrt(ex * ex + ey * ey);
  }
  const t = Math.max(0, Math.min(1, ((point[0] - lineStart[0]) * dx + (point[1] - lineStart[1]) * dy) / lenSq));
  const projX = lineStart[0] + t * dx;
  const projY = lineStart[1] + t * dy;
  const ex = point[0] - projX;
  const ey = point[1] - projY;
  return Math.sqrt(ex * ex + ey * ey);
}

// ─── Substations ────────────────────────────────────────────────────

async function fetchSubstations() {
  console.log('=== Fetching Substations ===');

  // Get total count first
  const countResult = await arcgisQuery(SUBSTATIONS_URL, {
    where: '1=1',
    returnCountOnly: 'true',
    f: 'json',
  });
  const totalCount = countResult.count;
  console.log(`Total substations available: ${totalCount}`);

  const allFeatures = [];
  let offset = 0;
  let page = 0;

  while (true) {
    page++;
    process.stdout.write(`  Page ${page} (offset ${offset})...`);

    const result = await arcgisQuery(SUBSTATIONS_URL, {
      where: '1=1',
      outFields: 'NAME,STATE,TYPE,STATUS,LINES,MAX_VOLT,MIN_VOLT,LATITUDE,LONGITUDE,ID',
      f: 'json',
      resultRecordCount: String(PAGE_SIZE),
      resultOffset: String(offset),
    });

    if (result.error) {
      console.error(`\n  ERROR: ${JSON.stringify(result.error)}`);
      break;
    }

    const features = result.features || [];
    console.log(` got ${features.length} features`);

    for (const f of features) {
      const a = f.attributes;
      // Use LATITUDE/LONGITUDE fields (already in WGS84) when available,
      // otherwise convert geometry from Web Mercator
      let lon, lat;
      if (a.LATITUDE && a.LONGITUDE && a.LATITUDE !== -999999 && a.LONGITUDE !== -999999) {
        lon = round6(a.LONGITUDE);
        lat = round6(a.LATITUDE);
      } else if (f.geometry) {
        [lon, lat] = webMercatorToWgs84(f.geometry.x, f.geometry.y);
      } else {
        continue; // skip records with no geometry
      }

      const maxVolt = a.MAX_VOLT && String(a.MAX_VOLT) !== '-999999' ? Number(a.MAX_VOLT) : null;
      const minVolt = a.MIN_VOLT && String(a.MIN_VOLT) !== '-999999' ? Number(a.MIN_VOLT) : null;

      allFeatures.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lon, lat],
        },
        properties: {
          id: `sub_${a.ID || a.OBJECTID || offset + allFeatures.length}`,
          name: a.NAME || 'UNKNOWN',
          state: a.STATE || null,
          type: a.TYPE || null,
          status: a.STATUS || null,
          owner: null, // not available in this dataset
          maxVoltageKV: maxVolt,
          minVoltageKV: minVolt,
          lines: a.LINES != null && a.LINES !== -999999 ? a.LINES : null,
          capacityMW: null,
        },
      });
    }

    if (!result.exceededTransferLimit || features.length === 0) {
      break;
    }
    offset += features.length;
  }

  console.log(`  Total substations fetched: ${allFeatures.length}`);

  const geojson = {
    type: 'FeatureCollection',
    metadata: {
      source: 'HIFLD',
      fetchDate: TODAY,
      totalSubstations: allFeatures.length,
    },
    features: allFeatures,
  };

  const outPath = path.join(DATA_DIR, 'substations.geojson');
  fs.writeFileSync(outPath, JSON.stringify(geojson));
  const sizeMB = (fs.statSync(outPath).size / 1048576).toFixed(2);
  console.log(`  Written to ${outPath} (${sizeMB} MB)`);

  // Voltage distribution
  const voltDist = {};
  for (const f of allFeatures) {
    const v = f.properties.maxVoltageKV;
    const bucket = v == null ? 'unknown' : v < 69 ? '<69kV' : v < 115 ? '69-114kV' : v < 230 ? '115-229kV' : v < 345 ? '230-344kV' : v < 500 ? '345-499kV' : '500kV+';
    voltDist[bucket] = (voltDist[bucket] || 0) + 1;
  }
  console.log('  Voltage distribution:', voltDist);

  return allFeatures.length;
}

// ─── Transmission Lines ─────────────────────────────────────────────

async function fetchTransmissionLines() {
  console.log('\n=== Fetching Transmission Lines (>= 230 kV) ===');

  // Get count first
  const countResult = await arcgisQuery(TRANSMISSION_URL, {
    where: 'VOLTAGE>=230',
    returnCountOnly: 'true',
    f: 'json',
  });
  const totalCount = countResult.count;
  console.log(`Total lines with voltage >= 230kV: ${totalCount}`);

  const allFeatures = [];
  let offset = 0;
  let page = 0;
  let totalPointsBefore = 0;
  let totalPointsAfter = 0;

  while (true) {
    page++;
    process.stdout.write(`  Page ${page} (offset ${offset})...`);

    const result = await arcgisQuery(TRANSMISSION_URL, {
      where: 'VOLTAGE>=230',
      outFields: 'ID,TYPE,STATUS,OWNER,VOLTAGE,VOLT_CLASS,INFERRED',
      f: 'json',
      resultRecordCount: String(PAGE_SIZE),
      resultOffset: String(offset),
    });

    if (result.error) {
      console.error(`\n  ERROR: ${JSON.stringify(result.error)}`);
      break;
    }

    const features = result.features || [];
    console.log(` got ${features.length} features`);

    for (const f of features) {
      const a = f.attributes;
      const geom = f.geometry;
      if (!geom || !geom.paths || geom.paths.length === 0) continue;

      // Convert paths from Web Mercator to WGS84
      const convertedPaths = geom.paths.map((pathCoords) => {
        const wgs84 = pathCoords.map(([x, y]) => webMercatorToWgs84(x, y));
        totalPointsBefore += pathCoords.length;
        // Simplify to reduce file size (~0.0001 degrees ≈ ~11m tolerance)
        const simplified = simplifyLine(wgs84, 0.0001);
        totalPointsAfter += simplified.length;
        return simplified;
      });

      // Determine AC/DC from TYPE field
      let lineType = null;
      if (a.TYPE) {
        if (a.TYPE.includes('DC')) lineType = 'DC';
        else if (a.TYPE.includes('AC')) lineType = 'AC';
        else lineType = a.TYPE;
      }

      const feature = {
        type: 'Feature',
        geometry:
          convertedPaths.length === 1
            ? { type: 'LineString', coordinates: convertedPaths[0] }
            : { type: 'MultiLineString', coordinates: convertedPaths },
        properties: {
          id: `tx_${a.ID || a.OBJECTID_1 || offset + allFeatures.length}`,
          owner: a.OWNER && a.OWNER !== 'NOT AVAILABLE' ? a.OWNER : null,
          voltageKV: a.VOLTAGE && a.VOLTAGE !== -999999 ? a.VOLTAGE : null,
          voltClass: a.VOLT_CLASS || null,
          status: a.STATUS || null,
          type: lineType,
        },
      };

      allFeatures.push(feature);
    }

    if (!result.exceededTransferLimit || features.length === 0) {
      break;
    }
    offset += features.length;
  }

  console.log(`  Total lines fetched: ${allFeatures.length}`);
  console.log(`  Geometry simplification: ${totalPointsBefore} -> ${totalPointsAfter} points (${((1 - totalPointsAfter / totalPointsBefore) * 100).toFixed(1)}% reduction)`);

  const geojson = {
    type: 'FeatureCollection',
    metadata: {
      source: 'HIFLD',
      fetchDate: TODAY,
      totalLines: allFeatures.length,
      filter: 'voltage >= 230kV',
    },
    features: allFeatures,
  };

  const outPath = path.join(DATA_DIR, 'transmission-lines.geojson');
  fs.writeFileSync(outPath, JSON.stringify(geojson));
  let sizeMB = (fs.statSync(outPath).size / 1048576).toFixed(2);
  console.log(`  Written to ${outPath} (${sizeMB} MB)`);

  // If too large, re-filter to >= 345kV
  if (fs.statSync(outPath).size > 50 * 1048576) {
    console.log('  File exceeds 50 MB — re-filtering to >= 345 kV...');
    const filtered = allFeatures.filter((f) => f.properties.voltageKV >= 345);
    const filteredGeoJSON = {
      type: 'FeatureCollection',
      metadata: {
        source: 'HIFLD',
        fetchDate: TODAY,
        totalLines: filtered.length,
        filter: 'voltage >= 345kV (auto-filtered from 230kV due to size)',
      },
      features: filtered,
    };
    fs.writeFileSync(outPath, JSON.stringify(filteredGeoJSON));
    sizeMB = (fs.statSync(outPath).size / 1048576).toFixed(2);
    console.log(`  Re-written to ${outPath} (${sizeMB} MB, ${filtered.length} lines)`);
  }

  // Voltage distribution
  const voltDist = {};
  for (const f of allFeatures) {
    const vc = f.properties.voltClass || 'unknown';
    voltDist[vc] = (voltDist[vc] || 0) + 1;
  }
  console.log('  Voltage class distribution:', voltDist);

  return allFeatures.length;
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log(`HIFLD Data Fetch — ${TODAY}`);
  console.log(`Output directory: ${DATA_DIR}\n`);

  fs.mkdirSync(DATA_DIR, { recursive: true });

  const subCount = await fetchSubstations();
  const txCount = await fetchTransmissionLines();

  console.log('\n=== Summary ===');
  console.log(`Substations: ${subCount}`);
  console.log(`Transmission Lines (>= 230kV): ${txCount}`);
  console.log('Done.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
