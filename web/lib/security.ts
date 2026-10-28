// Plain-language and industry-standard context for each attack family:
// severity level, MITRE ATT&CK technique, what it is, and the first response steps.

export type Severity = "Critical" | "High" | "Medium" | "Low";

export type FamilyInfo = {
  severity: Severity;
  attack: { id: string; name: string; url: string };
  plain: string;
  respond: (src: string, dst: string, port: number) => string[];
};

const T = (id: string, name: string) => ({ id, name, url: `https://attack.mitre.org/techniques/${id.replace(".", "/")}/` });

export const FAMILIES: Record<string, FamilyInfo> = {
  Botnet: {
    severity: "Critical",
    attack: T("T1071", "Application Layer Protocol (command and control)"),
    plain: "A computer inside the network is regularly checking in with an outside server for instructions. That is how infected machines in a botnet are controlled.",
    respond: (src, dst) => [
      `Isolate ${src} from the network.`,
      `Block ${dst} at the firewall and check whether any other host contacts it.`,
      `Scan ${src} for malware and reset any credentials used on it.`,
    ],
  },
  Infiltration: {
    severity: "Critical",
    attack: T("T1105", "Ingress Tool Transfer"),
    plain: "An internal machine is exchanging commands with an outside host after a malicious download. The attacker may already have a foothold.",
    respond: (src, dst) => [
      `Isolate ${src} immediately and preserve it for forensics.`,
      `Block ${dst} and search logs for the first contact with it.`,
      "Treat as an active incident: notify the incident response lead.",
    ],
  },
  Heartbleed: {
    severity: "Critical",
    attack: T("T1190", "Exploit Public-Facing Application"),
    plain: "Someone is probing a server for the Heartbleed bug, which can leak passwords and encryption keys from memory.",
    respond: (src, dst, port) => [
      `Check that the service on ${dst}:${port} runs a patched OpenSSL version.`,
      `Block ${src}.`,
      "If the server was vulnerable, rotate its certificates and user passwords.",
    ],
  },
  "Web Injection": {
    severity: "High",
    attack: T("T1190", "Exploit Public-Facing Application"),
    plain: "Requests to a web application contain attack code (SQL injection or cross-site scripting) trying to steal data or hijack user sessions.",
    respond: (src, dst) => [
      `Block ${src} at the web application firewall.`,
      `Review the application logs on ${dst} for successful queries or changed data.`,
      "Ask the developers to check input validation on the targeted page.",
    ],
  },
  "Brute Force": {
    severity: "High",
    attack: T("T1110", "Brute Force"),
    plain: "Rapid, repeated login attempts against a service. This is how attackers take over accounts, a common first step in fraud.",
    respond: (src, dst, port) => [
      `Block ${src} and enable rate limiting on ${dst}:${port}.`,
      "Check for any successful logins from this source and reset those passwords.",
      "Require multi-factor authentication on the targeted service.",
    ],
  },
  DDoS: {
    severity: "High",
    attack: T("T1498", "Network Denial of Service"),
    plain: "A flood of requests aimed at knocking a service offline so real customers can't use it.",
    respond: (src, dst) => [
      `Rate-limit or block ${src} upstream.`,
      `Enable DDoS protection for ${dst} with your provider.`,
      "Watch service health and tell customers if it degrades.",
    ],
  },
  DoS: {
    severity: "Medium",
    attack: T("T1499", "Endpoint Denial of Service"),
    plain: "Traffic designed to exhaust a server, for example by holding connections open, so it stops answering.",
    respond: (src, dst) => [
      `Block ${src}.`,
      `Tighten connection timeouts and limits on ${dst}.`,
      "Confirm the service recovered.",
    ],
  },
  PortScan: {
    severity: "Low",
    attack: T("T1046", "Network Service Discovery"),
    plain: "Someone is mapping which services are open, usually reconnaissance before an attack.",
    respond: (src, dst) => [
      `Note ${src} and watch it closely for follow-up activity.`,
      `Close any services on ${dst} that don't need to be reachable.`,
    ],
  },
  Unknown: {
    severity: "Medium",
    attack: { id: "Unmapped", name: "No known technique matched", url: "https://attack.mitre.org/" },
    plain: "This traffic doesn't match any attack Nightwatch was trained on, but it doesn't look normal either. A person should look at it.",
    respond: (src, dst, port) => [
      `Look at what ${src} was doing with ${dst}:${port} around this time.`,
      "If it is legitimate, dismiss it as a false alarm so the model learns.",
      "If you can't explain it, escalate to a senior analyst.",
    ],
  },
};

export function familyInfo(family: string): FamilyInfo {
  return FAMILIES[family] ?? FAMILIES.Unknown;
}

export const SEVERITY_ORDER: Severity[] = ["Critical", "High", "Medium", "Low"];

export const VERDICT_LABEL = {
  known: "Recognized attack",
  unknown: "Unrecognized, needs review",
  suppressed: "Cleared as normal",
} as const;

export const STATUS_LABEL = {
  open: "New",
  confirmed: "Confirmed threat",
  false_positive: "False alarm",
  escalated: "Escalated",
} as const;
