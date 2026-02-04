# CAPRI for NYU

## What

CAPRI-E monitors threat intelligence feeds from government agencies (CISA, NCSC) and security vendors (Microsoft, CrowdStrike, Palo Alto, etc.) to calculate a risk score specifically for energy sector organizations.

### Scoring System (s/o to US Cyber's CPCON)

- **5.0 (Normal)** - Baseline threat level
- **3.0 (Elevated)** - Heightened threat activity
- **1.0 (Severe)** - Active threats targeting energy sector

### Scoring

| Factor | Weight | Max Impact |
|--------|--------|------------|
| CISA KEV Entries | -0.3 each | -1.2 |
| Nation-State Activity | -0.4 each | -0.8 |
| ICS/SCADA Vulnerabilities | -0.3 each | -0.6 |
| Energy Sector Threats | -0.2 each | -0.8 |
| Vendor Critical Alerts | -0.15 each | -0.4 |

## Features

- Real-time threat intelligence from 12 sources
- CISA KEV integration with actionable recommendations
- ICS-CERT advisory tracking
- Score breakdown with contributing factors
- CISA source badges for authoritative items

## Tech Stack

- **Frontend:** Next.js 13, React, TypeScript
- **Styling:** Tailwind CSS
- **Deployment:** Vercel

## Data Sources

**Government:**
- CISA Known Exploited Vulnerabilities (KEV)
- CISA Cybersecurity Advisories
- CISA ICS-CERT Advisories
- UK NCSC Reports

**Vendors:**
- Microsoft Security
- Palo Alto Unit42
- CrowdStrike Intelligence
- SentinelOne Labs
- Cisco Talos
- Mandiant Threat Intel
- Google Threat Analysis Group
- The DFIR Report

## Contributing

Have feedback on the scoring weights? [Submit an issue](https://github.com/JediRiff/cisa-v1/issues/new?template=weight-adjustment.yml) to propose adjustments.

## License

MIT
