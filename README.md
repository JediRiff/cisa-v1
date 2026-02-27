# CAPRI - Cyber Alert Prioritization & Readiness Index

Real-time TI dashboard for US energy sector critical infra. Aggregates government and vendor feeds into a single risk score to help analysts prioritize response.

## Scoring

Score starts at 5.0 (Normal) and decreases based on active threats(inspired by  US Cyber Command CPCON).

| Factor | Per Item | Max Impact |
|--------|----------|------------|
| CISA KEV Entries | -0.3 | -1.2 |
| Nation-State Activity | -0.4 | -0.8 |
| ICS/SCADA Vulnerabilities | -0.3 | -0.6 |
| Energy Sector Threats | -0.2 | -0.8 |
| Vendor Critical Alerts | -0.15 | -0.4 |

| Level | Range | Meaning |
|-------|-------|---------|
| Severe | 1.0 - 2.0 | Active threats, immediate attention |
| Elevated | 2.1 - 3.0 | Heightened activity, enhanced monitoring |
| Normal | 3.1 - 5.0 | Baseline threat level |

## Tech Stack

- **Framework:** Next.js 13, React 18, TypeScript
- **Styling:** Tailwind CSS, DM Sans
- **3D Globe:** Three.js with TopoJSON country data
- **Charts:** Recharts
- **Deployment:** Vercel (for now)

## Sources

**Government**
- CISA Known Exploited Vulnerabilities (KEV)
- CISA Cybersecurity Advisories
- CISA ICS-CERT Advisories

**Vendor**
- Microsoft Security
- Palo Alto's Unit42
- CrowdStrike Intel
- SentinelOne Labs
- Mandiant / Google Threat Intelligence

## Contributing

We welcome contributors. If you want to improve the scoring model, add threat sources, or enhance the globe visualization, open a PR or [submit an issue](https://github.com/JediRiff/cisa-v1/issues/new).

## License

MIT
