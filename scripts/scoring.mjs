function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function scoreTrend(metrics) {
  const impressionGrowth = metrics.impressions ?? 0;
  const clickGrowth = metrics.clicks ?? 0;
  const ctrGrowth = metrics.ctr ?? 0;
  const positionGain = metrics.position ?? 0;
  const ga4SearchGrowth = metrics.searches ?? 0;
  const ga4RepeatDemand = metrics.repeatRate ?? 0;
  const redditVelocity = metrics.redditVelocity ?? 0;
  const googleTrendsMovement = metrics.googleTrendsVelocity ?? 0;
  const googleNewsMovement = metrics.googleNewsVelocity ?? 0;
  const sourceBonus = (metrics.sourceCount ?? 1) * 4;
  const noveltyBonus = (metrics.novelty ?? 0) * 7;

  const score =
    impressionGrowth * 0.18 +
    clickGrowth * 0.16 +
    ctrGrowth * 0.08 +
    positionGain * 0.06 +
    ga4SearchGrowth * 0.12 +
    ga4RepeatDemand * 0.08 +
    redditVelocity * 0.11 +
    googleTrendsMovement * 0.08 +
    googleNewsMovement * 0.07 +
    sourceBonus +
    noveltyBonus;

  return clamp(score, -100, 100);
}

export function classifyTrend(score, metrics) {
  if ((metrics.clicks ?? 0) < -25 || (metrics.searches ?? 0) < -25 || score < -15) {
    return "declining";
  }
  if ((metrics.novelty ?? 0) > 0 && score > 45) {
    return "new";
  }
  if ((metrics.sourceCount ?? 1) >= 3 && score > 55) {
    return "breakout";
  }
  if (score > 20) {
    return "rising";
  }
  return "steady";
}
