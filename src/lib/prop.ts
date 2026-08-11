export type PropPhase = "evaluation" | "funded";
export type PropStatus = "in_progress" | "passed" | "breached" | "payout";

export type PropAccount = {
  id: string;
  user_id: string;
  firm: string;
  account_size: number | null;
  phase: PropPhase;
  status: PropStatus;
  cost: number;
  activation_fee: number;
  payout_total: number;
  started_at: string;
  passed_at: string | null;
  breached_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export const PROP_FIRMS = [
  { name: "Topstep", url: "https://www.topstep.com" },
  { name: "Lucid Trading", url: "https://lucidtrading.com" },
  { name: "MyFundedFutures", url: "https://myfundedfutures.com" },
  { name: "Tradeify", url: "https://tradeify.co" },
  { name: "Apex Trader Funding", url: "https://apextraderfunding.com" },
];

export const ACCOUNT_SIZES = [25000, 50000, 75000, 100000, 150000, 250000, 300000];

export const STATUS_LABEL: Record<PropStatus, string> = {
  in_progress: "In progress",
  passed: "Passed",
  breached: "Breached",
  payout: "Payout received",
};

export type PropStats = {
  total: number;
  evaluations: number;
  funded: number;
  active: number;
  passed: number;
  breached: number;
  totalCost: number;
  totalPayout: number;
  net: number;
  passRate: number;
  breachRate: number;
  avgCost: number;
  costPerPass: number;
  fundedPayout: number;
  fundedBreached: number;
  fundedSurvival: number;
};

export function propStats(rows: PropAccount[]): PropStats {
  const evals = rows.filter((r) => r.phase === "evaluation");
  const funded = rows.filter((r) => r.phase === "funded");
  const passed = rows.filter((r) => r.status === "passed" || r.status === "payout").length;
  const breached = rows.filter((r) => r.status === "breached").length;
  const settledEvals = evals.filter((r) => r.status !== "in_progress");
  const evalPassed = evals.filter((r) => r.status === "passed" || r.status === "payout").length;
  const evalBreached = evals.filter((r) => r.status === "breached").length;
  const totalCost = rows.reduce((a, r) => a + Number(r.cost) + Number(r.activation_fee), 0);
  const totalPayout = rows.reduce((a, r) => a + Number(r.payout_total), 0);
  const fundedBreached = funded.filter((r) => r.status === "breached").length;

  return {
    total: rows.length,
    evaluations: evals.length,
    funded: funded.length,
    active: rows.filter((r) => r.status === "in_progress").length,
    passed,
    breached,
    totalCost,
    totalPayout,
    net: totalPayout - totalCost,
    passRate: settledEvals.length ? (evalPassed / settledEvals.length) * 100 : 0,
    breachRate: settledEvals.length ? (evalBreached / settledEvals.length) * 100 : 0,
    avgCost: rows.length ? totalCost / rows.length : 0,
    costPerPass: evalPassed ? totalCost / evalPassed : 0,
    fundedPayout: funded.reduce((a, r) => a + Number(r.payout_total), 0),
    fundedBreached,
    fundedSurvival: funded.length ? ((funded.length - fundedBreached) / funded.length) * 100 : 0,
  };
}
