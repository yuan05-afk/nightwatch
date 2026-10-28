export type Incident = {
  id: number;
  verdict: "known" | "unknown";
  predicted: string;
  srcIp: string;
  dstIp: string;
  dstPort: number;
  firstSeen: string;
  lastSeen: string;
  flowCount: number;
  maxProbability: number;
  maxAnomaly: number;
  rankScore: number;
  status: "open" | "confirmed" | "false_positive" | "escalated";
  truthFamily: string | null;
};

export type ShiftState = {
  shift: { id: string; scenario: string; cursor: number; total: number };
  stats: {
    flowsScored: number;
    suppressed: number;
    known: number;
    unknown: number;
    attacksSuppressed: number;
    benignAlerts: number;
    scoringMicros: number;
  } | null;
  capacity: number;
  reviewable: number;
  incidents: Incident[];
  comparison: { attacks: number; incidents: number; reached: { nightwatch: number; fifo: number; confidence: number } };
};

export type Evidence = {
  incident: Incident & { exemplarFlowId: number };
  flow: { ts: string; srcIp: string; dstIp: string; srcPort: number; dstPort: number; protocol: number };
  score: {
    verdict: "known" | "unknown" | "suppressed";
    predicted: string;
    probability: number;
    set: string[];
    anomaly: number;
    anomalous: boolean;
    anomalyThreshold: number;
  };
  explainedClass: string;
  drivers: { feature: string; value: number; contribution: number; name: string; benign: string }[];
  related: { id: number; verdict: string; predicted: string; srcIp: string; dstIp: string; flowCount: number; status: string }[];
};
