export const SCENARIOS = [
  { id: "fri-botnet", title: "Friday afternoon", blurb: "A botnet calling home, port scans, then a DDoS." },
  { id: "wed-dos", title: "Wednesday", blurb: "Four kinds of denial of service and one Heartbleed probe." },
  { id: "thu-web", title: "Thursday", blurb: "29 web attacks and an infiltration hidden in 20,000 normal flows." },
] as const;

export type ScenarioId = (typeof SCENARIOS)[number]["id"];
export const SCENARIO_IDS = SCENARIOS.map((s) => s.id) as [ScenarioId, ...ScenarioId[]];
