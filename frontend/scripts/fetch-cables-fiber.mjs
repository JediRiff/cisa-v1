#!/usr/bin/env node
/**
 * fetch-cables-fiber.mjs
 *
 * Fetches submarine cable data from TeleGeography and compiles fiber backbone
 * route data for the CAPRI critical infrastructure threat map.
 *
 * Output:
 *   - public/data/submarine-cables.geojson
 *   - public/data/fiber-routes.geojson
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'public', 'data');

const TELEGEOGRAPHY_BASE = 'https://www.submarinecablemap.com/api/v3';

// US territories for landing point matching
const US_COUNTRIES = ['United States'];
const US_TERRITORY_PATTERNS = [
  'united states',
  ', guam',
  ', us virgin islands',
  'american samoa',
  'northern mariana',
];

function isUSLandingPoint(name) {
  const lower = name.toLowerCase();
  return US_TERRITORY_PATTERNS.some(p => lower.includes(p));
}

function isUSCountry(country) {
  if (!country) return false;
  const lower = country.toLowerCase();
  return lower === 'united states' || lower === 'guam' ||
         lower === 'american samoa' || lower === 'u.s. virgin islands' ||
         lower === 'northern mariana islands' || lower === 'puerto rico';
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'Accept': 'application/json' } }, (res) => {
      if (res.statusCode !== 200) {
        res.resume(); // consume response to free memory
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString()));
        } catch (e) {
          reject(new Error(`JSON parse error for ${url}: ${e.message}`));
        }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ──────────────────────────────────────────────
// SUBMARINE CABLES
// ──────────────────────────────────────────────

async function fetchSubmarineCables() {
  console.log('=== Fetching Submarine Cable Data ===\n');

  // Step 1: Fetch all cable geometry
  console.log('1. Fetching cable geometry...');
  const geoData = await fetchJSON(`${TELEGEOGRAPHY_BASE}/cable/cable-geo.json`);
  console.log(`   ${geoData.features.length} geometry features loaded`);

  // Step 2: Fetch landing points to identify US connections
  console.log('2. Fetching landing points...');
  const landingData = await fetchJSON(`${TELEGEOGRAPHY_BASE}/landing-point/landing-point-geo.json`);
  console.log(`   ${landingData.features.length} landing points loaded`);

  // Identify US landing point IDs
  const usLandingPointIds = new Set();
  for (const lp of landingData.features) {
    const name = lp.properties.name || '';
    if (isUSLandingPoint(name)) {
      usLandingPointIds.add(lp.properties.id);
    }
  }
  console.log(`   ${usLandingPointIds.size} US/territory landing points identified`);

  // Step 3: Fetch individual landing point details to find which cables connect
  console.log('3. Fetching landing point details to find US-connected cables...');
  const usCableIds = new Set();
  const cableMetadataFromLP = {}; // partial metadata from landing point endpoints

  let fetchCount = 0;
  const lpIds = [...usLandingPointIds];

  // Batch fetch landing point details
  const BATCH_SIZE = 15;
  for (let i = 0; i < lpIds.length; i += BATCH_SIZE) {
    const batch = lpIds.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(id => fetchJSON(`${TELEGEOGRAPHY_BASE}/landing-point/${id}.json`))
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const lpDetail = result.value;
        if (lpDetail.cables) {
          for (const cable of lpDetail.cables) {
            usCableIds.add(cable.id);
            if (!cableMetadataFromLP[cable.id]) {
              cableMetadataFromLP[cable.id] = {
                name: cable.name,
                rfsYear: cable.rfs_year,
                isPlanned: cable.is_planned,
              };
            }
          }
        }
      }
    }
    fetchCount += batch.length;
    if (i + BATCH_SIZE < lpIds.length) {
      process.stdout.write(`   Processed ${fetchCount}/${lpIds.length} landing points...\r`);
      await sleep(200); // Be polite to the API
    }
  }
  console.log(`\n   ${usCableIds.size} unique US-connected cables found`);

  // Step 4: Fetch detailed metadata for each US-connected cable
  console.log('4. Fetching cable details...');
  const cableDetails = {};
  const cableIds = [...usCableIds];

  for (let i = 0; i < cableIds.length; i += BATCH_SIZE) {
    const batch = cableIds.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(id => fetchJSON(`${TELEGEOGRAPHY_BASE}/cable/${id}.json`))
    );

    for (let j = 0; j < batch.length; j++) {
      if (results[j].status === 'fulfilled') {
        cableDetails[batch[j]] = results[j].value;
      } else {
        // Use partial metadata from landing point data
        console.log(`   Warning: Could not fetch detail for ${batch[j]}, using partial data`);
        cableDetails[batch[j]] = cableMetadataFromLP[batch[j]] || { name: batch[j] };
      }
    }

    fetchCount = Math.min(i + BATCH_SIZE, cableIds.length);
    if (i + BATCH_SIZE < cableIds.length) {
      process.stdout.write(`   Fetched ${fetchCount}/${cableIds.length} cable details...\r`);
      await sleep(200);
    }
  }
  console.log(`\n   ${Object.keys(cableDetails).length} cable details retrieved`);

  // Step 5: Build geometry lookup (cable ID -> geometry features)
  const geoLookup = {};
  for (const feature of geoData.features) {
    const id = feature.properties.id;
    if (!geoLookup[id]) geoLookup[id] = [];
    geoLookup[id].push(feature);
  }

  // Step 6: Assemble final GeoJSON
  console.log('5. Assembling GeoJSON...');
  const features = [];
  let missingGeo = 0;

  for (const cableId of cableIds) {
    const detail = cableDetails[cableId];
    const geoFeatures = geoLookup[cableId];

    if (!geoFeatures || geoFeatures.length === 0) {
      missingGeo++;
      continue;
    }

    // Merge multiple geometry segments into a single MultiLineString
    let geometry;
    if (geoFeatures.length === 1) {
      geometry = geoFeatures[0].geometry;
    } else {
      // Combine all coordinate arrays into a MultiLineString
      const allCoords = [];
      for (const gf of geoFeatures) {
        if (gf.geometry.type === 'MultiLineString') {
          allCoords.push(...gf.geometry.coordinates);
        } else if (gf.geometry.type === 'LineString') {
          allCoords.push(gf.geometry.coordinates);
        }
      }
      geometry = {
        type: 'MultiLineString',
        coordinates: allCoords,
      };
    }

    // Parse length
    let lengthKm = null;
    if (detail.length) {
      const parsed = parseInt(detail.length.replace(/[, ]/g, ''), 10);
      if (!isNaN(parsed)) lengthKm = parsed;
    }

    // Build landing point names
    const landingPointNames = (detail.landing_points || []).map(lp => {
      if (typeof lp === 'string') return lp;
      return lp.name || lp.id;
    });

    // Determine status
    // TeleGeography only provides is_planned; there's no explicit "retired" flag.
    // We treat all non-planned cables as active since TeleGeography lists active cables.
    let status = 'active';
    if (detail.is_planned) {
      status = 'planned';
    }

    features.push({
      type: 'Feature',
      geometry,
      properties: {
        id: `cable_${cableId}`,
        name: detail.name || cableId,
        owners: detail.owners || null,
        suppliers: detail.suppliers || null,
        rfsYear: detail.rfs_year || detail.rfsYear || null,
        rfsDate: detail.rfs || null,
        lengthKm,
        landingPoints: landingPointNames,
        status,
        url: detail.url || null,
        notes: detail.notes || null,
      },
    });
  }

  if (missingGeo > 0) {
    console.log(`   Warning: ${missingGeo} cables had no geometry data`);
  }

  const geojson = {
    type: 'FeatureCollection',
    metadata: {
      source: 'TeleGeography Submarine Cable Map',
      sourceUrl: 'https://www.submarinecablemap.com',
      fetchDate: new Date().toISOString().split('T')[0],
      totalCables: features.length,
      filter: 'Cables connecting to US states and territories (including Guam, PR, USVI, American Samoa)',
    },
    features,
  };

  const outputPath = join(DATA_DIR, 'submarine-cables.geojson');
  writeFileSync(outputPath, JSON.stringify(geojson, null, 2));
  console.log(`\n   Wrote ${features.length} cables to ${outputPath}`);

  // Print summary
  const active = features.filter(f => f.properties.status === 'active').length;
  const planned = features.filter(f => f.properties.status === 'planned').length;
  console.log(`   Active: ${active}, Planned: ${planned}`);

  // Notable cables
  console.log('\n   Notable cables found:');
  const notable = ['dunant', 'marea', 'havfrueaec-2', 'amitie', 'arc', 'jupiter',
    'new-cross-pacific-ncp-cable-system', 'trans-pacific-express-tpe-cable-system',
    'pacific-light-cable-network-plcn', 'echo', 'bifrost'];
  for (const n of notable) {
    const f = features.find(f => f.properties.id === `cable_${n}`);
    if (f) {
      console.log(`     - ${f.properties.name} (${f.properties.rfsYear || 'N/A'}) [${f.properties.owners || 'N/A'}]`);
    }
  }

  return features.length;
}


// ──────────────────────────────────────────────
// FIBER BACKBONE ROUTES
// ──────────────────────────────────────────────

function buildFiberRoutes() {
  console.log('\n=== Building Fiber Backbone Route Data ===\n');
  console.log('Note: No comprehensive open GeoJSON source for US fiber routes.');
  console.log('Building curated dataset of major backbone routes from public information.\n');

  // Major US cities with coordinates [lng, lat]
  const cities = {
    // East Coast
    'New York, NY':       [-74.006, 40.7128],
    'Washington, DC':     [-77.0369, 38.9072],
    'Boston, MA':         [-71.0589, 42.3601],
    'Philadelphia, PA':   [-75.1652, 39.9526],
    'Miami, FL':          [-80.1918, 25.7617],
    'Jacksonville, FL':   [-81.6557, 30.3322],
    'Atlanta, GA':        [-84.388, 33.749],
    'Charlotte, NC':      [-80.8431, 35.2271],
    'Richmond, VA':       [-77.436, 37.5407],
    'Virginia Beach, VA': [-75.978, 36.8529],

    // Midwest
    'Chicago, IL':        [-87.6298, 41.8781],
    'Detroit, MI':        [-83.0458, 42.3314],
    'Cleveland, OH':      [-81.6944, 41.4993],
    'Columbus, OH':       [-82.9988, 39.9612],
    'Indianapolis, IN':   [-86.158, 39.7684],
    'Minneapolis, MN':    [-93.265, 44.9778],
    'St. Louis, MO':      [-90.199, 38.627],
    'Kansas City, MO':    [-94.5786, 39.0997],
    'Milwaukee, WI':      [-87.9065, 43.0389],
    'Nashville, TN':      [-86.7816, 36.1627],
    'Memphis, TN':        [-90.049, 35.1495],
    'Louisville, KY':     [-85.7585, 38.2527],

    // South/Southwest
    'Dallas, TX':         [-96.797, 32.7767],
    'Houston, TX':        [-95.3698, 29.7604],
    'San Antonio, TX':    [-98.4936, 29.4241],
    'Austin, TX':         [-97.7431, 30.2672],
    'New Orleans, LA':    [-90.0715, 29.9511],
    'Oklahoma City, OK':  [-97.5164, 35.4676],
    'Tulsa, OK':          [-95.9928, 36.154],
    'Phoenix, AZ':        [-112.074, 33.4484],
    'Albuquerque, NM':    [-106.6504, 35.0844],
    'El Paso, TX':        [-106.425, 31.7619],

    // West Coast
    'Los Angeles, CA':    [-118.2437, 34.0522],
    'San Francisco, CA':  [-122.4194, 37.7749],
    'San Jose, CA':       [-121.8863, 37.3382],
    'Seattle, WA':        [-122.3321, 47.6062],
    'Portland, OR':       [-122.6765, 45.5152],
    'Sacramento, CA':     [-121.4944, 38.5816],
    'San Diego, CA':      [-117.1611, 32.7157],
    'Las Vegas, NV':      [-115.1398, 36.1699],
    'Salt Lake City, UT': [-111.891, 40.7608],
    'Denver, CO':         [-104.9903, 39.7392],
    'Boise, ID':          [-116.2023, 43.615],
    'Reno, NV':           [-119.8138, 39.5296],

    // Mountain/Plains
    'Omaha, NE':          [-95.9345, 41.2565],
    'Des Moines, IA':     [-93.6091, 41.5868],
    'Cheyenne, WY':       [-104.82, 41.14],
    'Billings, MT':       [-108.501, 45.7833],
  };

  // Intermediate waypoints for routes that don't go straight
  // These create more realistic paths along major highway/rail corridors

  const routes = [
    // ═══════════════════════════════════════════
    // MAJOR EAST-WEST TRANSCONTINENTAL ROUTES
    // ═══════════════════════════════════════════
    {
      name: 'Northern Corridor (NYC - Chicago - Seattle)',
      carrier: 'Lumen Technologies (Level 3)',
      type: 'long-haul',
      routeMiles: 2850,
      path: ['New York, NY', 'Cleveland, OH', 'Chicago, IL', 'Minneapolis, MN', 'Billings, MT', 'Boise, ID', 'Seattle, WA'],
    },
    {
      name: 'I-80 Corridor (NYC - Chicago - SF)',
      carrier: 'Zayo Group',
      type: 'long-haul',
      routeMiles: 2900,
      path: ['New York, NY', 'Philadelphia, PA', 'Cleveland, OH', 'Chicago, IL', 'Des Moines, IA', 'Omaha, NE', 'Cheyenne, WY', 'Salt Lake City, UT', 'Reno, NV', 'Sacramento, CA', 'San Francisco, CA'],
    },
    {
      name: 'Southern Transcontinental (Atlanta - Dallas - LA)',
      carrier: 'AT&T',
      type: 'long-haul',
      routeMiles: 2200,
      path: ['Atlanta, GA', 'Memphis, TN', 'Dallas, TX', 'El Paso, TX', 'Phoenix, AZ', 'Los Angeles, CA'],
    },
    {
      name: 'I-70 Central Corridor (DC - Denver)',
      carrier: 'Lumen Technologies (Level 3)',
      type: 'long-haul',
      routeMiles: 1700,
      path: ['Washington, DC', 'Richmond, VA', 'Columbus, OH', 'Indianapolis, IN', 'St. Louis, MO', 'Kansas City, MO', 'Denver, CO'],
    },
    {
      name: 'Denver - West Coast (Denver - SLC - SF)',
      carrier: 'Zayo Group',
      type: 'long-haul',
      routeMiles: 1200,
      path: ['Denver, CO', 'Salt Lake City, UT', 'Reno, NV', 'Sacramento, CA', 'San Francisco, CA'],
    },
    {
      name: 'I-10 Southern Route (Jacksonville - Houston - LA)',
      carrier: 'Verizon',
      type: 'long-haul',
      routeMiles: 2100,
      path: ['Jacksonville, FL', 'New Orleans, LA', 'Houston, TX', 'San Antonio, TX', 'El Paso, TX', 'Phoenix, AZ', 'Los Angeles, CA'],
    },
    {
      name: 'Denver - Seattle via SLC-Boise',
      carrier: 'CenturyLink/Lumen',
      type: 'long-haul',
      routeMiles: 1500,
      path: ['Denver, CO', 'Salt Lake City, UT', 'Boise, ID', 'Portland, OR', 'Seattle, WA'],
    },

    // ═══════════════════════════════════════════
    // NORTH-SOUTH BACKBONE ROUTES
    // ═══════════════════════════════════════════
    {
      name: 'Eastern Seaboard (Boston - Miami)',
      carrier: 'Crown Castle Fiber',
      type: 'long-haul',
      routeMiles: 1500,
      path: ['Boston, MA', 'New York, NY', 'Philadelphia, PA', 'Washington, DC', 'Richmond, VA', 'Charlotte, NC', 'Atlanta, GA', 'Jacksonville, FL', 'Miami, FL'],
    },
    {
      name: 'I-95 Northeast Corridor (Boston - DC)',
      carrier: 'Zayo Group',
      type: 'long-haul',
      routeMiles: 450,
      path: ['Boston, MA', 'New York, NY', 'Philadelphia, PA', 'Washington, DC'],
    },
    {
      name: 'Pacific Coast (Seattle - LA)',
      carrier: 'Lumen Technologies',
      type: 'long-haul',
      routeMiles: 1140,
      path: ['Seattle, WA', 'Portland, OR', 'Sacramento, CA', 'San Francisco, CA', 'San Jose, CA', 'Los Angeles, CA'],
    },
    {
      name: 'I-5 Pacific Route (Seattle - San Diego)',
      carrier: 'AT&T',
      type: 'long-haul',
      routeMiles: 1260,
      path: ['Seattle, WA', 'Portland, OR', 'Sacramento, CA', 'San Francisco, CA', 'San Jose, CA', 'Los Angeles, CA', 'San Diego, CA'],
    },
    {
      name: 'Central North-South (Minneapolis - Dallas)',
      carrier: 'Windstream',
      type: 'long-haul',
      routeMiles: 950,
      path: ['Minneapolis, MN', 'Des Moines, IA', 'Kansas City, MO', 'Oklahoma City, OK', 'Dallas, TX'],
    },
    {
      name: 'Chicago - Atlanta via Nashville',
      carrier: 'AT&T',
      type: 'long-haul',
      routeMiles: 720,
      path: ['Chicago, IL', 'Indianapolis, IN', 'Louisville, KY', 'Nashville, TN', 'Atlanta, GA'],
    },
    {
      name: 'Chicago - Dallas via St. Louis',
      carrier: 'Lumen Technologies',
      type: 'long-haul',
      routeMiles: 920,
      path: ['Chicago, IL', 'St. Louis, MO', 'Memphis, TN', 'Dallas, TX'],
    },
    {
      name: 'Texas Triangle (Dallas - Houston - San Antonio)',
      carrier: 'AT&T',
      type: 'long-haul',
      routeMiles: 580,
      path: ['Dallas, TX', 'Austin, TX', 'San Antonio, TX', 'Houston, TX', 'Dallas, TX'],
    },
    {
      name: 'Atlanta - Dallas',
      carrier: 'Verizon',
      type: 'long-haul',
      routeMiles: 780,
      path: ['Atlanta, GA', 'Memphis, TN', 'Dallas, TX'],
    },

    // ═══════════════════════════════════════════
    // KEY INTERCONNECTION ROUTES
    // ═══════════════════════════════════════════
    {
      name: 'NYC - Chicago Direct',
      carrier: 'Zayo Group',
      type: 'long-haul',
      routeMiles: 790,
      path: ['New York, NY', 'Philadelphia, PA', 'Cleveland, OH', 'Chicago, IL'],
    },
    {
      name: 'Chicago - Detroit',
      carrier: 'AT&T',
      type: 'long-haul',
      routeMiles: 280,
      path: ['Chicago, IL', 'Detroit, MI'],
    },
    {
      name: 'Chicago - Milwaukee - Minneapolis',
      carrier: 'Lumen Technologies',
      type: 'long-haul',
      routeMiles: 410,
      path: ['Chicago, IL', 'Milwaukee, WI', 'Minneapolis, MN'],
    },
    {
      name: 'Omaha - Chicago',
      carrier: 'Windstream',
      type: 'long-haul',
      routeMiles: 470,
      path: ['Omaha, NE', 'Des Moines, IA', 'Chicago, IL'],
    },
    {
      name: 'Denver - Omaha - Chicago',
      carrier: 'Lumen Technologies',
      type: 'long-haul',
      routeMiles: 1000,
      path: ['Denver, CO', 'Cheyenne, WY', 'Omaha, NE', 'Des Moines, IA', 'Chicago, IL'],
    },
    {
      name: 'Denver - Albuquerque - Phoenix',
      carrier: 'Zayo Group',
      type: 'long-haul',
      routeMiles: 800,
      path: ['Denver, CO', 'Albuquerque, NM', 'Phoenix, AZ'],
    },
    {
      name: 'Denver - Dallas via OKC',
      carrier: 'Lumen Technologies',
      type: 'long-haul',
      routeMiles: 880,
      path: ['Denver, CO', 'Oklahoma City, OK', 'Dallas, TX'],
    },
    {
      name: 'Phoenix - Las Vegas - Salt Lake City',
      carrier: 'Zayo Group',
      type: 'long-haul',
      routeMiles: 660,
      path: ['Phoenix, AZ', 'Las Vegas, NV', 'Salt Lake City, UT'],
    },
    {
      name: 'LA - Las Vegas',
      carrier: 'Zayo Group',
      type: 'long-haul',
      routeMiles: 270,
      path: ['Los Angeles, CA', 'Las Vegas, NV'],
    },
    {
      name: 'LA - Phoenix',
      carrier: 'Verizon',
      type: 'long-haul',
      routeMiles: 370,
      path: ['Los Angeles, CA', 'Phoenix, AZ'],
    },
    {
      name: 'NYC - Virginia Beach (Cable Landing)',
      carrier: 'Multiple',
      type: 'long-haul',
      routeMiles: 350,
      path: ['New York, NY', 'Philadelphia, PA', 'Washington, DC', 'Virginia Beach, VA'],
    },
    {
      name: 'Houston - New Orleans - Jacksonville',
      carrier: 'AT&T',
      type: 'long-haul',
      routeMiles: 900,
      path: ['Houston, TX', 'New Orleans, LA', 'Jacksonville, FL'],
    },
    {
      name: 'Atlanta - Miami',
      carrier: 'Lumen Technologies',
      type: 'long-haul',
      routeMiles: 660,
      path: ['Atlanta, GA', 'Jacksonville, FL', 'Miami, FL'],
    },
    {
      name: 'Nashville - Atlanta',
      carrier: 'Zayo Group',
      type: 'long-haul',
      routeMiles: 250,
      path: ['Nashville, TN', 'Atlanta, GA'],
    },
    {
      name: 'Kansas City - St. Louis',
      carrier: 'AT&T',
      type: 'long-haul',
      routeMiles: 250,
      path: ['Kansas City, MO', 'St. Louis, MO'],
    },
    {
      name: 'Dallas - Houston',
      carrier: 'Lumen Technologies',
      type: 'long-haul',
      routeMiles: 240,
      path: ['Dallas, TX', 'Houston, TX'],
    },
    {
      name: 'SF Bay Area Ring (SF - San Jose)',
      carrier: 'Multiple',
      type: 'metro',
      routeMiles: 50,
      path: ['San Francisco, CA', 'San Jose, CA'],
    },
    {
      name: 'Tulsa - OKC - Dallas',
      carrier: 'Windstream',
      type: 'long-haul',
      routeMiles: 310,
      path: ['Tulsa, OK', 'Oklahoma City, OK', 'Dallas, TX'],
    },
  ];

  // Build GeoJSON features
  const features = routes.map((route, idx) => {
    const coordinates = route.path.map(cityName => {
      const coord = cities[cityName];
      if (!coord) {
        console.warn(`   Warning: No coordinates for city "${cityName}"`);
        return [0, 0];
      }
      return coord;
    });

    return {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates,
      },
      properties: {
        id: `fiber_${String(idx + 1).padStart(3, '0')}`,
        name: route.name,
        carrier: route.carrier,
        type: route.type,
        routeMiles: route.routeMiles,
      },
    };
  });

  const geojson = {
    type: 'FeatureCollection',
    metadata: {
      source: 'Curated from public carrier route information (Lumen/Level 3, Zayo, AT&T, Verizon, Crown Castle, Windstream)',
      description: 'Major US fiber backbone routes connecting primary interconnection points. Routes follow approximate major highway/rail corridors.',
      fetchDate: new Date().toISOString().split('T')[0],
      totalRoutes: features.length,
      note: 'Route geometries are simplified city-to-city paths. Actual fiber routes follow specific rights-of-way.',
    },
    features,
  };

  const outputPath = join(DATA_DIR, 'fiber-routes.geojson');
  writeFileSync(outputPath, JSON.stringify(geojson, null, 2));
  console.log(`   Wrote ${features.length} fiber routes to ${outputPath}`);

  // Print carrier summary
  const carriers = {};
  for (const r of routes) {
    carriers[r.carrier] = (carriers[r.carrier] || 0) + 1;
  }
  console.log('\n   Routes by carrier:');
  for (const [carrier, count] of Object.entries(carriers).sort((a, b) => b[1] - a[1])) {
    console.log(`     ${carrier}: ${count}`);
  }

  return features.length;
}


// ──────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────

async function main() {
  mkdirSync(DATA_DIR, { recursive: true });

  try {
    const cableCount = await fetchSubmarineCables();
    const fiberCount = buildFiberRoutes();

    console.log('\n════════════════════════════════════════');
    console.log('SUMMARY');
    console.log('════════════════════════════════════════');
    console.log(`Submarine cables: ${cableCount}`);
    console.log(`Fiber routes:     ${fiberCount}`);
    console.log(`Output dir:       ${DATA_DIR}`);
    console.log('════════════════════════════════════════');
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

main();
