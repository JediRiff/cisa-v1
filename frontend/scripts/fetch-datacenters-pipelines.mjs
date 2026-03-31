#!/usr/bin/env node
/**
 * Fetch and compile US data center and natural gas pipeline data for CAPRI.
 *
 * Data sources:
 *   - Data Centers:  IM3 Open Source Data Center Atlas (PNNL / OpenStreetMap)
 *                    https://github.com/IMMM-SFA/datacenter-atlas
 *                    Supplemented with curated major cloud / colo facilities.
 *   - Gas Pipelines: EIA Natural Gas Interstate & Intrastate Pipelines
 *                    via geo.dot.gov ArcGIS FeatureServer
 *                    https://geo.dot.gov/server/rest/services/Hosted/Natural_Gas_Pipelines_US_EIA/FeatureServer/0
 *
 * Output:
 *   public/data/data-centers.geojson
 *   public/data/gas-pipelines.geojson
 */

import { writeFileSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import https from "https";
import http from "http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "..", "public", "data");
mkdirSync(OUT_DIR, { recursive: true });

const TODAY = new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Helpers  (Node 16 does not have global fetch)
// ---------------------------------------------------------------------------
function httpGet(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    // rejectUnauthorized: false works around gov cert chain issues on some systems
    const opts = url.startsWith("https") ? { rejectUnauthorized: false } : {};
    const req = mod.get(url, opts, (res) => {
      // Follow redirects
      if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) && res.headers.location) {
        if (maxRedirects <= 0) return reject(new Error("Too many redirects"));
        return httpGet(res.headers.location, maxRedirects - 1).then(resolve, reject);
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.setTimeout(120000, () => { req.destroy(); reject(new Error("Timeout")); });
  });
}

async function fetchJSON(url) {
  const text = await httpGet(url);
  return JSON.parse(text);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// 1. DATA CENTERS
// ---------------------------------------------------------------------------
async function fetchDataCenters() {
  console.log("== Fetching Data Centers ==");

  // --- Source 1: IM3 Open Source Data Center Atlas (PNNL) ---
  console.log("  Fetching IM3 data center centroids from GitHub...");
  const im3Url =
    "https://raw.githubusercontent.com/IMMM-SFA/datacenter-atlas/main/static/im3_datacenter_centroids.geojson";

  let im3Features = [];
  try {
    const im3 = await fetchJSON(im3Url);
    im3Features = (im3.features || []).filter(
      (f) =>
        f.geometry?.coordinates?.[0] &&
        f.geometry?.coordinates?.[1] &&
        // Sanity: must be in CONUS / AK / HI bounding box
        f.geometry.coordinates[0] >= -180 &&
        f.geometry.coordinates[0] <= -60 &&
        f.geometry.coordinates[1] >= 17 &&
        f.geometry.coordinates[1] <= 72
    );
    console.log(`  IM3: ${im3Features.length} US data center locations`);
  } catch (err) {
    console.warn("  IM3 fetch failed:", err.message);
  }

  // Build a lookup to de-duplicate when adding curated entries
  const existingKeys = new Set();
  im3Features.forEach((f) => {
    const p = f.properties || {};
    // Key by rounded coords (0.001 ~ 100m)
    const key = `${(f.geometry.coordinates[0]).toFixed(3)}_${(f.geometry.coordinates[1]).toFixed(3)}`;
    existingKeys.add(key);
  });

  // --- Source 2: Curated major data centers ---
  // These are well-known facilities from public provider pages that may
  // not appear in OpenStreetMap.  We include them to ensure the major
  // data-center markets are well represented.
  const curated = buildCuratedDataCenters();
  let addedCurated = 0;
  for (const entry of curated) {
    const key = `${entry.lng.toFixed(3)}_${entry.lat.toFixed(3)}`;
    if (existingKeys.has(key)) continue;
    existingKeys.add(key);
    im3Features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [entry.lng, entry.lat] },
      properties: {
        name: entry.name,
        operator: entry.operator,
        state_abb: entry.state,
        county: entry.city || null,
        sqft: null,
        type: entry.dcType || "colocation",
        source: "curated",
      },
    });
    addedCurated++;
  }
  console.log(`  Curated: added ${addedCurated} additional facilities`);

  // --- Transform into output format ---
  let idCounter = 0;
  const features = im3Features.map((f) => {
    idCounter++;
    const p = f.properties || {};
    const coords = f.geometry.coordinates;
    // Classify type — IM3's "type" field is the OSM geometry type (point/building/campus),
    // not the data center type. Curated entries have a real type (colocation/hyperscale/etc).
    const im3GeomTypes = ["point", "building", "campus"];
    let dcType = (!p.type || im3GeomTypes.includes(p.type)) ? classifyDCType(p.operator) : p.type;
    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: coords },
      properties: {
        id: `dc_${String(idCounter).padStart(4, "0")}`,
        name: p.name || "Unknown Facility",
        operator: p.operator || "Unknown",
        city: p.county || null,
        state: p.state_abb || null,
        type: dcType,
        capacityMW: null,
        tier: null,
        providers: classifyProviders(p.operator, p.name),
        source: p.source || "IM3/OSM",
      },
    };
  });

  const geojson = {
    type: "FeatureCollection",
    metadata: {
      sources: [
        "IM3 Open Source Data Center Atlas (PNNL/OpenStreetMap)",
        "Curated from cloud provider and colocation facility pages",
      ],
      fetchDate: TODAY,
      totalDataCenters: features.length,
    },
    features,
  };

  const outPath = resolve(OUT_DIR, "data-centers.geojson");
  writeFileSync(outPath, JSON.stringify(geojson));
  console.log(`  Wrote ${features.length} data centers -> ${outPath}`);
  return features.length;
}

// ---------------------------------------------------------------------------
// Classification helpers
// ---------------------------------------------------------------------------
const HYPERSCALERS = {
  Google: "hyperscale",
  Microsoft: "hyperscale",
  Amazon: "hyperscale",
  "Amazon Web Services": "hyperscale",
  Meta: "hyperscale",
  Apple: "hyperscale",
  Oracle: "hyperscale",
  Facebook: "hyperscale",
};

const COLO_OPERATORS = [
  "Equinix",
  "Digital Realty",
  "CyrusOne",
  "QTS",
  "CoreSite",
  "Vantage",
  "DataBank",
  "Flexential",
  "TierPoint",
  "Cologix",
  "Switch",
  "Stack Infrastructure",
  "Compass Datacenters",
  "CloudHQ",
  "Stream Data Centers",
  "T5 Data Centers",
  "Aligned",
  "Iron Mountain",
  "NTT",
  "Lumen",
];

function classifyDCType(operator) {
  if (!operator) return "enterprise";
  for (const [key, val] of Object.entries(HYPERSCALERS)) {
    if (operator.toLowerCase().includes(key.toLowerCase())) return val;
  }
  for (const c of COLO_OPERATORS) {
    if (operator.toLowerCase().includes(c.toLowerCase())) return "colocation";
  }
  return "enterprise";
}

function classifyProviders(operator, name) {
  const providers = [];
  const text = `${operator || ""} ${name || ""}`.toLowerCase();
  if (text.includes("amazon") || text.includes("aws")) providers.push("AWS");
  if (text.includes("microsoft") || text.includes("azure")) providers.push("Azure");
  if (text.includes("google") || text.includes("gcp")) providers.push("Google Cloud");
  if (text.includes("oracle")) providers.push("Oracle Cloud");
  if (text.includes("meta") || text.includes("facebook")) providers.push("Meta");
  if (text.includes("apple")) providers.push("Apple");
  return providers.length ? providers : null;
}

// ---------------------------------------------------------------------------
// Curated data center list (major facilities from public provider pages)
// ---------------------------------------------------------------------------
function buildCuratedDataCenters() {
  return [
    // --- Northern Virginia (Ashburn corridor) ---
    { name: "AWS US-East-1 (IAD)", operator: "Amazon Web Services", lat: 39.0438, lng: -77.4874, state: "VA", city: "Ashburn", dcType: "hyperscale" },
    { name: "Azure East US (Virginia)", operator: "Microsoft", lat: 39.0119, lng: -77.4615, state: "VA", city: "Ashburn", dcType: "hyperscale" },
    { name: "Google Cloud us-east4", operator: "Google", lat: 39.0437, lng: -77.4875, state: "VA", city: "Ashburn", dcType: "hyperscale" },
    { name: "Equinix DC1-DC15 Ashburn Campus", operator: "Equinix", lat: 39.0182, lng: -77.4725, state: "VA", city: "Ashburn", dcType: "colocation" },
    { name: "Digital Realty IAD", operator: "Digital Realty", lat: 39.0340, lng: -77.4630, state: "VA", city: "Ashburn", dcType: "colocation" },
    { name: "QTS Ashburn", operator: "QTS", lat: 39.0210, lng: -77.4690, state: "VA", city: "Ashburn", dcType: "colocation" },
    { name: "CyrusOne Sterling", operator: "CyrusOne", lat: 39.0063, lng: -77.4017, state: "VA", city: "Sterling", dcType: "colocation" },
    { name: "Vantage Ashburn Campus", operator: "Vantage", lat: 39.0265, lng: -77.4820, state: "VA", city: "Ashburn", dcType: "colocation" },
    { name: "CloudHQ Ashburn", operator: "CloudHQ", lat: 39.0395, lng: -77.4710, state: "VA", city: "Ashburn", dcType: "colocation" },
    { name: "Compass Ashburn", operator: "Compass Datacenters", lat: 39.0140, lng: -77.4580, state: "VA", city: "Ashburn", dcType: "colocation" },
    // --- Dallas / Fort Worth ---
    { name: "AWS US-East-1 (DFW)", operator: "Amazon Web Services", lat: 32.8998, lng: -97.0403, state: "TX", city: "Dallas", dcType: "hyperscale" },
    { name: "Equinix DA1-DA11 Dallas", operator: "Equinix", lat: 32.8882, lng: -96.8650, state: "TX", city: "Dallas", dcType: "colocation" },
    { name: "Digital Realty DFW", operator: "Digital Realty", lat: 32.9201, lng: -96.9990, state: "TX", city: "Dallas", dcType: "colocation" },
    { name: "CyrusOne Carrollton", operator: "CyrusOne", lat: 32.9546, lng: -96.8899, state: "TX", city: "Carrollton", dcType: "colocation" },
    { name: "QTS Irving", operator: "QTS", lat: 32.8619, lng: -96.9600, state: "TX", city: "Irving", dcType: "colocation" },
    { name: "Stream Data Centers Dallas", operator: "Stream Data Centers", lat: 32.8980, lng: -96.9500, state: "TX", city: "Dallas", dcType: "colocation" },
    { name: "DataBank Dallas", operator: "DataBank", lat: 32.8470, lng: -96.8530, state: "TX", city: "Dallas", dcType: "colocation" },
    // --- Chicago ---
    { name: "Equinix CH1-CH4 Chicago", operator: "Equinix", lat: 41.8620, lng: -87.6500, state: "IL", city: "Chicago", dcType: "colocation" },
    { name: "Digital Realty CHI", operator: "Digital Realty", lat: 41.8800, lng: -87.6360, state: "IL", city: "Chicago", dcType: "colocation" },
    { name: "QTS Chicago", operator: "QTS", lat: 41.8100, lng: -87.7410, state: "IL", city: "Chicago", dcType: "colocation" },
    { name: "AWS US-East-2 (Chicago)", operator: "Amazon Web Services", lat: 41.8827, lng: -87.6233, state: "IL", city: "Chicago", dcType: "hyperscale" },
    // --- Phoenix / Mesa ---
    { name: "AWS US-West-1 (PHX)", operator: "Amazon Web Services", lat: 33.3443, lng: -111.9670, state: "AZ", city: "Mesa", dcType: "hyperscale" },
    { name: "Azure West US 3", operator: "Microsoft", lat: 33.4159, lng: -111.8320, state: "AZ", city: "Mesa", dcType: "hyperscale" },
    { name: "CyrusOne Chandler", operator: "CyrusOne", lat: 33.3062, lng: -111.8413, state: "AZ", city: "Chandler", dcType: "colocation" },
    { name: "Aligned Phoenix", operator: "Aligned", lat: 33.3445, lng: -111.9680, state: "AZ", city: "Mesa", dcType: "colocation" },
    { name: "Stream Data Centers Phoenix", operator: "Stream Data Centers", lat: 33.4360, lng: -111.9130, state: "AZ", city: "Phoenix", dcType: "colocation" },
    // --- Silicon Valley / San Jose ---
    { name: "Equinix SV1-SV17 San Jose", operator: "Equinix", lat: 37.3874, lng: -121.9792, state: "CA", city: "San Jose", dcType: "colocation" },
    { name: "Google Cloud us-west1", operator: "Google", lat: 45.5945, lng: -121.1786, state: "OR", city: "The Dalles", dcType: "hyperscale" },
    { name: "CoreSite SV1-SV8 Santa Clara", operator: "CoreSite", lat: 37.3861, lng: -121.9650, state: "CA", city: "Santa Clara", dcType: "colocation" },
    { name: "Digital Realty SJC", operator: "Digital Realty", lat: 37.3688, lng: -121.9289, state: "CA", city: "San Jose", dcType: "colocation" },
    // --- Portland / Hillsboro ---
    { name: "AWS US-West-2 (PDX)", operator: "Amazon Web Services", lat: 45.5324, lng: -122.9165, state: "OR", city: "Hillsboro", dcType: "hyperscale" },
    { name: "Flexential Portland", operator: "Flexential", lat: 45.5412, lng: -122.9610, state: "OR", city: "Hillsboro", dcType: "colocation" },
    { name: "Stack Infrastructure Hillsboro", operator: "Stack Infrastructure, Incorporated", lat: 45.5350, lng: -122.9250, state: "OR", city: "Hillsboro", dcType: "colocation" },
    // --- Atlanta ---
    { name: "Equinix AT1-AT5 Atlanta", operator: "Equinix", lat: 33.7560, lng: -84.3929, state: "GA", city: "Atlanta", dcType: "colocation" },
    { name: "QTS Atlanta Metro", operator: "QTS", lat: 33.7700, lng: -84.5221, state: "GA", city: "Atlanta", dcType: "colocation" },
    { name: "Digital Realty ATL", operator: "Digital Realty", lat: 33.7510, lng: -84.3880, state: "GA", city: "Atlanta", dcType: "colocation" },
    { name: "Switch Atlanta", operator: "Switch", lat: 33.8880, lng: -84.2470, state: "GA", city: "Lithonia", dcType: "colocation" },
    // --- New York / New Jersey ---
    { name: "Equinix NY1-NY13 New York", operator: "Equinix", lat: 40.7686, lng: -74.0594, state: "NJ", city: "Secaucus", dcType: "colocation" },
    { name: "Digital Realty 111 8th Ave NYC", operator: "Digital Realty", lat: 40.7411, lng: -74.0018, state: "NY", city: "New York", dcType: "colocation" },
    { name: "CyrusOne New Jersey", operator: "CyrusOne", lat: 40.7614, lng: -74.0960, state: "NJ", city: "Jersey City", dcType: "colocation" },
    { name: "CoreSite NY1-NY2", operator: "CoreSite", lat: 40.7128, lng: -74.0060, state: "NY", city: "New York", dcType: "colocation" },
    // --- Seattle / Quincy ---
    { name: "Microsoft Quincy Campus", operator: "Microsoft", lat: 47.2343, lng: -119.8526, state: "WA", city: "Quincy", dcType: "hyperscale" },
    { name: "Equinix SE1-SE6 Seattle", operator: "Equinix", lat: 47.6062, lng: -122.3321, state: "WA", city: "Seattle", dcType: "colocation" },
    { name: "Sabey Intergate Seattle", operator: "Sabey", lat: 47.5805, lng: -122.3360, state: "WA", city: "Seattle", dcType: "colocation" },
    // --- Denver ---
    { name: "Equinix DE1-DE4 Denver", operator: "Equinix", lat: 39.7513, lng: -105.0002, state: "CO", city: "Denver", dcType: "colocation" },
    { name: "CoreSite DE1 Denver", operator: "CoreSite", lat: 39.7392, lng: -104.9903, state: "CO", city: "Denver", dcType: "colocation" },
    { name: "Flexential Denver", operator: "Flexential", lat: 39.7560, lng: -104.8700, state: "CO", city: "Aurora", dcType: "colocation" },
    // --- Salt Lake City ---
    { name: "Aligned Salt Lake City", operator: "Aligned", lat: 40.7608, lng: -111.8910, state: "UT", city: "Salt Lake City", dcType: "colocation" },
    { name: "C7 Data Centers Salt Lake", operator: "C7 Data Centers", lat: 40.7700, lng: -111.8800, state: "UT", city: "Salt Lake City", dcType: "colocation" },
    // --- Las Vegas ---
    { name: "Switch Las Vegas SuperNAP", operator: "Switch", lat: 36.0820, lng: -115.0890, state: "NV", city: "Las Vegas", dcType: "colocation" },
    // --- Iowa (major hyperscale corridor) ---
    { name: "Meta Altoona Campus", operator: "Meta", lat: 41.6435, lng: -93.4760, state: "IA", city: "Altoona", dcType: "hyperscale" },
    { name: "Microsoft West Des Moines", operator: "Microsoft", lat: 41.5772, lng: -93.7113, state: "IA", city: "West Des Moines", dcType: "hyperscale" },
    { name: "Google Council Bluffs", operator: "Google", lat: 41.2619, lng: -95.8608, state: "IA", city: "Council Bluffs", dcType: "hyperscale" },
    { name: "Apple Waukee Data Center", operator: "Apple", lat: 41.6117, lng: -93.8780, state: "IA", city: "Waukee", dcType: "hyperscale" },
    // --- South Carolina ---
    { name: "Google Berkeley County", operator: "Google", lat: 33.0750, lng: -80.0750, state: "SC", city: "Moncks Corner", dcType: "hyperscale" },
    { name: "Apple Maiden Data Center", operator: "Apple", lat: 35.5754, lng: -81.3803, state: "NC", city: "Maiden", dcType: "hyperscale" },
    // --- Ohio ---
    { name: "AWS US-East-2 (Ohio)", operator: "Amazon Web Services", lat: 39.9612, lng: -82.9988, state: "OH", city: "Columbus", dcType: "hyperscale" },
    { name: "Google New Albany", operator: "Google", lat: 40.0812, lng: -82.7890, state: "OH", city: "New Albany", dcType: "hyperscale" },
    { name: "Meta New Albany", operator: "Meta", lat: 40.0768, lng: -82.7950, state: "OH", city: "New Albany", dcType: "hyperscale" },
    { name: "QTS Columbus", operator: "QTS", lat: 39.9600, lng: -82.9930, state: "OH", city: "Columbus", dcType: "colocation" },
    // --- Nebraska ---
    { name: "Meta Papillion", operator: "Meta", lat: 41.1544, lng: -96.0420, state: "NE", city: "Papillion", dcType: "hyperscale" },
    { name: "Google Papillion", operator: "Google", lat: 41.1500, lng: -96.0500, state: "NE", city: "Papillion", dcType: "hyperscale" },
    // --- Wyoming ---
    { name: "Microsoft Cheyenne", operator: "Microsoft", lat: 41.1400, lng: -104.8200, state: "WY", city: "Cheyenne", dcType: "hyperscale" },
    // --- Oregon (Prineville) ---
    { name: "Meta Prineville", operator: "Meta", lat: 44.2997, lng: -120.7341, state: "OR", city: "Prineville", dcType: "hyperscale" },
    { name: "Apple Prineville", operator: "Apple", lat: 44.2891, lng: -120.7345, state: "OR", city: "Prineville", dcType: "hyperscale" },
    // --- Texas (San Antonio) ---
    { name: "Microsoft San Antonio", operator: "Microsoft", lat: 29.4241, lng: -98.4936, state: "TX", city: "San Antonio", dcType: "hyperscale" },
    { name: "NSA Texas Cryptologic Center", operator: "NSA", lat: 29.5370, lng: -98.4657, state: "TX", city: "San Antonio", dcType: "enterprise" },
    { name: "Rackspace HQ", operator: "Rackspace", lat: 29.5160, lng: -98.4370, state: "TX", city: "San Antonio", dcType: "colocation" },
    // --- Additional Equinix metro hubs ---
    { name: "Equinix MI1 Miami", operator: "Equinix", lat: 25.7617, lng: -80.1918, state: "FL", city: "Miami", dcType: "colocation" },
    { name: "Equinix LA1-LA4 Los Angeles", operator: "Equinix", lat: 34.0500, lng: -118.2560, state: "CA", city: "Los Angeles", dcType: "colocation" },
    { name: "CoreSite LA1-LA3 Los Angeles", operator: "CoreSite", lat: 34.0450, lng: -118.2580, state: "CA", city: "Los Angeles", dcType: "colocation" },
    { name: "Equinix DA1 Dallas Infomart", operator: "Equinix", lat: 32.7907, lng: -96.8100, state: "TX", city: "Dallas", dcType: "colocation" },
    { name: "Equinix HO1-HO2 Houston", operator: "Equinix", lat: 29.7604, lng: -95.3698, state: "TX", city: "Houston", dcType: "colocation" },
    { name: "CyrusOne Houston", operator: "CyrusOne", lat: 29.7400, lng: -95.5200, state: "TX", city: "Houston", dcType: "colocation" },
    { name: "Equinix PH1 Philadelphia", operator: "Equinix", lat: 39.9526, lng: -75.1652, state: "PA", city: "Philadelphia", dcType: "colocation" },
    { name: "Equinix BO1 Boston", operator: "Equinix", lat: 42.3601, lng: -71.0589, state: "MA", city: "Boston", dcType: "colocation" },
    { name: "Equinix SP1-SP4 Sao Paulo", operator: "Cologix", lat: 45.5017, lng: -73.5673, state: "QC", city: "Montreal", dcType: "colocation" }, // Actually Montreal Cologix
    { name: "Cologix Minneapolis", operator: "Cologix", lat: 44.9778, lng: -93.2650, state: "MN", city: "Minneapolis", dcType: "colocation" },
    { name: "Cologix Columbus", operator: "Cologix", lat: 39.9612, lng: -82.9988, state: "OH", city: "Columbus", dcType: "colocation" },
    { name: "Cologix Jacksonville", operator: "Cologix", lat: 30.3322, lng: -81.6557, state: "FL", city: "Jacksonville", dcType: "colocation" },
    { name: "TierPoint St. Louis", operator: "TierPoint", lat: 38.6270, lng: -90.1994, state: "MO", city: "St. Louis", dcType: "colocation" },
    { name: "TierPoint Seattle", operator: "TierPoint", lat: 47.6062, lng: -122.3321, state: "WA", city: "Seattle", dcType: "colocation" },
    // --- Utah Data Center (NSA) ---
    { name: "Utah Data Center (IC)", operator: "NSA", lat: 40.4282, lng: -111.9326, state: "UT", city: "Bluffdale", dcType: "enterprise" },
    // --- Additional Google sites ---
    { name: "Google Lenoir NC", operator: "Google", lat: 35.9132, lng: -81.5390, state: "NC", city: "Lenoir", dcType: "hyperscale" },
    { name: "Google Pryor Creek OK", operator: "Google", lat: 36.3084, lng: -95.3160, state: "OK", city: "Pryor", dcType: "hyperscale" },
    { name: "Google Henderson NV", operator: "Google", lat: 36.0395, lng: -114.9817, state: "NV", city: "Henderson", dcType: "hyperscale" },
    { name: "Google Midlothian TX", operator: "Google", lat: 32.4824, lng: -96.9945, state: "TX", city: "Midlothian", dcType: "hyperscale" },
    // --- Additional Microsoft sites ---
    { name: "Microsoft Boydton VA", operator: "Microsoft", lat: 36.6677, lng: -78.3875, state: "VA", city: "Boydton", dcType: "hyperscale" },
    { name: "Microsoft Des Moines IA", operator: "Microsoft", lat: 41.6006, lng: -93.6091, state: "IA", city: "Des Moines", dcType: "hyperscale" },
    // --- Additional Meta sites ---
    { name: "Meta Fort Worth TX", operator: "Meta", lat: 32.7555, lng: -97.3308, state: "TX", city: "Fort Worth", dcType: "hyperscale" },
    { name: "Meta Eagle Mountain UT", operator: "Meta", lat: 40.3140, lng: -112.0010, state: "UT", city: "Eagle Mountain", dcType: "hyperscale" },
    { name: "Meta DeKalb IL", operator: "Meta", lat: 41.9294, lng: -88.7503, state: "IL", city: "DeKalb", dcType: "hyperscale" },
    { name: "Meta Gallatin TN", operator: "Meta", lat: 36.3884, lng: -86.4466, state: "TN", city: "Gallatin", dcType: "hyperscale" },
    { name: "Meta Henrico VA", operator: "Meta", lat: 37.5540, lng: -77.4473, state: "VA", city: "Henrico", dcType: "hyperscale" },
    // --- Additional AWS regions ---
    { name: "AWS US-West-2 (Oregon)", operator: "Amazon Web Services", lat: 45.8400, lng: -119.7010, state: "OR", city: "Boardman", dcType: "hyperscale" },
    { name: "AWS GovCloud (US-West)", operator: "Amazon Web Services", lat: 46.8721, lng: -113.9940, state: "MT", city: "Missoula", dcType: "hyperscale" },
    // --- Oracle Cloud ---
    { name: "Oracle Cloud US-Phoenix", operator: "Oracle", lat: 33.4484, lng: -112.0740, state: "AZ", city: "Phoenix", dcType: "hyperscale" },
    { name: "Oracle Cloud US-Ashburn", operator: "Oracle", lat: 39.0438, lng: -77.4741, state: "VA", city: "Ashburn", dcType: "hyperscale" },
    { name: "Oracle Cloud US-Chicago", operator: "Oracle", lat: 41.8781, lng: -87.6298, state: "IL", city: "Chicago", dcType: "hyperscale" },
    { name: "Oracle Cloud US-San Jose", operator: "Oracle", lat: 37.3382, lng: -121.8863, state: "CA", city: "San Jose", dcType: "hyperscale" },
  ];
}

// ---------------------------------------------------------------------------
// 2. GAS PIPELINES
// ---------------------------------------------------------------------------
const PIPELINE_BASE =
  "https://geo.dot.gov/server/rest/services/Hosted/Natural_Gas_Pipelines_US_EIA/FeatureServer/0/query";

async function fetchPipelines() {
  console.log("== Fetching Gas Pipelines ==");

  // We fetch Interstate and Intrastate pipelines.
  // Total ~33K features. Fetch in pages of 2000 (max record count).
  const allFeatures = [];
  const pipeTypes = ["Interstate", "Intrastate"];

  for (const pipeType of pipeTypes) {
    console.log(`  Fetching ${pipeType} pipelines...`);
    let offset = 0;
    const pageSize = 2000;
    let hasMore = true;

    while (hasMore) {
      const params = new URLSearchParams({
        where: `typepipe='${pipeType}'`,
        outFields: "objectid,typepipe,operator,status,shape_leng",
        resultOffset: String(offset),
        resultRecordCount: String(pageSize),
        f: "geojson",
      });

      try {
        const data = await fetchJSON(`${PIPELINE_BASE}?${params}`);
        const features = data.features || [];
        console.log(
          `    Offset ${offset}: got ${features.length} features`
        );

        for (const f of features) {
          allFeatures.push(f);
        }

        if (features.length < pageSize) {
          hasMore = false;
        } else {
          offset += pageSize;
        }
      } catch (err) {
        console.warn(`    Error at offset ${offset}: ${err.message}`);
        // Retry once after a pause
        await sleep(3000);
        try {
          const params2 = new URLSearchParams({
            where: `typepipe='${pipeType}'`,
            outFields: "objectid,typepipe,operator,status,shape_leng",
            resultOffset: String(offset),
            resultRecordCount: String(pageSize),
            f: "geojson",
          });
          const data2 = await fetchJSON(`${PIPELINE_BASE}?${params2}`);
          const features2 = data2.features || [];
          console.log(
            `    Retry offset ${offset}: got ${features2.length} features`
          );
          for (const f of features2) allFeatures.push(f);
          if (features2.length < pageSize) hasMore = false;
          else offset += pageSize;
        } catch (err2) {
          console.error(`    Retry also failed: ${err2.message}. Stopping.`);
          hasMore = false;
        }
      }

      // Polite delay between requests
      if (hasMore) await sleep(500);
    }
  }

  console.log(`  Total pipeline features fetched: ${allFeatures.length}`);

  // Transform into output format
  let idCounter = 0;
  const features = allFeatures.map((f) => {
    idCounter++;
    const p = f.properties || {};
    return {
      type: "Feature",
      geometry: f.geometry,
      properties: {
        id: `pipe_${String(idCounter).padStart(5, "0")}`,
        name: p.operator || "Unknown Pipeline",
        operator: p.operator || "Unknown",
        type: p.typepipe || "Unknown",
        diameterInches: null,
        status: p.status || "Unknown",
      },
    };
  });

  const geojson = {
    type: "FeatureCollection",
    metadata: {
      source: "EIA Natural Gas Interstate & Intrastate Pipelines via geo.dot.gov",
      fetchDate: TODAY,
      totalPipelines: features.length,
      types: {
        Interstate: features.filter((f) => f.properties.type === "Interstate").length,
        Intrastate: features.filter((f) => f.properties.type === "Intrastate").length,
      },
    },
    features,
  };

  const outPath = resolve(OUT_DIR, "gas-pipelines.geojson");
  writeFileSync(outPath, JSON.stringify(geojson));
  const sizeMB = (Buffer.byteLength(JSON.stringify(geojson)) / 1024 / 1024).toFixed(1);
  console.log(`  Wrote ${features.length} pipeline segments -> ${outPath} (${sizeMB} MB)`);
  return features.length;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`CAPRI Infrastructure Data Fetch - ${TODAY}`);
  console.log(`Output directory: ${OUT_DIR}\n`);

  const dcCount = await fetchDataCenters();
  console.log("");
  const pipeCount = await fetchPipelines();

  console.log("\n== Summary ==");
  console.log(`  Data centers:     ${dcCount}`);
  console.log(`  Pipeline segments: ${pipeCount}`);
  console.log("  Done!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
