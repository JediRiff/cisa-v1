"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, Clock, Target, Eye, Activity, RefreshCw, FileText, Search } from "lucide-react"
import type { Alert as AlertType } from "@/types/alert"

interface SecurityControlsProps {
  alerts: AlertType[]
  capriScore: {
    score: number
    breakdown: any
    rationale: string
  }
}

interface SecurityControl {
  id: string
  title: string
  nistFunction: "Identify" | "Protect" | "Detect" | "Respond" | "Recover"
  nistControl: string
  mitreDefense?: string
  priority: "Critical" | "High" | "Medium" | "Low"
  implementation: string
  timeframe: string
  resources: string[]
  sector?: string
}

interface MitreTechnique {
  id: string
  name: string
  tactic: string
  description: string
  countermeasures: string[]
  nistMapping: string[]
  sector?: string
}

export function SecurityControls({ alerts, capriScore }: SecurityControlsProps) {
  const [selectedLevel, setSelectedLevel] = useState<"critical" | "elevated" | "guarded" | "low">("elevated")
  const [selectedSector, setSelectedSector] = useState<string>("All Sectors")

  // Determine threat level based on CAPRI score
  const threatLevel = useMemo(() => {
    const score = capriScore.score
    if (score >= 4) return "critical"
    if (score >= 3) return "elevated"
    if (score >= 2) return "guarded"
    return "low"
  }, [capriScore.score])

  // NIST Controls mapped to CAPRI levels - Much more specific
  const nistControls = useMemo<Record<string, SecurityControl[]>>(
    () => ({
      critical: [
        // Universal Critical Controls
        {
          id: "AC-2(1)",
          title: "Automated Account Management - Disable Dormant Accounts",
          nistFunction: "Protect",
          nistControl: "AC-2(1): Account Management | Automated System Account Management",
          mitreDefense: "D3-AM: Account Monitoring",
          priority: "Critical",
          implementation: `
**Universal Implementation:**
- Deploy automated account lifecycle management
- Configure 30-day dormant account detection
- Implement automated disabling of unused accounts
- Set up privileged account monitoring
- Enable account activity baseline analysis`,
          timeframe: "0-2 hours",
          resources: ["Identity Management System", "SIEM Platform", "Automated Scripts"],
          sector: "All Sectors",
        },

        // Energy Sector Specific
        {
          id: "SC-7(4)-ENERGY",
          title: "ICS Network Segmentation - Air Gap Critical Systems",
          nistFunction: "Protect",
          nistControl: "SC-7(4): Boundary Protection | External Telecommunications Services",
          mitreDefense: "D3-NI: Network Isolation",
          priority: "Critical",
          implementation: `
**Energy Sector Implementation:**
- Deploy Schneider Electric EcoStruxure Security Admin
- Configure Rockwell FactoryTalk Security zones
- Implement Waterfall unidirectional gateways
- Set up Claroty OT asset discovery and monitoring
- Enable NERC CIP-005 compliant network segmentation
- Deploy Dragos industrial threat detection`,
          timeframe: "0-4 hours",
          resources: ["ICS Security Tools", "OT Monitoring", "Unidirectional Gateways", "NERC CIP Compliance"],
          sector: "Energy",
        },

        // Healthcare Sector Specific
        {
          id: "SI-4(23)-HEALTHCARE",
          title: "Medical Device Security Monitoring",
          nistFunction: "Detect",
          nistControl: "SI-4(23): System Monitoring | Host-Based Devices",
          mitreDefense: "D3-HBAM: Host-based Artifact Monitoring",
          priority: "Critical",
          implementation: `
**Healthcare Sector Implementation:**
- Deploy Medigate medical device security platform
- Configure Epic/Cerner EHR audit monitoring
- Implement Philips IntelliSpace security controls
- Set up HIPAA-compliant device authentication
- Enable medical IoT device behavioral analysis
- Deploy FDA cybersecurity compliance monitoring`,
          timeframe: "0-6 hours",
          resources: ["Medical Device Security", "EHR Monitoring", "HIPAA Compliance Tools", "FDA Guidelines"],
          sector: "Healthcare",
        },

        // Finance Sector Specific
        {
          id: "AU-6(5)-FINANCE",
          title: "Financial Transaction Monitoring & AML Compliance",
          nistFunction: "Detect",
          nistControl:
            "AU-6(5): Audit Review, Analysis, and Reporting | Integration / Scanning and Monitoring Capabilities",
          mitreDefense: "D3-FAPA: Financial Application Protection",
          priority: "Critical",
          implementation: `
**Finance Sector Implementation:**
- Deploy SWIFT Customer Security Programme (CSP) controls
- Configure real-time transaction fraud detection
- Implement Anti-Money Laundering (AML) monitoring
- Set up PCI DSS compliance scanning
- Enable SOX 404 audit trail monitoring
- Deploy blockchain transaction verification`,
          timeframe: "0-2 hours",
          resources: ["SWIFT Security", "AML Systems", "PCI DSS Tools", "SOX Compliance", "Fraud Detection"],
          sector: "Finance",
        },
        {
          id: "SI-4(2)",
          title: "System Monitoring - Automated Tools and Mechanisms",
          nistFunction: "Detect",
          nistControl: "SI-4(2): System Monitoring | Automated Tools",
          mitreDefense: "D3-NTM: Network Traffic Monitoring",
          priority: "Critical",
          implementation: `
**Splunk Enterprise Security:**
\`\`\`spl
# Lateral Movement Detection
index=windows EventCode=4624 LogonType=3 
| eval src_category=if(cidrmatch("10.0.0.0/8", src_ip) OR cidrmatch("172.16.0.0/12", src_ip) OR cidrmatch("192.168.0.0/16", src_ip), "internal", "external")
| where src_category="internal"
| stats dc(dest_ip) as unique_destinations by src_ip, user
| where unique_destinations > 10
| eval risk_score = unique_destinations * 10
\`\`\`

**QRadar SIEM:**
\`\`\`sql
SELECT sourceip, destinationip, username, COUNT(*) as connection_count
FROM events 
WHERE eventname = 'Authentication Success' 
  AND LOGSOURCETYPENAME(devicetype) = 'Microsoft Windows Security Event Log'
  AND eventtime > CURRENT_TIMESTAMP - INTERVAL '1' HOUR
GROUP BY sourceip, destinationip, username
HAVING COUNT(*) > 50
\`\`\`

**Elastic Security (EQL):**
\`\`\`eql
sequence by user.name with maxspan=1h
  [authentication where event.outcome == "success"]
  [network where destination.ip != source.ip]
  [process where process.name == "net.exe"]
\`\`\`

**CrowdStrike Falcon - Custom IOA:**
\`\`\`json
{
  "name": "Lateral Movement via RDP",
  "description": "Detects potential lateral movement using RDP",
  "severity": "High",
  "pattern": {
    "process_name": "mstsc.exe",
    "command_line": "**/v:**",
    "parent_process": "cmd.exe"
  }
}
\`\`\`

**Darktrace DETECT - AI-Powered Network Monitoring:**
\`\`\`python
# Cyber AI Analyst - Lateral Movement Detection
{
  "model_name": "Device / Lateral Movement",
  "ai_investigation": {
    "pattern_analysis": "Unusual internal network connections detected",
    "behavioral_baseline": "Device typically connects to 3-5 internal hosts",
    "current_behavior": "Device connected to 47 internal hosts in 10 minutes",
    "threat_indicators": [
      "SMB enumeration across multiple subnets",
      "RDP connections to domain controllers", 
      "Credential dumping signatures detected",
      "Process injection into legitimate services"
    ],
    "attack_chain_reconstruction": [
      "Initial compromise via phishing email",
      "Credential harvesting from LSASS",
      "Lateral movement via stolen credentials",
      "Privilege escalation attempt"
    ]
  },
  "autonomous_response": {
    "antigena_network": {
      "action": "Block connections to critical assets",
      "scope": "Device-specific firewall rules",
      "duration": "Until manual review"
    },
    "antigena_email": {
      "action": "Quarantine similar emails",
      "pattern_matching": "Sender reputation and attachment analysis"
    }
  },
  "threat_score": 0.98,
  "certainty": 0.92
}

# Darktrace Advanced Search - Custom Threat Hunting
search_query = {
  "query": {
    "bool": {
      "must": [
        {"range": {"@timestamp": {"gte": "now-1h"}}},
        {"term": {"model_name": "Device / Lateral Movement"}},
        {"range": {"threat_score": {"gte": 0.8}}}
      ]
    }
  },
  "aggs": {
    "affected_devices": {
      "terms": {"field": "device.hostname"},
      "aggs": {
        "connection_count": {"sum": {"field": "connection_count"}},
        "unique_destinations": {"cardinality": {"field": "destination_ip"}}
      }
    }
  }
}
\`\`\``,
          timeframe: "0-6 hours",
          resources: ["Splunk ES", "IBM QRadar", "Elastic Security", "CrowdStrike Falcon", "Darktrace DETECT"],
          sector: "Energy, Finance, Healthcare",
        },
        {
          id: "IR-4(1)",
          title: "Incident Handling - Automated Incident Handling Processes",
          nistFunction: "Respond",
          nistControl: "IR-4(1): Incident Handling | Automated Incident Handling",
          mitreDefense: "D3-IRA: Incident Response Activation",
          priority: "Critical",
          implementation: `
**Phantom/SOAR (Splunk):**
\`\`\`python
# Automated Containment Playbook
def contain_endpoint(container, results, handle, filtered_artifacts, filtered_results):
    # Get endpoint details
    endpoint_ip = container['artifacts'][0]['cef']['sourceAddress']
    
    # CrowdStrike Contain Host
    crowdstrike_contain_host(endpoint_ip)
    
    # Palo Alto Firewall Block
    palo_alto_block_ip(endpoint_ip)
    
    # Collect forensic data
    collect_memory_dump(endpoint_ip)
    
    # Notify stakeholders
    send_teams_notification(f"Endpoint {endpoint_ip} contained automatically")
\`\`\`

**Microsoft Sentinel - Logic Apps:**
\`\`\`json
{
  "definition": {
    "triggers": {
      "When_Azure_Sentinel_incident_is_created": {
        "type": "ApiConnectionWebhook",
        "inputs": {
          "host": {
            "connection": {
              "name": "@parameters('$connections')['azuresentinel']['connectionId']"
            }
          }
        }
      }
    },
    "actions": {
      "Isolate_Machine": {
        "type": "ApiConnection",
        "inputs": {
          "host": {
            "connection": {
              "name": "@parameters('$connections')['microsoftdefenderatp']['connectionId']"
            }
          },
          "method": "post",
          "path": "/api/machines/@{triggerBody()?['object']?['properties']?['relatedEntities'][0]?['properties']?['azureID']}/isolate"
        }
      }
    }
  }
}
\`\`\`

**Cortex XSOAR:**
\`\`\`python
# Incident Response Automation
def main():
    incident = demisto.incident()
    
    # Extract IOCs
    iocs = extract_iocs(incident['details'])
    
    # Block IOCs in Palo Alto Firewall
    for ioc in iocs:
        demisto.executeCommand('panorama-block-ip', {'ip': ioc})
    
    # Isolate endpoints via Cortex XDR
    endpoints = get_affected_endpoints(incident)
    for endpoint in endpoints:
        demisto.executeCommand('xdr-isolate-endpoint', {'endpoint_id': endpoint})
    
    # Create timeline
    timeline = create_incident_timeline(incident)
    demisto.results(timeline)
\`\`\`

**ServiceNow Security Operations:**
\`\`\`javascript
// Automated Incident Response Workflow
(function executeRule(current, previous /*null when async*/) {
    
    // Auto-assign based on severity
    if (current.severity == '1') {
        current.assigned_to = gs.getProperty('security.tier1.lead');
        current.escalation = '15'; // 15 minutes
    }
    
    // Trigger containment actions
    var restMessage = new sn_ws.RESTMessageV2('CrowdStrike_Contain', 'POST');
    restMessage.setStringParameterNoEscape('endpoint_id', current.u_endpoint_id);
    var response = restMessage.execute();
    
    // Update incident with containment status
    current.u_containment_status = 'In Progress';
    current.work_notes = 'Automated containment initiated via CrowdStrike';
    
})(current, previous);
\`\`\`

**Darktrace RESPOND - Autonomous Incident Response:**
\`\`\`python
# Cyber AI Analyst - Automated Incident Investigation
class DarktraceIncidentResponse:
    def __init__(self, api_endpoint, auth_token):
        self.api_endpoint = api_endpoint
        self.auth_token = auth_token
    
    def autonomous_investigation(self, incident_id):
        # AI Analyst automatically investigates the incident
        investigation = {
            "incident_id": incident_id,
            "ai_analyst_findings": {
                "attack_timeline": self.reconstruct_attack_chain(incident_id),
                "affected_assets": self.identify_compromised_devices(incident_id),
                "data_exfiltration_risk": self.assess_data_risk(incident_id),
                "threat_actor_ttp": self.map_mitre_techniques(incident_id)
            },
            "recommended_actions": [
                "Isolate affected endpoints via Antigena Network",
                "Block C2 communications at network perimeter", 
                "Quarantine suspicious email attachments",
                "Reset credentials for affected user accounts"
            ]
        }
        
        # Autonomous Response via Antigena
        if investigation["ai_analyst_findings"]["data_exfiltration_risk"] > 0.8:
            self.trigger_antigena_response(incident_id, "high_severity")
        
        return investigation
    
    def trigger_antigena_response(self, incident_id, severity_level):
        antigena_actions = {
            "network_containment": {
                "block_external_connections": True,
                "isolate_affected_devices": True,
                "preserve_forensic_evidence": True
            },
            "email_protection": {
                "quarantine_similar_threats": True,
                "update_sender_reputation": True,
                "enhance_attachment_scanning": True
            },
            "user_protection": {
                "enforce_additional_authentication": True,
                "restrict_privileged_access": True,
                "monitor_account_activity": True
            }
        }
        
        response = requests.post(
            f"{self.api_endpoint}/api/antigena/autonomous-response",
            headers={"Authorization": f"Bearer {self.auth_token}"},
            json={
                "incident_id": incident_id,
                "severity": severity_level,
                "actions": antigena_actions,
                "learning_mode": False  # Take active measures
            }
        )
        return response.json()

# Real-time Threat Briefing Generation
def generate_executive_briefing(incident_data):
    briefing = {
        "executive_summary": f"AI detected {incident_data['attack_type']} with {incident_data['certainty']*100}% confidence",
        "business_impact": incident_data['ai_analyst']['business_risk_assessment'],
        "technical_details": incident_data['ai_analyst']['technical_analysis'],
        "recommended_actions": incident_data['ai_analyst']['recommended_actions'],
        "timeline": incident_data['attack_timeline'],
        "affected_systems": len(incident_data['compromised_devices']),
        "containment_status": incident_data['antigena_response']['status']
    }
    return briefing
\`\`\``,
          timeframe: "0-1 hour",
          resources: ["Splunk Phantom", "Microsoft Sentinel", "Cortex XSOAR", "ServiceNow SecOps", "Darktrace RESPOND"],
          sector: "All Sectors",
        },
        {
          id: "AU-6(1)",
          title: "Audit Review - Process Integration",
          nistFunction: "Detect",
          nistControl: "AU-6(1): Audit Review, Analysis, and Reporting | Process Integration",
          mitreDefense: "D3-LAM: Log Analysis and Monitoring",
          priority: "High",
          implementation: `
**Splunk Enterprise Security - Correlation Rules:**
\`\`\`spl
# Suspicious PowerShell Activity
index=windows EventCode=4688 Process_Name="*powershell.exe" 
| rex field=Process_Command_Line "(?<encoded_command>-[eE][nN][cC][oO][dD][eE][dD][cC][oO][mM][mM][aA][nN][dD]\\s+(?<base64_payload>[A-Za-z0-9+/=]+))"
| eval decoded_command=base64decode(base64_payload)
| where match(decoded_command, "(?i)(invoke-expression|iex|downloadstring|webclient)")
| eval risk_score=case(
    match(decoded_command, "(?i)invoke-expression"), 75,
    match(decoded_command, "(?i)downloadstring"), 85,
    1==1, 50
)
| collect index=notable_events
\`\`\`

**Microsoft Sentinel - Analytics Rules:**
\`\`\`kql
// Suspicious Process Execution Chain
SecurityEvent
| where EventID == 4688
| where Process contains "powershell.exe" and CommandLine contains "-enc"
| extend DecodedCommand = base64_decode_tostring(extract(@"-enc\s+([A-Za-z0-9+/=]+)", 1, CommandLine))
| where DecodedCommand contains "DownloadString" or DecodedCommand contains "Invoke-Expression"
| summarize StartTime = min(TimeGenerated), EndTime = max(TimeGenerated), 
           CommandCount = count() by Computer, Account, ParentProcessName
| where CommandCount > 3
| extend Severity = case(CommandCount > 10, "High", CommandCount > 5, "Medium", "Low")
\`\`\`

**Elastic Security - Detection Rules:**
\`\`\`json
{
  "rule": {
    "name": "Encoded PowerShell Command Execution",
    "description": "Detects execution of encoded PowerShell commands",
    "risk_score": 75,
    "severity": "high",
    "type": "eql",
    "query": "process where event.type == \\"start\\" and process.name : \\"powershell.exe\\" and process.args : \\"-enc*\\" and process.args : \\"*DownloadString*\\"",
    "threat": [
      {
        "framework": "MITRE ATT&CK",
        "tactic": {
          "id": "TA0002",
          "name": "Execution"
        },
        "technique": [
          {
            "id": "T1059.001",
            "name": "PowerShell"
          }
        ]
      }
    ]
  }
}
\`\`\`

**IBM QRadar - Custom Rules:**
\`\`\`sql
SELECT 
    sourceip, 
    destinationip, 
    username,
    "Process Command Line" as command_line,
    COUNT(*) as event_count
FROM events 
WHERE 
    "Event Name" = 'Process Create' 
    AND "Process Command Line" ILIKE '%powershell%'
    AND "Process Command Line" ILIKE '%-enc%'
    AND eventtime > CURRENT_TIMESTAMP - INTERVAL '1' HOUR
GROUP BY sourceip, destinationip, username, "Process Command Line"
HAVING COUNT(*) > 5
\`\`\`

**Darktrace DETECT - AI-Driven Log Analysis:**
\`\`\`python
# Cyber AI Models for Advanced Threat Detection
darktrace_models = {
    "powershell_anomalies": {
        "model_name": "Device / PowerShell Anomaly",
        "description": "AI detects unusual PowerShell execution patterns",
        "learning_baseline": "Normal PowerShell usage patterns per user/device",
        "anomaly_detection": {
            "encoded_commands": "Base64 encoded PowerShell detected",
            "download_behavior": "PowerShell downloading external content",
            "execution_frequency": "Unusual frequency of PowerShell execution",
            "privilege_context": "PowerShell running with elevated privileges"
        },
        "ai_correlation": [
            "Cross-reference with email security events",
            "Correlate with network connection anomalies", 
            "Analyze process injection signatures",
            "Map to MITRE ATT&CK framework"
        ]
    },
    
    "credential_intelligence": {
        "model_name": "Credential Intelligence / Unusual Activity",
        "ai_analysis": {
            "pattern_recognition": "AI learns normal credential usage patterns",
            "anomaly_scoring": "Behavioral deviation from established baseline",
            "context_awareness": "Time, location, and resource access patterns",
            "threat_correlation": "Links credential abuse to broader attack campaigns"
        },
        "autonomous_learning": {
            "unsupervised_ml": "Continuously learns new attack patterns",
            "threat_landscape_adaptation": "Adapts to emerging credential attack techniques",
            "false_positive_reduction": "Self-tuning to reduce alert fatigue"
        }
    }
}

# Darktrace Threat Visualizer - Attack Chain Reconstruction
def visualize_attack_chain(incident_id):
    attack_visualization = {
        "nodes": [
            {"id": "initial_access", "type": "email_phishing", "timestamp": "2024-01-15T09:30:00Z"},
            {"id": "execution", "type": "powershell_encoded", "timestamp": "2024-01-15T09:32:15Z"},
            {"id": "credential_access", "type": "lsass_dump", "timestamp": "2024-01-15T09:35:22Z"},
            {"id": "lateral_movement", "type": "rdp_bruteforce", "timestamp": "2024-01-15T09:40:11Z"},
            {"id": "exfiltration", "type": "data_staging", "timestamp": "2024-01-15T10:15:33Z"}
        ],
        "edges": [
            {"source": "initial_access", "target": "execution", "confidence": 0.95},
            {"source": "execution", "target": "credential_access", "confidence": 0.89},
            {"source": "credential_access", "target": "lateral_movement", "confidence": 0.92},
            {"source": "lateral_movement", "target": "exfiltration", "confidence": 0.87}
        ],
        "ai_insights": {
            "attack_sophistication": "Advanced - Multi-stage attack with evasion techniques",
            "threat_actor_profile": "APT-style behavior with financial motivation indicators",
            "success_probability": "High - Multiple security controls bypassed",
            "recommended_priority": "Critical - Immediate containment required"
        }
    }
    return attack_visualization
\`\`\``,
          timeframe: "6-12 hours",
          resources: ["Splunk ES", "Microsoft Sentinel", "Elastic Security", "IBM QRadar", "Darktrace DETECT"],
          sector: "All Sectors",
        },
        {
          id: "SI-3(2)",
          title: "Malicious Code Protection - Automatic Updates",
          nistFunction: "Protect",
          nistControl: "SI-3(2): Malicious Code Protection | Automatic Updates",
          mitreDefense: "D3-MFA: Malware File Analysis",
          priority: "High",
          implementation: `
**CrowdStrike Falcon - Real-Time Response:**
\`\`\`powershell
# Custom IOA (Indicator of Attack) Rule
$IOARule = @{
    "rule_type" = "process"
    "name" = "Suspicious File Execution"
    "description" = "Detects execution of files from temp directories"
    "pattern" = @{
        "process_name" = "*"
        "command_line" = "*\\\\temp\\\\*"
        "file_path" = "*\\\\AppData\\\\Local\\\\Temp\\\\*"
    }
    "action" = "prevent"
    "severity" = "high"
}

# Deploy via Falcon API
Invoke-RestMethod -Uri "https://api.crowdstrike.com/policy/entities/ioa/v1" -Method POST -Headers $headers -Body ($IOARule | ConvertTo-Json)
\`\`\`

**Microsoft Defender for Endpoint:**
\`\`\`powershell
# Advanced Hunting Query for Malware Detection
DeviceProcessEvents
| where Timestamp > ago(1h)
| where ProcessCommandLine has_any ("powershell", "cmd") and ProcessCommandLine has_any ("download", "invoke")
| join kind=inner (
    DeviceFileEvents
    | where ActionType == "FileCreated"
    | where FolderPath has_any ("temp", "appdata")
) on DeviceId
| where ProcessCreationTime between (Timestamp .. (Timestamp + 5m))
| project Timestamp, DeviceName, ProcessCommandLine, FileName, FolderPath, SHA256

# Custom Detection Rule
$DetectionRule = @{
    "displayName" = "Suspicious PowerShell Download Activity"
    "description" = "Detects PowerShell downloading and executing files"
    "severity" = "High"
    "queryFrequency" = "PT5M"
    "query" = $KQLQuery
    "tactics" = @("Execution", "Defense Evasion")
    "techniques" = @("T1059.001", "T1027")
}
\`\`\`

**SentinelOne - Custom Detection:**
\`\`\`json
{
  "name": "Malware Execution Prevention",
  "description": "Prevents execution of unsigned binaries from temp directories",
  "query": {
    "events": [
      {
        "eventType": "Process Creation",
        "filters": [
          {
            "field": "processImagePath",
            "operator": "contains",
            "value": "\\\\temp\\\\"
          },
          {
            "field": "processSignatureStatus",
            "operator": "equals",
            "value": "unsigned"
          }
        ]
      }
    ]
  },
  "actions": [
    {
      "type": "kill_process",
      "parameters": {
        "processId": "{{event.processId}}"
      }
    },
    {
      "type": "quarantine_file",
      "parameters": {
        "filePath": "{{event.processImagePath}}"
      }
    }
  ]
}
\`\`\`

**Carbon Black Cloud:**
\`\`\`python
# Custom Watchlist Rule
watchlist_rule = {
    "name": "Malicious File Execution",
    "description": "Detects execution of potentially malicious files",
    "query": "process_name:*.exe AND (parent_name:powershell.exe OR parent_name:cmd.exe) AND process_reputation:NOT_LISTED",
    "alert_classification": {
        "classification": "MALWARE",
        "sub_classification": "TROJAN"
    },
    "severity": 8,
    "enabled": True
}

# Deploy via CB API
import requests
response = requests.post(
    f"{cb_url}/api/alerts/v7/orgs/{org_key}/watchlists",
    headers={"X-Auth-Token": api_token},
    json=watchlist_rule
)
\`\`\`

**Darktrace DETECT - AI Malware Analysis:**
\`\`\`python
# Cyber AI Analyst - Advanced Malware Detection
{
  "model_breach": "Device / Malware",
  "ai_malware_analysis": {
    "behavioral_analysis": {
      "file_system_changes": "Unusual file creation in system directories",
      "network_communications": "C2 beacon pattern detected",
      "process_behavior": "Code injection into legitimate processes",
      "persistence_mechanisms": "Registry modifications for startup persistence"
    },
    "threat_intelligence_correlation": {
      "known_malware_families": ["TrickBot", "Emotet", "Cobalt Strike"],
      "ioc_matching": "Hash, domain, and IP reputation analysis",
      "campaign_attribution": "Links to known threat actor campaigns",
      "zero_day_detection": "Novel malware behavior not in signature databases"
    },
    "autonomous_classification": {
      "malware_type": "Banking Trojan with RAT capabilities",
      "severity_assessment": "Critical - Data exfiltration and remote access",
      "confidence_score": 0.94,
      "false_positive_probability": 0.03
    }
  },
  
  "antigena_response": {
    "immediate_actions": [
      "Quarantine malicious files automatically",
      "Block C2 communications at network level",
      "Isolate infected endpoints from network",
      "Preserve forensic evidence for investigation"
    ],
    "adaptive_learning": {
      "update_behavioral_models": "Learn from new malware variant",
      "enhance_detection_accuracy": "Improve future detection capabilities",
      "share_threat_intelligence": "Update global threat intelligence feed"
    }
  }
}

# Darktrace File Analysis API
def analyze_suspicious_file(file_hash, file_path):
    analysis_request = {
        "file_hash": file_hash,
        "file_path": file_path,
        "analysis_type": "comprehensive",
        "ai_models": [
            "static_analysis",
            "behavioral_analysis", 
            "threat_intelligence_correlation",
            "zero_day_detection"
        ]
    }
    
    response = requests.post(
        f"{darktrace_api}/api/file-analysis",
        headers={"Authorization": f"Bearer {api_token}"},
        json=analysis_request
    )
    
    analysis_result = response.json()
    
    # Autonomous response based on AI analysis
    if analysis_result["threat_score"] > 0.8:
        trigger_antigena_containment(file_hash, analysis_result)
    
    return analysis_result

def trigger_antigena_containment(file_hash, analysis):
    containment_actions = {
        "file_quarantine": True,
        "process_termination": True,
        "network_isolation": analysis["network_activity_detected"],
        "forensic_preservation": True,
        "threat_hunting": {
            "search_similar_files": True,
            "hunt_related_activities": True,
            "update_detection_rules": True
        }
    }
    
    return requests.post(
        f"{darktrace_api}/api/antigena/containment",
        headers={"Authorization": f"Bearer {api_token}"},
        json={
            "target": file_hash,
            "actions": containment_actions,
            "reason": f"AI detected malware: {analysis['malware_classification']}"
        }
    )
\`\`\``,
          timeframe: "24-48 hours",
          resources: [
            "CrowdStrike Falcon",
            "Microsoft Defender ATP",
            "SentinelOne",
            "Carbon Black Cloud",
            "Darktrace DETECT",
          ],
          sector: "All Sectors",
        },
        // Energy Sector Specific
        {
          id: "SC-7(4)",
          title: "Boundary Protection - External Telecommunications Services",
          nistFunction: "Protect",
          nistControl: "SC-7(4): Boundary Protection | External Telecommunications Services",
          mitreDefense: "D3-NI: Network Isolation",
          priority: "Critical",
          implementation: `
**ICS/SCADA Network Segmentation:**
\`\`\`bash
# Configure Schneider Electric EcoStruxure Security Admin
configure_network_segmentation --zone=control --isolation=strict
deploy_firewall_rules --src=corporate --dst=control --action=deny

# Rockwell FactoryTalk Security
factorytalk_security --enable-zone-isolation --critical-assets
\`\`\`

**Claroty OT Security Monitoring:**
\`\`\`python
# Deploy OT asset discovery and monitoring
claroty_deploy = {
    "asset_discovery": True,
    "vulnerability_assessment": True,
    "threat_detection": True,
    "network_segmentation_validation": True
}
\`\`\`

**Waterfall Unidirectional Security Gateways:**
\`\`\`bash
# Configure air-gapped network communication
waterfall_config --direction=outbound-only --protocol=modbus
waterfall_config --historian-replication --secure-channel
\`\`\``,
          timeframe: "0-4 hours",
          resources: ["ICS Security", "OT Monitoring", "Network Segmentation"],
          sector: "Energy",
        },

        // Healthcare Sector Specific
        {
          id: "SI-4(23)",
          title: "System Monitoring - Host-Based Devices",
          nistFunction: "Detect",
          nistControl: "SI-4(23): System Monitoring | Host-Based Devices",
          mitreDefense: "D3-HBAM: Host-based Artifact Monitoring",
          priority: "Critical",
          implementation: `
**Medigate Medical Device Security:**
\`\`\`python
# Deploy medical device monitoring
medigate_config = {
    "device_discovery": "automatic",
    "vulnerability_scanning": "continuous",
    "anomaly_detection": "behavioral_ai",
    "compliance_monitoring": "hipaa_hitech"
}
\`\`\`

**Epic/Cerner SIEM Integration:**
\`\`\`sql
-- Monitor EHR access patterns
SELECT patient_id, user_id, access_time, action_type
FROM ehr_audit_log 
WHERE access_time > NOW() - INTERVAL 1 HOUR
  AND action_type IN ('PATIENT_LOOKUP', 'RECORD_ACCESS', 'DATA_EXPORT')
GROUP BY user_id
HAVING COUNT(DISTINCT patient_id) > 50
\`\`\`

**Philips IntelliSpace Monitoring:**
\`\`\`bash
# Configure medical equipment monitoring
intellispace_monitor --device-type=mri,ct,xray --alert-threshold=critical
intellispace_security --enable-device-authentication --certificate-based
\`\`\``,
          timeframe: "0-6 hours",
          resources: ["Medical Device Security", "EHR Monitoring", "Healthcare SIEM"],
          sector: "Healthcare",
        },

        // Finance Sector Specific
        {
          id: "AU-6(5)",
          title: "Audit Review - Integration / Scanning and Monitoring Capabilities",
          nistFunction: "Detect",
          nistControl:
            "AU-6(5): Audit Review, Analysis, and Reporting | Integration / Scanning and Monitoring Capabilities",
          mitreDefense: "D3-FAPA: Financial Application Protection",
          priority: "Critical",
          implementation: `
**Financial Transaction Monitoring:**
\`\`\`sql
-- Detect suspicious transaction patterns
SELECT account_id, transaction_amount, transaction_time, merchant_category
FROM transactions 
WHERE transaction_time > NOW() - INTERVAL 1 HOUR
  AND (transaction_amount > 10000 OR 
       merchant_category IN ('HIGH_RISK', 'CASH_EQUIVALENT'))
GROUP BY account_id
HAVING COUNT(*) > 5 OR SUM(transaction_amount) > 50000
\`\`\`

**SWIFT Network Security:**
\`\`\`bash
# Configure SWIFT Customer Security Programme (CSP)
swift_csp --enable-mandatory-controls --version=2023
swift_monitor --real-time-alerts --suspicious-activity
\`\`\`

**Anti-Money Laundering (AML) Integration:**
\`\`\`python
# Integrate with AML systems
aml_config = {
    "transaction_monitoring": "real_time",
    "customer_due_diligence": "enhanced",
    "suspicious_activity_reporting": "automated",
    "regulatory_reporting": "sox_compliance"
}
\`\`\``,
          timeframe: "0-2 hours",
          resources: ["Financial Monitoring", "SWIFT Security", "AML Systems"],
          sector: "Finance",
        },
      ],

      elevated: [
        {
          id: "RA-5(2)",
          title: "Vulnerability Monitoring - Update Tool Capability",
          nistFunction: "Identify",
          nistControl: "RA-5(2): Vulnerability Monitoring and Scanning | Update Tool Capability",
          mitreDefense: "D3-VULN: Vulnerability Assessment",
          priority: "High",
          implementation: `
**Splunk Enterprise Security - Vulnerability Correlation:**
\`\`\`spl
# Correlate Vulnerabilities with Asset Data
| inputlookup nessus_vulnerabilities.csv
| join type=left host 
    [| inputlookup asset_inventory.csv 
     | eval criticality=case(
         asset_type="domain_controller", "critical",
         asset_type="database_server", "high", 
         asset_type="web_server", "medium",
         1==1, "low")]
| eval risk_score = case(
    severity="Critical" AND criticality="critical", 100,
    severity="High" AND criticality="critical", 90,
    severity="Critical" AND criticality="high", 85,
    1==1, cvss_score*10)
| where risk_score > 70
| sort - risk_score
| outputlookup priority_vulnerabilities.csv
\`\`\`

**Qualys VMDR Integration:**
\`\`\`python
# Automated Vulnerability Assessment
import qualysapi

# Initialize Qualys API
qgc = qualysapi.connect('config.txt')

# Launch authenticated scan
scan_options = {
    'scan_title': 'Critical Infrastructure Scan',
    'option_title': 'Authenticated Scan',
    'ip': '10.0.0.0/24',
    'runtime_http_header': 'X-Requested-With: Qualys WAS'
}

scan_ref = qgc.request('scan/', scan_options)

# Process results and create tickets
results = qgc.request(f'scan/{scan_ref}/results/')
for vuln in results['VULNS']:
    if vuln['SEVERITY'] >= 4:  # High/Critical only
        create_jira_ticket(vuln)
\`\`\`

**Rapid7 InsightVM - Automated Remediation:**
\`\`\`powershell
# PowerShell script for automated patching
$VulnData = Invoke-RestMethod -Uri "https://insight.rapid7.com/api/3/vulnerabilities" -Headers $headers

# Filter critical vulnerabilities
$CriticalVulns = $VulnData.resources | Where-Object {$_.severity -eq "Critical" -and $_.malwareKits -gt 0}

# Auto-patch using WSUS/SCCM
foreach ($vuln in $CriticalVulns) {
    $KBNumbers = $vuln.solutions | Where-Object {$_.type -eq "patch"} | Select-Object -ExpandProperty summary
    
    foreach ($kb in $KBNumbers) {
        # Deploy patch via SCCM
        Import-Module ConfigurationManager
        New-CMSoftwareUpdateDeployment -SoftwareUpdateName $kb -CollectionName "Critical Servers" -DeploymentType Required
    }
}
\`\`\`

**Tenable.io Security Center:**
\`\`\`bash
#!/bin/bash
# Automated vulnerability scanning and reporting

# Launch scan via API
curl -X POST "https://cloud.tenable.com/scans" \\
  -H "X-ApiKeys: accessKey=$ACCESS_KEY; secretKey=$SECRET_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "uuid": "731a8e52-3ea6-a291-ec0a-d2ff0619c19d7bd788d6",
    "settings": {
      "name": "Critical Infrastructure Scan",
      "text_targets": "10.0.0.0/24",
      "agent_group_id": [],
      "launch": "ONETIME"
    }
  }'

# Export results to SIEM
scan_id=$(curl -s "https://cloud.tenable.com/scans" -H "X-ApiKeys: accessKey=$ACCESS_KEY; secretKey=$SECRET_KEY" | jq -r '.scans[0].id')

curl -X POST "https://cloud.tenable.com/scans/$scan_id/export" \\
  -H "X-ApiKeys: accessKey=$ACCESS_KEY; secretKey=$SECRET_KEY" \\
  -d '{"format": "csv"}' | \\
  curl -X POST "http://splunk:8088/services/collector" \\
  -H "Authorization: Splunk $SPLUNK_TOKEN" \\
  -d @-
\`\`\``,
          timeframe: "12-24 hours",
          resources: ["Splunk ES", "Qualys VMDR", "Rapid7 InsightVM", "Tenable.io"],
          sector: "All Sectors",
        },
        {
          id: "AU-6(3)",
          title: "Audit Review - Correlate Audit Repositories",
          nistFunction: "Detect",
          nistControl: "AU-6(3): Audit Review, Analysis, and Reporting | Correlate Audit Repositories",
          mitreDefense: "D3-LAM: Log Analysis and Monitoring",
          priority: "High",
          implementation: `
**Elastic Security - Cross-Platform Correlation:**
\`\`\`json
{
  "query": {
    "bool": {
      "must": [
        {
          "range": {
            "@timestamp": {
              "gte": "now-1h"
            }
          }
        },
        {
          "bool": {
            "should": [
              {
                "bool": {
                  "must": [
                    {"term": {"event.dataset": "windows.security"}},
                    {"term": {"winlog.event_id": 4624}}
                  ]
                }
              },
              {
                "bool": {
                  "must": [
                    {"term": {"event.dataset": "linux.auth"}},
                    {"match": {"message": "Accepted"}}
                  ]
                }
              }
            ]
          }
        }
      ]
    }
  },
  "aggs": {
    "users": {
      "terms": {
        "field": "user.name.keyword",
        "size": 100
      },
      "aggs": {
        "hosts": {
          "cardinality": {
            "field": "host.name.keyword"
          }
        },
        "platforms": {
          "terms": {
            "field": "host.os.platform.keyword"
          }
        }
      }
    }
  }
}
\`\`\`

**Splunk Enterprise Security - Multi-Source Correlation:**
\`\`\`spl
# Cross-platform authentication correlation
| multisearch 
    [search index=windows EventCode=4624 | eval platform="windows", auth_result="success"]
    [search index=linux "Accepted publickey" | eval platform="linux", auth_result="success"]
    [search index=network "authentication successful" | eval platform="network", auth_result="success"]
| eval user=coalesce(Account_Name, user, User_Name)
| eval src=coalesce(Src_IP, src_ip, client_ip)
| stats values(platform) as platforms, dc(src) as unique_sources, 
        count as total_auths by user
| where mvcount(platforms) > 1 AND unique_sources > 5
| eval risk_score = (mvcount(platforms) * unique_sources * 10)
| where risk_score > 100
| sort - risk_score
\`\`\`

**Microsoft Sentinel - Multi-Workspace Correlation:**
\`\`\`kql
// Cross-tenant authentication analysis
let WindowsAuth = SecurityEvent
| where EventID == 4624
| where TimeGenerated > ago(1h)
| project TimeGenerated, Account, Computer, IpAddress, LogonType;

let LinuxAuth = Syslog
| where Facility == "auth" and SeverityLevel == "info"
| where SyslogMessage contains "Accepted"
| extend Account = extract(@"for (\w+)", 1, SyslogMessage)
| extend IpAddress = extract(@"from ([\d\.]+)", 1, SyslogMessage)
| project TimeGenerated, Account, Computer, IpAddress;

let NetworkAuth = CommonSecurityLog
| where DeviceVendor == "Palo Alto Networks"
| where Activity == "AUTHENTICATION"
| where TimeGenerated > ago(1h)
| project TimeGenerated, SourceUserName, Computer=DeviceName, SourceIP;

WindowsAuth
| union LinuxAuth
| union (NetworkAuth | project-rename Account=SourceUserName, IpAddress=SourceIP)
| summarize Platforms = make_set(Computer), 
           UniqueIPs = dcount(IpAddress),
           AuthCount = count() by Account
| where array_length(Platforms) > 2 and UniqueIPs > 3
| extend RiskScore = array_length(Platforms) * UniqueIPs * 10
| order by RiskScore desc
\`\`\`

**IBM QRadar - Multi-Log Source Analysis:**
\`\`\`sql
-- Cross-platform user behavior analysis
WITH auth_events AS (
  SELECT 
    username,
    sourceip,
    CASE 
      WHEN logsourcetypename LIKE '%Windows%' THEN 'Windows'
      WHEN logsourcetypename LIKE '%Linux%' THEN 'Linux'  
      WHEN logsourcetypename LIKE '%Firewall%' THEN 'Network'
      ELSE 'Other'
    END as platform,
    eventtime
  FROM events 
  WHERE category = 11 -- Authentication
    AND eventtime > CURRENT_TIMESTAMP - INTERVAL '1' HOUR
    AND username IS NOT NULL
)
SELECT 
  username,
  COUNT(DISTINCT platform) as platform_count,
  COUNT(DISTINCT sourceip) as unique_ips,
  COUNT(*) as total_auths,
  STRING_AGG(DISTINCT platform, ',') as platforms
FROM auth_events
GROUP BY username
HAVING COUNT(DISTINCT platform) > 1 
   AND COUNT(DISTINCT sourceip) > 3
ORDER BY platform_count DESC, unique_ips DESC
\`\`\``,
          timeframe: "48-72 hours",
          resources: ["Elastic Security", "Splunk ES", "Microsoft Sentinel", "IBM QRadar"],
          sector: "All Sectors",
        },
        // Energy Sector Specific
        {
          id: "RA-5(5)",
          title: "Vulnerability Monitoring - Privileged Access",
          nistFunction: "Identify",
          nistControl: "RA-5(5): Vulnerability Monitoring and Scanning | Privileged Access",
          mitreDefense: "D3-VULN: Vulnerability Assessment",
          priority: "High",
          implementation: `
**ICS Vulnerability Management:**
\`\`\`bash
# Tenable OT Security vulnerability scanning
tenable_ot --scan-type=passive --protocols=modbus,dnp3,iec61850
tenable_ot --asset-inventory --critical-infrastructure

# Claroty vulnerability assessment
claroty_scan --ot-devices --vulnerability-database=ics-cert
\`\`\`

**NERC CIP Compliance Monitoring:**
\`\`\`python
# Monitor NERC CIP compliance
nerc_cip_monitor = {
    "cip_002": "asset_identification",
    "cip_003": "security_management_controls",
    "cip_005": "electronic_security_perimeters",
    "cip_007": "systems_security_management"
}
\`\`\``,
          timeframe: "12-24 hours",
          resources: ["Tenable OT", "Claroty", "NERC CIP Tools"],
          sector: "Energy",
        },

        // Healthcare Sector Specific
        {
          id: "AC-2(12)",
          title: "Account Management - Account Monitoring / Atypical Usage",
          nistFunction: "Protect",
          nistControl: "AC-2(12): Account Management | Account Monitoring / Atypical Usage",
          mitreDefense: "D3-AM: Account Monitoring",
          priority: "High",
          implementation: `
**HIPAA Compliance Monitoring:**
\`\`\`sql
-- Monitor healthcare worker access patterns
SELECT employee_id, department, access_count, patient_count
FROM hipaa_audit_log 
WHERE access_date >= CURRENT_DATE - INTERVAL 7 DAY
GROUP BY employee_id, department
HAVING patient_count > (
  SELECT AVG(patient_count) * 3 
  FROM department_baselines 
  WHERE department = hipaa_audit_log.department
)
\`\`\`

**Medical Device Access Control:**
\`\`\`python
# Implement role-based access for medical devices
medical_device_rbac = {
    "physician": ["read", "write", "configure"],
    "nurse": ["read", "limited_write"],
    "technician": ["read", "maintenance"],
    "administrator": ["full_access", "audit"]
}
\`\`\``,
          timeframe: "24-48 hours",
          resources: ["HIPAA Monitoring", "Medical Device RBAC", "Healthcare IAM"],
          sector: "Healthcare",
        },

        // Finance Sector Specific
        {
          id: "SC-8(1)",
          title: "Transmission Confidentiality and Integrity - Cryptographic Protection",
          nistFunction: "Protect",
          nistControl: "SC-8(1): Transmission Confidentiality and Integrity | Cryptographic Protection",
          mitreDefense: "D3-TLS: Transport Layer Security",
          priority: "High",
          implementation: `
**PCI DSS Compliance:**
\`\`\`bash
# Configure PCI DSS encryption requirements
openssl_config --tls-version=1.3 --cipher-suite=aes256-gcm
pci_compliance_check --requirement=4.1 --encryption=end-to-end
\`\`\`

**Financial Data Encryption:**
\`\`\`python
# Implement financial data encryption
financial_encryption = {
    "card_data": "aes_256_gcm",
    "transaction_data": "rsa_4096",
    "customer_pii": "format_preserving_encryption",
    "key_management": "hsm_based"
}
\`\`\``,
          timeframe: "48-72 hours",
          resources: ["PCI DSS Tools", "HSM", "Encryption Solutions"],
          sector: "Finance",
        },
      ],
      guarded: [
        {
          id: "ID-AM-1",
          title: "Physical Devices and Systems Inventory",
          nistFunction: "Identify",
          nistControl: "ID.AM-1: Physical devices and systems within the organization are inventoried",
          mitreDefense: "D3-ASSETD: Asset Discovery",
          priority: "Medium",
          implementation:
            "Deploy Lansweeper/ManageEngine for asset discovery: lansweeper.exe /scan /range:192.168.1.0/24. Implement network scanning with Nmap: nmap -sS -O -sV -sC -A -T4 <network-range>. Configure DHCP snooping for device tracking: ip dhcp snooping. Use PowerShell for Windows asset inventory: Get-WmiObject -Class Win32_ComputerSystem | Export-Csv assets.csv",
          timeframe: "1-2 weeks",
          resources: ["Lansweeper", "Nmap", "DHCP Logs", "PowerShell", "Asset Database"],
          sector: "All Sectors",
        },
        {
          id: "PR-AC-1",
          title: "Identity and Credential Management",
          nistFunction: "Protect",
          nistControl: "PR.AC-1: Identities and credentials are issued, managed, verified, revoked, and audited",
          mitreDefense: "D3-ACH: Access Control Hardening",
          priority: "Medium",
          implementation:
            "Implement Azure AD Connect for hybrid identity: Install-Module AzureAD; Connect-AzureAD. Configure MFA with conditional access: New-AzureADMSConditionalAccessPolicy -DisplayName 'Require MFA' -State 'Enabled'. Deploy certificate-based authentication: certlm.msc -> Personal -> Certificates -> Request New Certificate. Audit service accounts: Get-ADServiceAccount -Filter * | Select Name,LastLogonDate",
          timeframe: "2-4 weeks",
          resources: ["Azure AD", "Certificate Authority", "MFA Solution", "Service Account Inventory"],
          sector: "All Sectors",
        },
        {
          id: "DE-CM-1",
          title: "Network Monitoring",
          nistFunction: "Detect",
          nistControl: "DE.CM-1: The network is monitored to detect potential cybersecurity events",
          mitreDefense: "D3-NTM: Network Traffic Monitoring",
          priority: "Medium",
          implementation:
            "Deploy Security Onion with Suricata IDS: sudo so-setup. Configure network taps: Configure SPAN ports on switches for traffic mirroring. Implement flow monitoring with nfcapd: nfcapd -w -D -p 9995 -l /var/cache/nfcapd. Set up DNS monitoring: dig @<dns-server> <domain> && tail -f /var/log/named/queries.log",
          timeframe: "2-3 weeks",
          resources: ["Security Onion", "Network Taps", "Flow Collectors", "DNS Logs"],
          sector: "All Sectors",
        },
        {
          id: "PR-DS-1",
          title: "Data-at-rest Protection",
          nistFunction: "Protect",
          nistControl: "PR.DS-1: Data-at-rest is protected",
          mitreDefense: "D3-DNSCE: Data Loss Prevention",
          priority: "Medium",
          implementation:
            "Enable BitLocker encryption: manage-bde -on C: -RecoveryPassword. Configure database encryption: ALTER DATABASE <database> SET ENCRYPTION ON. Implement file-level encryption with EFS: cipher /e /s:<directory>. Deploy Azure Information Protection: Install-Module AzureInformationProtection; Set-AIPFileClassification",
          timeframe: "3-4 weeks",
          resources: ["BitLocker", "Database Encryption", "EFS", "Azure Information Protection"],
          sector: "Healthcare, Finance",
        },
        // Energy Sector Specific
        {
          id: "CM-2(2)",
          title: "Baseline Configuration - Automation Support for Accuracy / Currency",
          nistFunction: "Identify",
          nistControl: "CM-2(2): Baseline Configuration | Automation Support for Accuracy / Currency",
          mitreDefense: "D3-SCM: System Configuration Monitoring",
          priority: "Medium",
          implementation: `
**ICS Configuration Management:**
\`\`\`bash
# Implement ICS configuration baselines
ics_baseline --protocol=modbus --device-type=plc,hmi,historian
ics_monitor --configuration-drift --alert-threshold=medium
\`\`\`

**SCADA System Hardening:**
\`\`\`powershell
# Windows-based SCADA hardening
Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" -Name "EnableMulticast" -Value 0
Disable-WindowsOptionalFeature -Online -FeatureName "SMB1Protocol"
\`\`\``,
          timeframe: "1-2 weeks",
          resources: ["ICS Configuration Tools", "SCADA Hardening", "Baseline Management"],
          sector: "Energy",
        },

        // Healthcare Sector Specific
        {
          id: "PR-DS-2",
          title: "Data-in-transit Protection",
          nistFunction: "Protect",
          nistControl: "PR.DS-2: Data-in-transit is protected",
          mitreDefense: "D3-TLS: Transport Layer Security",
          priority: "Medium",
          implementation: `
**Healthcare Data Encryption:**
\`\`\`bash
# Configure HIPAA-compliant data transmission
ssl_config --healthcare-grade --fips-140-2-level-3
hl7_encryption --message-type=adt,oru,mdm --encryption=aes256
\`\`\`

**Medical Device Communication Security:**
\`\`\`python
# Secure medical device communications
medical_comm_security = {
    "dicom_tls": "enabled",
    "hl7_encryption": "required",
    "device_authentication": "certificate_based",
    "audit_logging": "comprehensive"
}
\`\`\``,
          timeframe: "2-3 weeks",
          resources: ["Healthcare Encryption", "Medical Device Security", "HIPAA Tools"],
          sector: "Healthcare",
        },

        // Finance Sector Specific
        {
          id: "AU-3(1)",
          title: "Content of Audit Records - Additional Audit Information",
          nistFunction: "Detect",
          nistControl: "AU-3(1): Content of Audit Records | Additional Audit Information",
          mitreDefense: "D3-LAM: Log Analysis and Monitoring",
          priority: "Medium",
          implementation: `
**Financial Audit Logging:**
\`\`\`sql
-- Enhanced financial transaction logging
CREATE TABLE enhanced_audit_log (
    transaction_id VARCHAR(50),
    user_id VARCHAR(50),
    customer_id VARCHAR(50),
    transaction_type VARCHAR(20),
    amount DECIMAL(15,2),
    risk_score INTEGER,
    geolocation VARCHAR(100),
    device_fingerprint VARCHAR(200),
    timestamp TIMESTAMP
);
\`\`\`

**Regulatory Compliance Reporting:**
\`\`\`python
# Automated compliance reporting
compliance_reporting = {
    "sox_404": "quarterly",
    "basel_iii": "monthly", 
    "dodd_frank": "daily",
    "mifid_ii": "real_time"
}
\`\`\``,
          timeframe: "3-4 weeks",
          resources: ["Financial Audit Systems", "Compliance Tools", "Regulatory Reporting"],
          sector: "Finance",
        },
      ],
      low: [
        {
          id: "ID-GV-1",
          title: "Organizational Cybersecurity Policy",
          nistFunction: "Identify",
          nistControl: "ID.GV-1: Organizational cybersecurity policy is established and communicated",
          mitreDefense: "D3-PSEP: Process Security Enhancement",
          priority: "Low",
          implementation:
            "Develop comprehensive cybersecurity policy framework based on NIST CSF. Create incident response procedures with defined roles and responsibilities. Establish security awareness training program with annual requirements. Implement policy management system with version control and approval workflows. Conduct annual policy review and update cycle.",
          timeframe: "1-3 months",
          resources: ["Policy Management System", "Legal Review", "Compliance Team", "Training Platform"],
          sector: "All Sectors",
        },
        {
          id: "PR-IP-1",
          title: "Baseline Configuration",
          nistFunction: "Protect",
          nistControl:
            "PR.IP-1: A baseline configuration of information technology/industrial control systems is created and maintained",
          mitreDefense: "D3-SCM: System Configuration Monitoring",
          priority: "Low",
          implementation:
            "Develop CIS benchmark-based configuration standards. Create system hardening guides for Windows/Linux/network devices. Implement configuration management database (CMDB). Establish change control procedures for baseline modifications. Deploy configuration compliance monitoring tools.",
          timeframe: "2-4 months",
          resources: ["CIS Benchmarks", "CMDB", "Configuration Management Tools", "Change Control System"],
          sector: "All Sectors",
        },
        // Energy Sector Specific
        {
          id: "ID-AM-3",
          title: "Organizational Communication and Data Flows",
          nistFunction: "Identify",
          nistControl: "ID.AM-3: Organizational communication and data flows are mapped",
          mitreDefense: "D3-NTF: Network Traffic Filtering",
          priority: "Low",
          implementation: `
**Energy Sector Data Flow Mapping:**
\`\`\`bash
# Map ICS/SCADA data flows
ics_mapper --protocol=modbus,dnp3,iec61850 --topology=generation,transmission,distribution
data_flow_analyzer --critical-assets --communication-paths
\`\`\`

**NERC Standards Documentation:**
\`\`\`markdown
# Document NERC CIP compliance data flows
- Generation control systems
- Transmission operations
- Distribution automation
- Market operations
\`\`\``,
          timeframe: "1-3 months",
          resources: ["ICS Mapping Tools", "NERC Documentation", "Data Flow Analysis"],
          sector: "Energy",
        },

        // Healthcare Sector Specific
        {
          id: "ID-GV-2",
          title: "Cybersecurity Roles and Responsibilities",
          nistFunction: "Identify",
          nistControl:
            "ID.GV-2: Cybersecurity roles and responsibilities are coordinated and aligned with internal roles and external partners",
          mitreDefense: "D3-PSEP: Process Security Enhancement",
          priority: "Low",
          implementation: `
**Healthcare Cybersecurity Governance:**
\`\`\`markdown
# Define healthcare-specific cybersecurity roles
- Chief Medical Information Officer (CMIO)
- Healthcare Security Officer (HSO)
- Biomedical Engineering Security Lead
- Clinical Application Security Manager
- HIPAA Security Officer
\`\`\`

**Medical Device Incident Response:**
\`\`\`python
# Healthcare incident response procedures
healthcare_ir = {
    "medical_device_compromise": "immediate_isolation",
    "patient_data_breach": "hipaa_notification_72hrs",
    "clinical_system_outage": "emergency_procedures",
    "ransomware_attack": "patient_safety_first"
}
\`\`\``,
          timeframe: "2-4 months",
          resources: ["Healthcare Governance", "Medical Device IR", "HIPAA Compliance"],
          sector: "Healthcare",
        },

        // Finance Sector Specific
        {
          id: "PR-IP-3",
          title: "Configuration Change Control",
          nistFunction: "Protect",
          nistControl: "PR.IP-3: Configuration change control processes and procedures are in place",
          mitreDefense: "D3-SCM: System Configuration Monitoring",
          priority: "Low",
          implementation: `
**Financial System Change Control:**
\`\`\`bash
# Implement financial system change management
change_control --system=trading,settlement,clearing --approval=dual-control
financial_testing --environment=sandbox --regression-testing=automated
\`\`\`

**Regulatory Change Management:**
\`\`\`python
# Track regulatory compliance changes
regulatory_change_mgmt = {
    "sox_compliance": "quarterly_review",
    "pci_dss": "annual_assessment",
    "ffiec_guidelines": "continuous_monitoring",
    "basel_requirements": "risk_assessment"
}
\`\`\``,
          timeframe: "3-6 months",
          resources: ["Change Management", "Financial Testing", "Regulatory Tools"],
          sector: "Finance",
        },
      ],
    }),
    [],
  )

  // MITRE ATT&CK techniques relevant to current threat level - Much more specific
  const mitreTechniques = useMemo<Record<string, MitreTechnique[]>>(
    () => ({
      critical: [
        {
          id: "T1190",
          name: "Exploit Public-Facing Application",
          tactic: "Initial Access",
          description:
            "Adversaries exploit vulnerabilities in internet-facing applications including web servers, databases, and network devices. Common targets include unpatched CVEs in Apache, IIS, Exchange, and VPN appliances.",
          countermeasures: [
            "Deploy WAF with OWASP Top 10 rules",
            "Implement vulnerability scanning with Nessus/OpenVAS",
            "Configure fail2ban for brute force protection",
            "Enable application-layer DDoS protection",
            "Deploy network segmentation with DMZ isolation",
          ],
          nistMapping: ["SI-4", "RA-5", "SI-2", "SC-7", "SI-3"],
        },
        {
          id: "T1078.004",
          name: "Valid Accounts: Cloud Accounts",
          tactic: "Defense Evasion, Persistence, Privilege Escalation, Initial Access",
          description:
            "Adversaries obtain and abuse credentials of cloud service accounts including Azure AD, AWS IAM, and Google Cloud accounts. Often involves credential stuffing, password spraying, or token theft.",
          countermeasures: [
            "Implement Azure AD Conditional Access policies",
            "Deploy AWS CloudTrail with anomaly detection",
            "Configure MFA for all cloud admin accounts",
            "Enable Azure AD Identity Protection",
            "Implement just-in-time (JIT) access with Azure PIM",
          ],
          nistMapping: ["AC-2", "AC-6", "AU-6", "IA-2", "IA-8"],
        },
        {
          id: "T1486",
          name: "Data Encrypted for Impact",
          tactic: "Impact",
          description:
            "Adversaries encrypt data on target systems using ransomware families like Conti, LockBit, or BlackCat. Often preceded by data exfiltration for double extortion.",
          countermeasures: [
            "Implement immutable backups with air-gapped storage",
            "Deploy behavioral analysis with CrowdStrike/SentinelOne",
            "Configure file integrity monitoring (OSSEC/Tripwire)",
            "Enable Windows Defender Controlled Folder Access",
            "Implement network segmentation to limit spread",
          ],
          nistMapping: ["CP-9", "SI-3", "SI-7", "SC-7", "IR-4"],
        },
        {
          id: "T1055.012",
          name: "Process Injection: Process Hollowing",
          tactic: "Defense Evasion, Privilege Escalation",
          description:
            "Adversaries hollow out legitimate processes and replace their memory with malicious code. Common targets include svchost.exe, explorer.exe, and other trusted processes.",
          countermeasures: [
            "Deploy EDR with process injection detection (CrowdStrike Falcon)",
            "Enable Windows Defender Exploit Guard",
            "Configure Sysmon Event ID 8 (CreateRemoteThread)",
            "Implement application control with Windows Defender Application Control",
            "Deploy memory protection with Intel CET/ARM Pointer Authentication",
          ],
          nistMapping: ["SI-4", "SI-3", "CM-7", "AU-6"],
        },
        {
          id: "T1021.001",
          name: "Remote Services: Remote Desktop Protocol",
          tactic: "Lateral Movement",
          description:
            "Adversaries use RDP to move laterally through networks, often after obtaining credentials through credential dumping or brute force attacks.",
          countermeasures: [
            "Implement RDP gateway with MFA",
            "Configure Windows Event ID 4624/4625 monitoring",
            "Deploy network access control (NAC) with 802.1X",
            "Enable RDP encryption and disable clipboard redirection",
            "Implement privileged access workstations (PAWs)",
          ],
          nistMapping: ["AC-17", "AU-6", "SC-8", "AC-6"],
        },
        // Energy Sector Specific
        {
          id: "T1565.001",
          name: "Data Manipulation: Stored Data Manipulation",
          tactic: "Impact",
          description:
            "Adversaries may insert, delete, or manipulate data in SCADA systems to disrupt industrial processes, cause equipment damage, or hide malicious activity in energy infrastructure.",
          countermeasures: [
            "Deploy Claroty or Dragos OT monitoring",
            "Implement ICS data integrity checks",
            "Configure Schneider Electric EcoStruxure security",
            "Enable historian data validation",
            "Deploy Waterfall unidirectional gateways",
          ],
          nistMapping: ["SI-7", "AU-6", "SC-7", "SI-4"],
          sector: "Energy",
        },

        // Healthcare Sector Specific
        {
          id: "T1530",
          name: "Data from Cloud Storage Object",
          tactic: "Collection",
          description:
            "Adversaries may access data from cloud storage services to steal patient health information (PHI) or personally identifiable information (PII) from healthcare organizations.",
          countermeasures: [
            "Deploy Microsoft Defender for Cloud Apps",
            "Implement HIPAA-compliant cloud access security broker (CASB)",
            "Configure Epic/Cerner cloud security monitoring",
            "Enable healthcare data loss prevention (DLP)",
            "Deploy Medigate cloud device monitoring",
          ],
          nistMapping: ["AC-3", "AU-6", "SC-7", "SI-4"],
          sector: "Healthcare",
        },

        // Finance Sector Specific
        {
          id: "T1565.002",
          name: "Data Manipulation: Transmitted Data Manipulation",
          tactic: "Impact",
          description:
            "Adversaries may alter financial transaction data in transit to conduct fraudulent transfers, manipulate market data, or disrupt trading operations.",
          countermeasures: [
            "Implement SWIFT Customer Security Programme (CSP)",
            "Deploy financial transaction integrity monitoring",
            "Configure end-to-end encryption for financial data",
            "Enable real-time fraud detection systems",
            "Implement blockchain-based transaction verification",
          ],
          nistMapping: ["SC-8", "AU-6", "SI-7", "AC-3"],
          sector: "Finance",
        },
      ],
      elevated: [
        {
          id: "T1566.001",
          name: "Phishing: Spearphishing Attachment",
          tactic: "Initial Access",
          description:
            "Adversaries send targeted emails with malicious attachments including weaponized Office documents, PDFs, or executables disguised as legitimate files.",
          countermeasures: [
            "Deploy Microsoft Defender for Office 365 with Safe Attachments",
            "Configure email security gateway with sandboxing (Proofpoint/Mimecast)",
            "Implement DMARC/SPF/DKIM email authentication",
            "Deploy user training with GoPhish simulations",
            "Enable Office macro blocking via Group Policy",
          ],
          nistMapping: ["AT-2", "SI-8", "SC-7", "SI-3"],
        },
        {
          id: "T1055.001",
          name: "Process Injection: Dynamic-link Library Injection",
          tactic: "Defense Evasion, Privilege Escalation",
          description:
            "Adversaries inject malicious DLLs into running processes using techniques like SetWindowsHookEx, manual DLL loading, or DLL side-loading.",
          countermeasures: [
            "Enable Windows Defender Exploit Guard DLL protection",
            "Deploy Sysmon with Event ID 7 (Image/DLL loaded)",
            "Implement application whitelisting with AppLocker",
            "Configure PowerShell logging and monitoring",
            "Deploy behavioral analysis with Carbon Black/CrowdStrike",
          ],
          nistMapping: ["SI-4", "CM-7", "AU-6", "SI-3"],
        },
        {
          id: "T1003.001",
          name: "OS Credential Dumping: LSASS Memory",
          tactic: "Credential Access",
          description:
            "Adversaries dump credentials from LSASS memory using tools like Mimikatz, ProcDump, or custom techniques to obtain plaintext passwords and hashes.",
          countermeasures: [
            "Enable Windows Defender Credential Guard",
            "Configure LSASS protection with PPL (Protected Process Light)",
            "Deploy Sysmon Event ID 10 (ProcessAccess) monitoring",
            "Implement privileged access workstations (PAWs)",
            "Enable Windows Event ID 4688 with command line logging",
          ],
          nistMapping: ["AC-6", "AU-6", "SI-4", "IA-5"],
        },
        {
          id: "T1059.001",
          name: "Command and Scripting Interpreter: PowerShell",
          tactic: "Execution",
          description:
            "Adversaries abuse PowerShell for execution, including fileless attacks, encoded commands, and living-off-the-land techniques.",
          countermeasures: [
            "Enable PowerShell Script Block Logging (Event ID 4104)",
            "Configure PowerShell Constrained Language Mode",
            "Deploy PowerShell execution policy restrictions",
            "Implement AMSI (Antimalware Scan Interface) monitoring",
            "Configure Sysmon Event ID 1 for PowerShell process creation",
          ],
          nistMapping: ["AU-6", "CM-7", "SI-4", "SI-3"],
        },
      ],
      guarded: [
        {
          id: "T1083",
          name: "File and Directory Discovery",
          tactic: "Discovery",
          description:
            "Adversaries enumerate files and directories to find information of interest including sensitive documents, configuration files, and user data.",
          countermeasures: [
            "Deploy file integrity monitoring with OSSEC/Tripwire",
            "Configure Windows Event ID 4663 (object access auditing)",
            "Implement data loss prevention (DLP) with Microsoft Purview",
            "Enable file access logging on critical systems",
            "Deploy honeypots/canary files for early detection",
          ],
          nistMapping: ["SI-7", "AC-3", "AU-2", "AU-6"],
        },
        {
          id: "T1087.002",
          name: "Account Discovery: Domain Account",
          tactic: "Discovery",
          description:
            "Adversaries attempt to get a listing of domain accounts using tools like net user /domain, PowerView, or LDAP queries.",
          countermeasures: [
            "Enable Windows Event ID 4798 (user's local group membership enumerated)",
            "Configure LDAP query logging on domain controllers",
            "Implement privileged account monitoring with Azure AD",
            "Deploy deception technology with domain admin honeypots",
            "Enable PowerShell logging for Get-ADUser commands",
          ],
          nistMapping: ["AU-6", "AC-2", "SI-4"],
        },
      ],
      low: [
        {
          id: "T1018",
          name: "Remote System Discovery",
          tactic: "Discovery",
          description:
            "Adversaries attempt to get a listing of other systems by IP address, hostname, or other logical identifier using ping sweeps, port scans, or network enumeration.",
          countermeasures: [
            "Deploy network monitoring with Security Onion/Zeek",
            "Configure firewall logging for reconnaissance attempts",
            "Implement network access control (NAC) with device profiling",
            "Enable ICMP monitoring and rate limiting",
            "Deploy network segmentation to limit discovery scope",
          ],
          nistMapping: ["SI-4", "CM-8", "SC-7", "AU-6"],
        },
        {
          id: "T1016",
          name: "System Network Configuration Discovery",
          tactic: "Discovery",
          description:
            "Adversaries look for details about the network configuration and settings of systems including routing tables, network interfaces, and DNS configuration.",
          countermeasures: [
            "Monitor for ipconfig/ifconfig command execution",
            "Configure Windows Event ID 4688 for process creation",
            "Implement network configuration baselines",
            "Deploy configuration monitoring with Nessus/OpenVAS",
            "Enable command line auditing on critical systems",
          ],
          nistMapping: ["AU-6", "CM-2", "SI-4"],
        },
      ],
    }),
    [],
  )

  const currentControls = useMemo(() => {
    const controls = nistControls[threatLevel] || []
    if (selectedSector === "All Sectors") {
      return controls
    }
    return controls.filter(
      (control) => !control.sector || control.sector === "All Sectors" || control.sector.includes(selectedSector),
    )
  }, [nistControls, threatLevel, selectedSector])

  const currentTechniques = useMemo(() => {
    const techniques = mitreTechniques[threatLevel] || []
    if (selectedSector === "All Sectors") {
      return techniques
    }
    return techniques.filter((technique) => !technique.sector || technique.sector === selectedSector)
  }, [mitreTechniques, threatLevel, selectedSector])

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case "critical":
        return "text-[#d92525] bg-red-50 border-red-200"
      case "elevated":
        return "text-amber-700 bg-amber-50 border-amber-200"
      case "guarded":
        return "text-blue-700 bg-blue-50 border-blue-200"
      default:
        return "text-green-700 bg-green-50 border-green-200"
    }
  }

  const getNistFunctionIcon = (func: string) => {
    switch (func) {
      case "Identify":
        return <Search className="h-4 w-4" />
      case "Protect":
        return <Shield className="h-4 w-4" />
      case "Detect":
        return <Eye className="h-4 w-4" />
      case "Respond":
        return <Activity className="h-4 w-4" />
      case "Recover":
        return <RefreshCw className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Critical":
        return "bg-[#d92525] text-white"
      case "High":
        return "bg-amber-500 text-white"
      case "Medium":
        return "bg-blue-500 text-white"
      default:
        return "bg-gray-500 text-white"
    }
  }

  return (
    <div className="space-y-6">
      {/* Sector Filter */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Filter by Critical Infrastructure Sector</span>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="px-3 py-1 border rounded-md text-sm"
            >
              <option value="All Sectors">All Sectors</option>
              <option value="Energy">Energy</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Finance">Finance</option>
              <option value="Transportation">Transportation</option>
              <option value="Water">Water</option>
              <option value="Communications">Communications</option>
              <option value="Defense">Defense</option>
              <option value="Manufacturing">Manufacturing</option>
              <option value="Government">Government</option>
            </select>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Threat Level Header */}
      <Card
        className={`border-l-4 ${threatLevel === "critical" ? "border-l-[#d92525]" : threatLevel === "elevated" ? "border-l-amber-500" : threatLevel === "guarded" ? "border-l-blue-500" : "border-l-green-500"}`}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Controls & Recommendations
          </CardTitle>
          <CardDescription>
            NIST Cybersecurity Framework and MITRE ATT&CK based recommendations for CAPRI Level:{" "}
            {capriScore.score.toFixed(1)}
            {selectedSector !== "All Sectors" && ` - ${selectedSector} Sector Focus`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`p-4 rounded-lg border ${getThreatLevelColor(threatLevel)}`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-lg capitalize">{threatLevel} Threat Level</h3>
              <Badge className={getPriorityColor("Critical")}>
                {currentControls.filter((c) => c.priority === "Critical").length} Critical Controls
              </Badge>
            </div>
            <p className="text-sm">{capriScore.rationale}</p>
          </div>
        </CardContent>
      </Card>

      {/* Main Controls Interface */}
      <Tabs defaultValue="controls" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="controls">NIST Controls</TabsTrigger>
          <TabsTrigger value="mitre">MITRE Techniques</TabsTrigger>
        </TabsList>

        <TabsContent value="controls">
          <div className="space-y-4">
            {/* Priority Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {["Critical", "High", "Medium", "Low"].map((priority) => {
                const priorityControls = currentControls.filter((c) => c.priority === priority)
                if (priorityControls.length === 0) return null

                return (
                  <Card key={priority}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Badge className={getPriorityColor(priority)}>{priority} Priority</Badge>
                        <span className="text-sm text-gray-600">({priorityControls.length} controls)</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {priorityControls.map((control) => (
                          <div key={control.id} className="border rounded-lg p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {getNistFunctionIcon(control.nistFunction)}
                                <h4 className="font-medium text-sm">{control.title}</h4>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {control.nistControl}
                              </Badge>
                            </div>
                            <div className="text-xs text-gray-600 mb-2 space-y-2">
                              <div className="prose prose-xs max-w-none">
                                <div
                                  dangerouslySetInnerHTML={{
                                    __html: control.implementation
                                      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                                      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 rounded text-xs">$1</code>')
                                      .replace(/\n/g, "<br/>"),
                                  }}
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3" />
                                <span>{control.timeframe}</span>
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                {control.nistFunction}
                              </Badge>
                            </div>
                            {control.mitreDefense && (
                              <div className="mt-2 text-xs text-blue-600">MITRE D3FEND: {control.mitreDefense}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="mitre">
          <div className="space-y-4">
            <Alert>
              <Target className="h-4 w-4" />
              <AlertDescription>
                MITRE ATT&CK techniques most relevant to current threat level with corresponding countermeasures
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {currentTechniques.map((technique) => (
                <Card key={technique.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Badge variant="outline">{technique.id}</Badge>
                      <span className="text-sm">{technique.name}</span>
                    </CardTitle>
                    <CardDescription>{technique.tactic}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-3">{technique.description}</p>

                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Countermeasures:</h4>
                      <div className="flex flex-wrap gap-1">
                        {technique.countermeasures.map((counter) => (
                          <Badge key={counter} variant="secondary" className="text-xs">
                            {counter}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 space-y-1">
                      <h4 className="font-medium text-sm">NIST Mapping:</h4>
                      <div className="flex flex-wrap gap-1">
                        {technique.nistMapping.map((nist) => (
                          <Badge key={nist} variant="outline" className="text-xs">
                            {nist}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
