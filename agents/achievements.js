/** Achievements fire only on deterministic projection snapshots — never independent game HUD. */
export function evaluateAchievements(snapshot = {}) {
  const emergencyFundMonths = Number(snapshot.emergencyFundMonths) || 0;
  const minBalance = Number(snapshot.minBalance);
  const monthlyNet = Number(snapshot.monthlyNet) || 0;
  return [
    {
      id: "emergency-6",
      title: "6-month buffer",
      detail: `${emergencyFundMonths.toFixed(1)} months of observed spend in projected cash`,
      earned: emergencyFundMonths >= 6,
    },
    {
      id: "stayed-liquid",
      title: "Stayed liquid",
      detail: Number.isFinite(minBalance)
        ? `Lowest projected month ${Math.round(minBalance)}`
        : "No trajectory",
      earned: Number.isFinite(minBalance) && minBalance >= 0,
    },
    {
      id: "goal-on-track",
      title: "Goal in reach",
      detail: snapshot.onTrack ? "Projected balance meets the target" : "Projected balance misses the target",
      earned: Boolean(snapshot.onTrack),
    },
    {
      id: "pay-yourself",
      title: "Paying yourself first",
      detail: `Modeled monthly net ${Math.round(monthlyNet)}`,
      earned: monthlyNet > 0,
    },
  ];
}
