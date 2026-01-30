// Current Data Implementation Status - NOT REAL-TIME

export interface DataSourceStatus {
  name: string
  type: "real" | "simulated" | "static"
  description: string
  implementation: string
}

export const currentDataSources: DataSourceStatus[] = [
  {
    name: "CVE Data",
    type: "static",
    description: "Hardcoded CVE entries in real-ti-data.ts",
    implementation: "Static array of mock CVE objects",
  },
  {
    name: "CISA KEV Catalog",
    type: "static",
    description: "Hardcoded KEV entries in real-ti-data.ts",
    implementation: "Static array of mock KEV objects",
  },
  {
    name: "APT Intelligence",
    type: "static",
    description: "Hardcoded APT campaign data in real-ti-data.ts",
    implementation: "Static array of mock APT objects",
  },
  {
    name: "Ransomware Intelligence",
    type: "static",
    description: "Hardcoded ransomware data in real-ti-data.ts",
    implementation: "Static array of mock ransomware objects",
  },
  {
    name: "RSS Feed Parser",
    type: "simulated",
    description: "TIFeedParser generates fake RSS data",
    implementation: "Returns hardcoded mock objects instead of parsing real feeds",
  },
  {
    name: "Real-time Alerts",
    type: "simulated",
    description: "RealTimeStatus generates fake alerts using Math.random()",
    implementation: "setInterval with random alert generation",
  },
  {
    name: "System Status",
    type: "simulated",
    description: "Mock system health metrics",
    implementation: "Random response times and status updates",
  },
]

// What would be needed for REAL real-time implementation
export const requiredRealTimeImplementation = {
  apis: [
    "NIST NVD API (https://services.nvd.nist.gov/rest/json/cves/2.0/)",
    "CISA KEV API (https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json)",
    "RSS Feed Parsers for security vendors",
    "STIX/TAXII threat intelligence feeds",
    "Commercial TI APIs (Mandiant, CrowdStrike, etc.)",
  ],
  databases: [
    "PostgreSQL/MongoDB for storing processed threat data",
    "Redis for caching and real-time updates",
    "Time-series database for historical trends",
  ],
  infrastructure: [
    "WebSocket connections for real-time updates",
    "Background job processing for feed ingestion",
    "Rate limiting and API key management",
    "Error handling and retry logic",
  ],
}
