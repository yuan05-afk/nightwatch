import { SCENARIOS } from "@/lib/scenarios";

export function GET() {
  return Response.json({ scenarios: SCENARIOS });
}
