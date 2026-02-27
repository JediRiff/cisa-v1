// Energy Related TTPs
// Maps MITRE ATT&CK technique IDs to observable signal phrases found in real advisories

export interface TTPSignature {
  id: string          // e.g., 'T1190'
  name: string        // e.g., 'Exploit Public-Facing Application'
  signals: string[]   // Phrases to match in feed text
  tools?: string[]    // Associated malware/tool names
  weight: number      // 0.0-1.0: how specific the signals are
}

// All unique TTPs across the 17 threat actors in worldData.ts
export const ttpSignatures: TTPSignature[] = [
  // ===== INITIAL ACCESS =====
  {
    id: 'T1190',
    name: 'Exploit Public-Facing Application',
    signals: ['exploit public-facing', 'remote code execution', 'RCE', 'CVE-', 'vulnerability exploit', 'zero-day', '0-day', 'web application exploit', 'server exploit'],
    tools: ['ProxyShell', 'ProxyLogon', 'Log4Shell', 'Citrix Bleed'],
    weight: 0.3,
  },
  {
    id: 'T1566.001',
    name: 'Spearphishing Attachment',
    signals: ['spearphishing attachment', 'phishing attachment', 'malicious attachment', 'weaponized document', 'macro-enabled', 'malicious macro', 'phishing email with attachment'],
    weight: 0.5,
  },
  {
    id: 'T1566.002',
    name: 'Spearphishing Link',
    signals: ['spearphishing link', 'phishing link', 'malicious link', 'credential harvesting link', 'phishing URL', 'phishing campaign'],
    weight: 0.4,
  },
  {
    id: 'T1566.003',
    name: 'Spearphishing via Service',
    signals: ['spearphishing via service', 'social media phishing', 'LinkedIn phishing', 'messaging platform phishing'],
    weight: 0.6,
  },
  {
    id: 'T1189',
    name: 'Drive-by Compromise',
    signals: ['drive-by compromise', 'drive-by download', 'watering hole', 'strategic web compromise', 'compromised website', 'malicious redirect'],
    weight: 0.6,
  },
  {
    id: 'T1195.002',
    name: 'Supply Chain Compromise: Software Supply Chain',
    signals: ['supply chain compromise', 'supply chain attack', 'software supply chain', 'trojanized update', 'compromised software update', 'SolarWinds', 'backdoored software'],
    tools: ['SUNBURST', 'ShadowPad'],
    weight: 0.7,
  },
  {
    id: 'T1133',
    name: 'External Remote Services',
    signals: ['external remote services', 'VPN compromise', 'VPN exploitation', 'remote access gateway', 'exposed RDP', 'exposed remote service'],
    weight: 0.4,
  },

  // ===== EXECUTION =====
  {
    id: 'T1059',
    name: 'Command and Scripting Interpreter',
    signals: ['command interpreter', 'scripting interpreter', 'command line execution', 'script execution'],
    weight: 0.2,
  },
  {
    id: 'T1059.001',
    name: 'PowerShell',
    signals: ['powershell', 'powershell execution', 'powershell script', 'powershell command', 'encoded powershell', 'powershell payload'],
    weight: 0.3,
  },
  {
    id: 'T1059.005',
    name: 'Visual Basic',
    signals: ['visual basic', 'VBScript', 'VBA macro', 'malicious macro', 'macro payload'],
    weight: 0.4,
  },
  {
    id: 'T1059.007',
    name: 'JavaScript',
    signals: ['malicious javascript', 'javascript execution', 'JScript', 'malicious JS'],
    weight: 0.4,
  },
  {
    id: 'T1203',
    name: 'Exploitation for Client Execution',
    signals: ['client-side exploit', 'exploitation for client execution', 'browser exploit', 'document exploit', 'exploit kit'],
    weight: 0.4,
  },
  {
    id: 'T1204.002',
    name: 'User Execution: Malicious File',
    signals: ['malicious file execution', 'user execution', 'social engineering execution', 'trojanized file', 'malicious executable'],
    weight: 0.3,
  },
  {
    id: 'T1047',
    name: 'Windows Management Instrumentation',
    signals: ['WMI', 'Windows Management Instrumentation', 'WMIC', 'WMI execution', 'WMI lateral movement'],
    weight: 0.5,
  },

  // ===== PERSISTENCE =====
  {
    id: 'T1505.003',
    name: 'Web Shell',
    signals: ['web shell', 'webshell', 'China Chopper', 'web backdoor', 'ASPXSpy', 'JSP shell'],
    tools: ['China Chopper', 'ASPXSpy', 'Godzilla'],
    weight: 0.7,
  },
  {
    id: 'T1078',
    name: 'Valid Accounts',
    signals: ['valid accounts', 'stolen credentials', 'compromised credentials', 'legitimate credentials', 'credential theft'],
    weight: 0.3,
  },
  {
    id: 'T1078.001',
    name: 'Default Accounts',
    signals: ['default credentials', 'default password', 'default account', 'factory credentials'],
    weight: 0.5,
  },
  {
    id: 'T1078.002',
    name: 'Valid Accounts: Domain Accounts',
    signals: ['domain account', 'Active Directory account', 'AD credentials', 'domain credentials', 'domain admin'],
    weight: 0.4,
  },
  {
    id: 'T1574.001',
    name: 'DLL Search Order Hijacking',
    signals: ['DLL hijacking', 'DLL search order hijacking', 'DLL side-loading', 'DLL sideloading', 'phantom DLL'],
    weight: 0.7,
  },
  {
    id: 'T1053.005',
    name: 'Scheduled Task',
    signals: ['scheduled task', 'schtasks', 'task scheduler', 'scheduled job', 'cron job persistence'],
    weight: 0.4,
  },
  {
    id: 'T1098.001',
    name: 'Account Manipulation: Additional Cloud Credentials',
    signals: ['cloud credential manipulation', 'additional cloud credentials', 'OAuth token', 'service principal', 'cloud account manipulation'],
    weight: 0.6,
  },
  {
    id: 'T1098.004',
    name: 'Account Manipulation: SSH Authorized Keys',
    signals: ['SSH authorized keys', 'SSH key injection', 'SSH backdoor', 'authorized_keys modification'],
    weight: 0.7,
  },
  {
    id: 'T1136',
    name: 'Create Account',
    signals: ['create account', 'rogue account', 'unauthorized account creation', 'backdoor account'],
    weight: 0.4,
  },
  {
    id: 'T1176.001',
    name: 'Browser Extensions',
    signals: ['malicious browser extension', 'browser extension backdoor', 'Chrome extension', 'browser plugin'],
    weight: 0.6,
  },
  {
    id: 'T1546.008',
    name: 'Accessibility Features',
    signals: ['accessibility features', 'Sticky Keys', 'sethc.exe', 'accessibility backdoor', 'utilman.exe'],
    weight: 0.7,
  },

  // ===== PRIVILEGE ESCALATION =====
  {
    id: 'T1068',
    name: 'Exploitation for Privilege Escalation',
    signals: ['privilege escalation exploit', 'local privilege escalation', 'LPE', 'kernel exploit', 'privilege escalation vulnerability'],
    weight: 0.4,
  },

  // ===== DEFENSE EVASION =====
  {
    id: 'T1562.001',
    name: 'Impair Defenses: Disable or Modify Tools',
    signals: ['disable antivirus', 'disable security tools', 'impair defenses', 'EDR evasion', 'tamper protection', 'disable endpoint protection'],
    weight: 0.5,
  },
  {
    id: 'T1562.004',
    name: 'Disable or Modify System Firewall',
    signals: ['disable firewall', 'modify firewall rules', 'firewall manipulation', 'firewall evasion'],
    weight: 0.5,
  },
  {
    id: 'T1055',
    name: 'Process Injection',
    signals: ['process injection', 'code injection', 'shellcode injection', 'memory injection', 'process hollowing'],
    weight: 0.5,
  },
  {
    id: 'T1055.001',
    name: 'DLL Injection',
    signals: ['DLL injection', 'dynamic link library injection', 'reflective DLL injection', 'reflective loading'],
    weight: 0.6,
  },
  {
    id: 'T1553.002',
    name: 'Subvert Trust Controls: Code Signing',
    signals: ['code signing', 'stolen certificate', 'forged certificate', 'signed malware', 'certificate abuse'],
    weight: 0.6,
  },
  {
    id: 'T1484.001',
    name: 'Group Policy Modification',
    signals: ['Group Policy modification', 'GPO modification', 'Group Policy Object', 'GPO abuse', 'domain policy'],
    weight: 0.6,
  },
  {
    id: 'T1484.002',
    name: 'Domain Policy Modification: Trust Modification',
    signals: ['domain trust modification', 'federation trust', 'trust manipulation', 'domain trust abuse'],
    weight: 0.7,
  },
  {
    id: 'T1027.003',
    name: 'Steganography',
    signals: ['steganography', 'hidden data in image', 'payload in image', 'data hiding'],
    weight: 0.8,
  },
  {
    id: 'T1027.006',
    name: 'HTML Smuggling',
    signals: ['HTML smuggling', 'HTML payload delivery', 'JavaScript blob', 'encoded HTML payload'],
    weight: 0.7,
  },
  {
    id: 'T1027.010',
    name: 'Command Obfuscation',
    signals: ['command obfuscation', 'obfuscated command', 'encoded command', 'base64 encoded', 'obfuscated script'],
    weight: 0.3,
  },
  {
    id: 'T1027.011',
    name: 'Fileless Storage',
    signals: ['fileless malware', 'fileless storage', 'registry storage', 'in-memory malware', 'fileless execution'],
    weight: 0.6,
  },
  {
    id: 'T1218.005',
    name: 'Mshta',
    signals: ['mshta', 'mshta.exe', 'HTA execution', 'HTML application'],
    tools: ['mshta.exe'],
    weight: 0.7,
  },
  {
    id: 'T1218.011',
    name: 'Rundll32',
    signals: ['rundll32', 'rundll32.exe', 'DLL execution via rundll32'],
    weight: 0.5,
  },
  {
    id: 'T1070.002',
    name: 'Clear Linux or Mac System Logs',
    signals: ['log clearing', 'clear system logs', 'log deletion', 'log tampering', 'evidence destruction'],
    weight: 0.5,
  },

  // ===== CREDENTIAL ACCESS =====
  {
    id: 'T1003',
    name: 'OS Credential Dumping',
    signals: ['credential dumping', 'credential theft', 'password dumping', 'credential harvesting'],
    tools: ['Mimikatz'],
    weight: 0.4,
  },
  {
    id: 'T1003.001',
    name: 'OS Credential Dumping: LSASS Memory',
    signals: ['LSASS', 'LSASS memory', 'LSASS dump', 'credential dump', 'Mimikatz', 'lsass.exe', 'LSASS process'],
    tools: ['Mimikatz', 'ProcDump'],
    weight: 0.8,
  },
  {
    id: 'T1003.003',
    name: 'OS Credential Dumping: NTDS',
    signals: ['NTDS', 'ntds.dit', 'NTDS dumping', 'Active Directory database', 'AD database extraction', 'domain controller dump'],
    weight: 0.8,
  },
  {
    id: 'T1003.006',
    name: 'OS Credential Dumping: DCSync',
    signals: ['DCSync', 'DC Sync', 'domain replication', 'replication privilege', 'DCSync attack'],
    tools: ['Mimikatz'],
    weight: 0.9,
  },
  {
    id: 'T1110',
    name: 'Brute Force',
    signals: ['brute force', 'brute-force', 'password guessing', 'credential stuffing', 'login attempt'],
    weight: 0.3,
  },
  {
    id: 'T1110.002',
    name: 'Brute Force: Password Cracking',
    signals: ['password cracking', 'hash cracking', 'offline cracking', 'hashcat', 'John the Ripper'],
    weight: 0.5,
  },
  {
    id: 'T1110.003',
    name: 'Brute Force: Password Spraying',
    signals: ['password spraying', 'password spray', 'credential spraying', 'spray attack', 'low-and-slow brute force'],
    weight: 0.7,
  },
  {
    id: 'T1187',
    name: 'Forced Authentication',
    signals: ['forced authentication', 'NTLM relay', 'NTLM capture', 'SMB relay', 'credential relay'],
    tools: ['Responder', 'Impacket'],
    weight: 0.7,
  },
  {
    id: 'T1606.002',
    name: 'Forge Web Credentials: SAML Tokens',
    signals: ['SAML token', 'Golden SAML', 'forged SAML', 'SAML assertion', 'token forging'],
    weight: 0.9,
  },
  {
    id: 'T1621',
    name: 'Multi-Factor Authentication Request Generation',
    signals: ['MFA fatigue', 'MFA bombing', 'MFA push spam', 'MFA prompt bombing', 'authentication request flood'],
    weight: 0.7,
  },
  {
    id: 'T1555.003',
    name: 'Credentials from Web Browsers',
    signals: ['browser credential theft', 'browser password', 'saved password extraction', 'browser credential dump'],
    weight: 0.5,
  },
  {
    id: 'T1056.001',
    name: 'Keylogging',
    signals: ['keylogger', 'keylogging', 'keystroke logging', 'keyboard capture', 'input capture'],
    weight: 0.5,
  },

  // ===== DISCOVERY =====
  {
    id: 'T1040',
    name: 'Network Sniffing',
    signals: ['network sniffing', 'packet capture', 'traffic interception', 'network monitoring', 'pcap'],
    weight: 0.4,
  },

  // ===== LATERAL MOVEMENT =====
  {
    id: 'T1210',
    name: 'Exploitation of Remote Services',
    signals: ['lateral movement exploit', 'remote service exploitation', 'internal exploitation', 'lateral exploit'],
    weight: 0.4,
  },
  {
    id: 'T1021.001',
    name: 'Remote Desktop Protocol',
    signals: ['RDP', 'Remote Desktop', 'RDP access', 'RDP lateral movement', 'remote desktop connection'],
    weight: 0.3,
  },
  {
    id: 'T1021.006',
    name: 'Windows Remote Management',
    signals: ['WinRM', 'Windows Remote Management', 'PSRemoting', 'remote PowerShell'],
    weight: 0.5,
  },
  {
    id: 'T1550.002',
    name: 'Pass the Hash',
    signals: ['pass the hash', 'pass-the-hash', 'PtH', 'NTLM hash reuse', 'hash-based authentication'],
    weight: 0.8,
  },

  // ===== COLLECTION =====
  {
    id: 'T1005',
    name: 'Data from Local System',
    signals: ['data collection', 'local data theft', 'file collection', 'data staging', 'data harvesting'],
    weight: 0.2,
  },
  {
    id: 'T1114.002',
    name: 'Remote Email Collection',
    signals: ['email collection', 'mailbox access', 'email exfiltration', 'Exchange mailbox', 'email harvesting'],
    weight: 0.5,
  },
  {
    id: 'T1114.003',
    name: 'Email Forwarding Rule',
    signals: ['email forwarding rule', 'mail forwarding', 'inbox rule', 'auto-forward rule', 'email redirection'],
    weight: 0.7,
  },
  {
    id: 'T1602.002',
    name: 'Network Device Configuration Dump',
    signals: ['network device configuration', 'config dump', 'router configuration', 'switch configuration', 'network device dump'],
    weight: 0.6,
  },

  // ===== COMMAND AND CONTROL =====
  {
    id: 'T1071.001',
    name: 'Application Layer Protocol: Web Protocols',
    signals: ['HTTP C2', 'HTTPS C2', 'web-based C2', 'HTTP command and control', 'HTTP beacon'],
    weight: 0.3,
  },
  {
    id: 'T1071.003',
    name: 'Application Layer Protocol: Mail Protocols',
    signals: ['email C2', 'SMTP C2', 'mail-based command and control', 'email-based C2'],
    weight: 0.6,
  },
  {
    id: 'T1071.004',
    name: 'Application Layer Protocol: DNS',
    signals: ['DNS tunneling', 'DNS C2', 'DNS-based C2', 'DNS exfiltration', 'DNS command and control'],
    weight: 0.7,
  },
  {
    id: 'T1090.001',
    name: 'Proxy: Internal Proxy',
    signals: ['internal proxy', 'reverse proxy', 'proxy pivoting', 'SOCKS proxy', 'internal tunneling'],
    weight: 0.5,
  },
  {
    id: 'T1090.002',
    name: 'Proxy: External Proxy',
    signals: ['external proxy', 'proxy chain', 'anonymization proxy', 'VPN proxy', 'relay proxy'],
    weight: 0.4,
  },
  {
    id: 'T1090.004',
    name: 'Proxy: Domain Fronting',
    signals: ['domain fronting', 'CDN fronting', 'cloud fronting', 'domain front'],
    weight: 0.8,
  },
  {
    id: 'T1105',
    name: 'Ingress Tool Transfer',
    signals: ['tool transfer', 'payload download', 'malware download', 'tool deployment', 'stage payload'],
    weight: 0.3,
  },
  {
    id: 'T1219',
    name: 'Remote Access Tools',
    signals: ['remote access tool', 'RAT', 'remote administration tool', 'Atera', 'AnyDesk', 'ScreenConnect', 'TeamViewer abuse'],
    tools: ['Atera', 'AnyDesk', 'ScreenConnect'],
    weight: 0.5,
  },
  {
    id: 'T1102.002',
    name: 'Web Service: Bidirectional Communication',
    signals: ['web service C2', 'cloud service C2', 'Dropbox C2', 'Google Drive C2', 'legitimate service abuse'],
    weight: 0.6,
  },
  {
    id: 'T1572',
    name: 'Protocol Tunneling',
    signals: ['protocol tunneling', 'tunnel traffic', 'encapsulated protocol', 'SSH tunnel', 'DNS tunnel', 'ICMP tunnel'],
    weight: 0.5,
  },

  // ===== EXFILTRATION =====
  {
    id: 'T1048.002',
    name: 'Exfiltration Over Asymmetric Encrypted Non-C2',
    signals: ['encrypted exfiltration', 'asymmetric encryption exfiltration', 'data exfiltration over encrypted channel'],
    weight: 0.6,
  },
  {
    id: 'T1048.003',
    name: 'Exfiltration Over Unencrypted Non-C2 Protocol',
    signals: ['unencrypted exfiltration', 'FTP exfiltration', 'data exfiltration', 'bulk data transfer'],
    weight: 0.5,
  },

  // ===== IMPACT =====
  {
    id: 'T1485',
    name: 'Data Destruction',
    signals: ['data destruction', 'data wiper', 'wiper malware', 'file destruction', 'destructive malware'],
    tools: ['WhisperGate', 'HermeticWiper', 'CaddyWiper', 'KillDisk'],
    weight: 0.8,
  },
  {
    id: 'T1486',
    name: 'Data Encrypted for Impact',
    signals: ['ransomware', 'data encryption', 'encrypted for impact', 'ransom demand', 'file encryption', 'ransomware attack'],
    weight: 0.5,
  },
  {
    id: 'T1489',
    name: 'Service Stop',
    signals: ['service stop', 'service disruption', 'stop critical services', 'kill service', 'service termination'],
    weight: 0.5,
  },
  {
    id: 'T1490',
    name: 'Inhibit System Recovery',
    signals: ['inhibit system recovery', 'delete shadow copies', 'vssadmin delete', 'disable recovery', 'delete backups'],
    weight: 0.6,
  },
  {
    id: 'T1561.002',
    name: 'Disk Wipe: Disk Structure Wipe',
    signals: ['disk wipe', 'MBR wipe', 'disk structure wipe', 'boot sector wipe', 'partition table wipe'],
    tools: ['KillDisk', 'WhisperGate'],
    weight: 0.9,
  },
  {
    id: 'T1491.001',
    name: 'Internal Defacement',
    signals: ['defacement', 'internal defacement', 'website defacement', 'system defacement'],
    weight: 0.5,
  },

  // ===== RECONNAISSANCE =====
  {
    id: 'T1598.003',
    name: 'Phishing for Information: Spearphishing Link',
    signals: ['phishing for information', 'reconnaissance phishing', 'credential phishing', 'information gathering phishing'],
    weight: 0.4,
  },

  // ===== ICS-DOMAIN TECHNIQUES =====
  {
    id: 'T0812',
    name: 'Default Credentials',
    signals: ['default credentials', 'factory password', 'default PLC password', 'default HMI password', 'default ICS credentials'],
    weight: 0.6,
  },
  {
    id: 'T0883',
    name: 'Internet Accessible Device',
    signals: ['internet accessible device', 'internet-exposed PLC', 'internet-facing ICS', 'exposed SCADA', 'internet-accessible controller', 'Shodan'],
    weight: 0.6,
  },
  {
    id: 'T0814',
    name: 'Denial of Service',
    signals: ['ICS denial of service', 'SCADA disruption', 'controller denial of service', 'PLC disruption', 'operational disruption'],
    weight: 0.5,
  },
  {
    id: 'T0826',
    name: 'Loss of Availability',
    signals: ['loss of availability', 'system unavailable', 'operational outage', 'control system outage', 'process disruption'],
    weight: 0.5,
  },
  {
    id: 'T0828',
    name: 'Loss of Productivity and Revenue',
    signals: ['loss of productivity', 'production impact', 'revenue loss', 'operational impact', 'production downtime'],
    weight: 0.4,
  },
  {
    id: 'T0829',
    name: 'Loss of View',
    signals: ['loss of view', 'HMI disruption', 'operator visibility loss', 'monitoring disruption', 'control visibility'],
    weight: 0.6,
  },
]

// Build a lookup map by technique ID for fast access
export const ttpSignatureMap = new Map<string, TTPSignature>(
  ttpSignatures.map(sig => [sig.id, sig])
)
