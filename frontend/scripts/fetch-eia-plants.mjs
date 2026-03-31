/**
 * fetch-eia-plants.mjs
 *
 * Fetches ALL US power plants from the EIA ArcGIS Feature Server
 * and writes them as a GeoJSON file for the CAPRI threat map.
 *
 * Usage: node scripts/fetch-eia-plants.mjs
 *
 * Data source: EIA "Power_Plants_in_the_US" on ArcGIS Online
 * (services2.arcgis.com/FiaPA4ga0iQKduv3)
 *
 * Falls back to WRI Global Power Plant Database if the EIA endpoint fails.
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'power-plants.geojson');

// ---------------------------------------------------------------------------
// Fuel-type classification
// ---------------------------------------------------------------------------
const FUEL_MAP = {
  // Solar
  'solar photovoltaic': 'solar',
  'solar thermal': 'solar',
  'solar': 'solar',
  'solar thermal with energy storage': 'solar',
  'all solar': 'solar',
  'solar pv': 'solar',
  'photovoltaic': 'solar',

  // Wind
  'wind': 'wind',
  'onshore wind turbine': 'wind',
  'onshore wind': 'wind',
  'wind turbine': 'wind',

  // Offshore wind
  'offshore wind turbine': 'offshore_wind',
  'offshore wind': 'offshore_wind',

  // Storage
  'batteries': 'storage',
  'battery': 'storage',
  'battery storage': 'storage',
  'flywheel': 'storage',
  'energy storage': 'storage',
  'other energy storage': 'storage',
  'electrochemical': 'storage',
  'compressed air': 'storage',
  'caes': 'storage',

  // Pumped storage
  'pumped storage': 'pump_storage',
  'pumped-storage hydroelectric': 'pump_storage',
  'pumped storage hydroelectric': 'pump_storage',
  'hydroelectric pumped storage': 'pump_storage',

  // Hydro
  'hydroelectric': 'hydro',
  'conventional hydroelectric': 'hydro',
  'run-of-river': 'hydro',
  'run of river': 'hydro',
  'hydro': 'hydro',
  'water': 'hydro',

  // Nuclear
  'nuclear': 'nuclear',
  'uranium': 'nuclear',

  // Gas
  'natural gas': 'gas',
  'gas': 'gas',
  'natural gas fired combined cycle': 'gas',
  'natural gas fired combustion turbine': 'gas',
  'natural gas steam turbine': 'gas',
  'natural gas internal combustion engine': 'gas',
  'natural gas with compressed air storage': 'gas',
  'combined cycle': 'gas',
  'gas turbine': 'gas',
  'other gases': 'gas',
  'blast furnace gas': 'gas',
  'other gas': 'gas',
  'ng': 'gas',

  // Coal
  'coal': 'coal',
  'lignite': 'coal',
  'bituminous coal': 'coal',
  'subbituminous coal': 'coal',
  'anthracite coal': 'coal',
  'coal integrated gasification combined cycle': 'coal',
  'refined coal': 'coal',
  'waste coal': 'coal',
  'coal (anthracite)': 'coal',
  'coal (bituminous)': 'coal',
  'coal (subbituminous)': 'coal',
  'coal (lignite)': 'coal',

  // Oil
  'petroleum': 'oil',
  'petroleum liquids': 'oil',
  'petroleum coke': 'oil',
  'diesel': 'oil',
  'distillate fuel oil': 'oil',
  'residual fuel oil': 'oil',
  'jet fuel': 'oil',
  'kerosene': 'oil',
  'oil': 'oil',
  'waste oil': 'oil',
  'other oil': 'oil',
  'dfo': 'oil',
  'rfo': 'oil',

  // Geothermal
  'geothermal': 'geothermal',

  // Biomass
  'biomass': 'biomass',
  'wood': 'biomass',
  'wood/wood waste biomass': 'biomass',
  'wood waste': 'biomass',
  'landfill gas': 'biomass',
  'municipal solid waste': 'biomass',
  'msw': 'biomass',
  'agricultural byproduct': 'biomass',
  'other biomass': 'biomass',
  'black liquor': 'biomass',
  'sludge waste': 'biomass',
  'other waste biomass': 'biomass',
  'biogenic municipal solid waste': 'biomass',
  'non-biogenic municipal solid waste': 'biomass',
  'biogas': 'biomass',
  'digester gas': 'biomass',
  'methane': 'biomass',
  'tires': 'biomass',
  'poultry litter': 'biomass',
};

function classifyFuel(raw) {
  if (!raw) return 'other';
  const key = raw.toLowerCase().trim();
  if (FUEL_MAP[key]) return FUEL_MAP[key];

  // Substring matching fallback
  if (key.includes('solar')) return 'solar';
  if (key.includes('wind') && key.includes('offshore')) return 'offshore_wind';
  if (key.includes('wind')) return 'wind';
  if (key.includes('batter') || key.includes('flywheel')) return 'storage';
  if (key.includes('pump')) return 'pump_storage';
  if (key.includes('hydro') || key.includes('water')) return 'hydro';
  if (key.includes('nuclear') || key.includes('uranium')) return 'nuclear';
  if (key.includes('gas') && !key.includes('landfill')) return 'gas';
  if (key.includes('coal') || key.includes('lignite')) return 'coal';
  if (key.includes('petroleum') || key.includes('oil') || key.includes('diesel') || key.includes('kerosene')) return 'oil';
  if (key.includes('geothermal')) return 'geothermal';
  if (key.includes('biomass') || key.includes('wood') || key.includes('landfill') || key.includes('waste') || key.includes('biogas') || key.includes('digester')) return 'biomass';
  // Storage check after others so "storage" substring doesn't steal from pump_storage
  if (key.includes('storage')) return 'storage';

  return 'other';
}

// ---------------------------------------------------------------------------
// Determine sector from MW breakdown fields (more accurate than PrimSource)
// ---------------------------------------------------------------------------
function classifyByMWBreakdown(attr) {
  const mw = {
    solar:        attr.Solar_MW   || 0,
    wind:         attr.Wind_MW    || 0,
    hydro:        attr.Hydro_MW   || 0,
    pump_storage: attr.HydroPS_MW || 0,
    nuclear:      attr.Nuclear_MW || 0,
    gas:          attr.NG_MW      || 0,
    coal:         attr.Coal_MW    || 0,
    oil:          attr.Crude_MW   || 0,
    geothermal:   attr.Geo_MW     || 0,
    biomass:      attr.Bio_MW     || 0,
    storage:      attr.Bat_MW     || 0,
    other:        attr.Other_MW   || 0,
  };

  // Return the sector with the highest MW
  let best = null;
  let bestMW = -1;
  for (const [sector, val] of Object.entries(mw)) {
    if (val > bestMW) {
      bestMW = val;
      best = sector;
    }
  }
  return bestMW > 0 ? best : null;
}

// ---------------------------------------------------------------------------
// US state abbreviation lookup
// ---------------------------------------------------------------------------
const STATE_ABBR = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
  'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
  'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
  'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
  'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
  'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
  'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
  'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
  'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC',
  'puerto rico': 'PR', 'guam': 'GU', 'u.s. virgin islands': 'VI',
  'american samoa': 'AS', 'northern mariana islands': 'MP',
};

function stateAbbrev(stateName) {
  if (!stateName) return '';
  // If it's already an abbreviation (2 chars)
  if (stateName.length === 2) return stateName.toUpperCase();
  const abbr = STATE_ABBR[stateName.toLowerCase().trim()];
  return abbr || stateName;
}

// ---------------------------------------------------------------------------
// HTTP fetch helper
// ---------------------------------------------------------------------------
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout: 60000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJSON(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('JSON parse error: ' + e.message)); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout: 120000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchText(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// ---------------------------------------------------------------------------
// ArcGIS pagination — correct EIA endpoint
// ---------------------------------------------------------------------------
async function fetchFromArcGIS() {
  const base = 'https://services2.arcgis.com/FiaPA4ga0iQKduv3/ArcGIS/rest/services/Power_Plants_in_the_US/FeatureServer/0/query';
  const pageSize = 2000;
  let offset = 0;
  let allFeatures = [];

  // First, get the total count
  const countUrl = `${base}?where=1%3D1&returnCountOnly=true&f=json`;
  console.log('Querying record count...');
  let totalCount;
  try {
    const countResp = await fetchJSON(countUrl);
    totalCount = countResp.count;
    console.log(`Total records available: ${totalCount}`);
  } catch (e) {
    console.log(`Could not get count: ${e.message}, will paginate until exhausted.`);
    totalCount = null;
  }

  while (true) {
    const url = `${base}?where=1%3D1&outFields=*&f=json&resultRecordCount=${pageSize}&resultOffset=${offset}`;
    console.log(`Fetching offset ${offset}...`);

    let data;
    let retries = 3;
    while (retries > 0) {
      try {
        data = await fetchJSON(url);
        break;
      } catch (e) {
        retries--;
        if (retries === 0) throw e;
        console.log(`  Retry (${3 - retries}/3): ${e.message}`);
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    if (!data.features || data.features.length === 0) {
      console.log('No more features returned. Pagination complete.');
      break;
    }

    allFeatures = allFeatures.concat(data.features);
    const progress = totalCount ? ` / ${totalCount}` : '';
    console.log(`  Got ${data.features.length} features (total so far: ${allFeatures.length}${progress})`);

    if (data.features.length < pageSize) {
      console.log('Received fewer than page size. Pagination complete.');
      break;
    }

    // Check for exceededTransferLimit
    if (data.exceededTransferLimit === false) {
      console.log('Server reports no more data.');
      break;
    }

    offset += pageSize;
  }

  return allFeatures;
}

function arcgisFeatureToGeoJSON(f) {
  const attr = f.attributes || {};

  // Use Latitude/Longitude attributes (which are in WGS84), NOT geometry (which is Web Mercator)
  const lng = attr.Longitude;
  const lat = attr.Latitude;

  if (lng == null || lat == null || isNaN(lng) || isNaN(lat)) return null;
  if (lat === 0 && lng === 0) return null;

  // Rough US bounds check (includes Alaska, Hawaii, territories)
  if (lat < 17 || lat > 72 || lng < -180 || lng > -65) return null;

  const plantCode = attr.Plant_Code || attr.OBJECTID || '';
  const name = attr.Plant_Name || 'Unknown';
  const stateFull = attr.State || '';
  const county = attr.County || '';
  const operator = attr.Utility_Na || '';
  const rawFuel = attr.PrimSource || '';
  const capacityMW = parseFloat(attr.Total_MW) || 0;
  const installMW = parseFloat(attr.Install_MW) || 0;

  // Use MW breakdown for more accurate sector classification
  const sectorByMW = classifyByMWBreakdown(attr);
  const sector = sectorByMW || classifyFuel(rawFuel);

  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [parseFloat(lng.toFixed(6)), parseFloat(lat.toFixed(6))]
    },
    properties: {
      id: `plant_${plantCode}`,
      name,
      state: stateAbbrev(stateFull),
      county,
      sector,
      fuelType: rawFuel,
      capacityMW: capacityMW || installMW,
      operator,
      status: 'active',  // EIA dataset represents operating plants
      plantCode: String(plantCode),
      balancingAuthority: ''
    }
  };
}

// ---------------------------------------------------------------------------
// WRI GPPD Fallback
// ---------------------------------------------------------------------------
async function fetchFromWRI() {
  console.log('\n--- Falling back to WRI Global Power Plant Database ---');
  const csvUrl = 'https://raw.githubusercontent.com/wri/global-power-plant-database/master/output_database/global_power_plant_database.csv';
  console.log('Downloading CSV from WRI GitHub...');
  const csv = await fetchText(csvUrl);
  const lines = csv.split('\n');
  const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  console.log(`CSV has ${lines.length - 1} total rows, header fields: ${header.length}`);
  console.log('Headers:', header.join(', '));

  const idx = (name) => header.indexOf(name);
  const iCountry = idx('country');  // 3-letter code like "USA"
  const iLat = idx('latitude');
  const iLng = idx('longitude');
  const iName = idx('name');
  const iGppd = idx('gppd_idnr');
  const iCapacity = idx('capacity_mw');
  const iFuel = idx('primary_fuel');
  const iOwner = idx('owner');

  console.log(`Column indices: country=${iCountry}, lat=${iLat}, lng=${iLng}, name=${iName}, fuel=${iFuel}`);

  const features = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = parseCSVLine(lines[i]);
    const cc = iCountry >= 0 ? cols[iCountry] : '';
    if (cc !== 'USA') continue;

    const lat = parseFloat(cols[iLat]);
    const lng = parseFloat(cols[iLng]);
    if (isNaN(lat) || isNaN(lng)) continue;

    const rawFuel = cols[iFuel] || '';
    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [parseFloat(lng.toFixed(6)), parseFloat(lat.toFixed(6))]
      },
      properties: {
        id: `plant_${cols[iGppd] || i}`,
        name: cols[iName] || 'Unknown',
        state: '',
        county: '',
        sector: classifyFuel(rawFuel),
        fuelType: rawFuel,
        capacityMW: parseFloat(cols[iCapacity]) || 0,
        operator: cols[iOwner] || '',
        status: 'active',
        plantCode: cols[iGppd] || String(i),
        balancingAuthority: ''
      }
    });
  }

  return features;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('=== EIA Power Plant Data Fetcher ===\n');

  let features = [];
  let source = 'EIA';

  // Try ArcGIS first
  try {
    console.log('Attempting EIA ArcGIS Feature Server...');
    console.log('Endpoint: services2.arcgis.com/FiaPA4ga0iQKduv3/.../Power_Plants_in_the_US\n');
    const rawFeatures = await fetchFromArcGIS();
    console.log(`\nRaw features from ArcGIS: ${rawFeatures.length}`);

    // Log a few unique PrimSource values to verify classification
    const uniqueFuels = new Set();
    for (const f of rawFeatures) {
      const ps = (f.attributes || {}).PrimSource;
      if (ps) uniqueFuels.add(ps);
    }
    console.log(`Unique PrimSource values: ${[...uniqueFuels].sort().join(', ')}`);

    features = rawFeatures.map(arcgisFeatureToGeoJSON).filter(Boolean);
    console.log(`Valid GeoJSON features after filtering: ${features.length}`);

    if (features.length < 1000) {
      console.log('Too few features from ArcGIS, trying WRI fallback...');
      throw new Error('Insufficient data from ArcGIS');
    }
  } catch (err) {
    console.error(`ArcGIS fetch failed: ${err.message}`);
    source = 'WRI';
    try {
      features = await fetchFromWRI();
      console.log(`Got ${features.length} US plants from WRI.`);
    } catch (err2) {
      console.error(`WRI fallback also failed: ${err2.message}`);
      process.exit(1);
    }
  }

  // Build the GeoJSON
  const geojson = {
    type: 'FeatureCollection',
    metadata: {
      source,
      fetchDate: new Date().toISOString().split('T')[0],
      totalPlants: features.length,
      description: source === 'EIA'
        ? 'US Power Plants from EIA Form 860 via ArcGIS Feature Server'
        : 'US Power Plants from WRI Global Power Plant Database'
    },
    features
  };

  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Write to file
  console.log(`\nWriting ${features.length} features to ${OUTPUT_FILE}...`);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(geojson), 'utf-8');
  const fileSizeMB = (fs.statSync(OUTPUT_FILE).size / (1024 * 1024)).toFixed(2);
  console.log(`File written: ${fileSizeMB} MB`);

  // Summary by sector
  const sectorCounts = {};
  const statusCounts = {};
  const stateCounts = {};
  for (const f of features) {
    const s = f.properties.sector;
    const st = f.properties.status;
    const state = f.properties.state;
    sectorCounts[s] = (sectorCounts[s] || 0) + 1;
    statusCounts[st] = (statusCounts[st] || 0) + 1;
    stateCounts[state] = (stateCounts[state] || 0) + 1;
  }

  console.log('\n=== Summary by Fuel Type (sector) ===');
  const sorted = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1]);
  for (const [sector, count] of sorted) {
    console.log(`  ${sector.padEnd(16)} ${String(count).padStart(6)}`);
  }

  console.log('\n=== Summary by Status ===');
  for (const [status, count] of Object.entries(statusCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${status.padEnd(16)} ${String(count).padStart(6)}`);
  }

  console.log('\n=== Top 10 States by Plant Count ===');
  const statesSorted = Object.entries(stateCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  for (const [state, count] of statesSorted) {
    console.log(`  ${state.padEnd(16)} ${String(count).padStart(6)}`);
  }

  console.log(`\nTotal plants: ${features.length}`);
  console.log('Done!');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
