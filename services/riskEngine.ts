import { CustomerProfile, Product, EvaluationResult } from '../types';

/**
 * Normalizes a value to a 0-1 score based on a "good" and "bad" threshold.
 * If higher is better: value >= good -> 1, value <= bad -> 0
 * If lower is better: value <= good -> 1, value >= bad -> 0
 */
function normalize(value: number, good: number, bad: number, higherIsBetter: boolean): number {
  if (higherIsBetter) {
    if (value >= good) return 1;
    if (value <= bad) return 0;
    return (value - bad) / (good - bad);
  } else {
    if (value <= good) return 1;
    if (value >= bad) return 0;
    return (bad - value) / (bad - good);
  }
}

export function evaluateProductForProfile(profile: CustomerProfile, product: Product): EvaluationResult {
  const constraints = product.constraints;
  const reasons: string[] = [];
  let eligible = true;

  // 1. Check Hard Constraints
  if (constraints.minAge && (profile.age || 0) < constraints.minAge) {
    eligible = false;
    reasons.push(`Under minimum age (${constraints.minAge})`);
  }
  if (constraints.maxAge && (profile.age || 0) > constraints.maxAge) {
    eligible = false;
    reasons.push(`Over maximum age (${constraints.maxAge})`);
  }
  if (constraints.minMonthlyIncome && (profile.monthlyIncome || 0) < constraints.minMonthlyIncome) {
    eligible = false;
    reasons.push(`Income below minimum (${constraints.minMonthlyIncome})`);
  }
  if (constraints.minAverageMonthlyRevenue && (profile.averageMonthlyRevenue || 0) < constraints.minAverageMonthlyRevenue) {
    eligible = false;
    reasons.push(`Revenue below minimum (${constraints.minAverageMonthlyRevenue})`);
  }
  if (constraints.minBusinessAgeMonths && (profile.businessAgeMonths || 0) < constraints.minBusinessAgeMonths) {
    eligible = false;
    reasons.push(`Business too young (<${constraints.minBusinessAgeMonths} months)`);
  }
  if (constraints.maxDebtToIncome && (profile.debtToIncomeRatio || 0) > constraints.maxDebtToIncome) {
    eligible = false;
    reasons.push(`DTI too high (>${constraints.maxDebtToIncome})`);
  }
  if (constraints.minDSCR && (profile.dscr || 0) < constraints.minDSCR) {
    eligible = false;
    reasons.push(`DSCR too low (<${constraints.minDSCR})`);
  }
  if (constraints.maxBouncedChequesLast12Months !== undefined && (profile.bouncedChequesLast12Months || 0) > constraints.maxBouncedChequesLast12Months) {
    eligible = false;
    reasons.push(`Too many bounced cheques (>${constraints.maxBouncedChequesLast12Months})`);
  }
  if (constraints.maxLatePaymentIncidentsLast12Months !== undefined && (profile.latePaymentIncidentsLast12Months || 0) > constraints.maxLatePaymentIncidentsLast12Months) {
    eligible = false;
    reasons.push(`Too many late payments (>${constraints.maxLatePaymentIncidentsLast12Months})`);
  }

  // 2. Calculate Weighted Score
  let totalScore = 0;
  let totalWeight = 0;
  const weights = product.scoring.weights;

  // Helper to add to score
  const addScore = (weight: number | undefined, rawValue: number | null | undefined, good: number, bad: number, higherBetter: boolean) => {
    if (weight && weight > 0) {
      const val = rawValue || (higherBetter ? bad : bad); // Assume worst case if missing for scoring
      const s = normalize(val, good, bad, higherBetter);
      totalScore += s * weight;
      totalWeight += weight;
    }
  };

  // Define scoring heuristics (simplified for demo)
  addScore(weights.debtToIncome, profile.debtToIncomeRatio, 0.30, 0.60, false); // Lower DTI is better
  addScore(weights.dscr, profile.dscr, 1.5, 1.0, true); // Higher DSCR is better
  addScore(weights.creditUtilization, profile.totalCreditCardUtilization, 0.30, 0.90, false); // Lower util is better
  addScore(weights.bouncedCheques, profile.bouncedChequesLast12Months, 0, 3, false); // 0 is good, 3 is bad
  addScore(weights.latePayments, profile.latePaymentIncidentsLast12Months, 0, 3, false); // 0 is good, 3 is bad
  
  // Income/Revenue stability proxies (simplified: higher income/rev is "more stable" in this naive model)
  addScore(weights.incomeStability, profile.monthlyIncome, 10000, 2000, true);
  addScore(weights.revenueStability, profile.averageMonthlyRevenue, 50000, 5000, true);

  const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;

  // 3. Determine Decision
  let decision: "APPROVE" | "REVIEW" | "DECLINE" = "DECLINE";
  let summary = "";

  if (!eligible) {
    decision = "DECLINE";
    summary = `Failed requirements: ${reasons[0] || 'Multiple criteria'}`;
  } else {
    if (finalScore >= product.scoring.thresholds.approve) {
      decision = "APPROVE";
      summary = "Meets all criteria with a strong score.";
    } else if (finalScore >= product.scoring.thresholds.review) {
      decision = "REVIEW";
      summary = "Meets minimums but score indicates moderate risk.";
      reasons.push("Borderline Score");
    } else {
      decision = "DECLINE";
      summary = "Score below approval threshold.";
      reasons.push("Low Score");
    }
  }

  return {
    productId: product.id,
    eligible,
    decision,
    score: parseFloat(finalScore.toFixed(2)),
    reasons,
    summary,
    customerExplanation: "Pending AI generation...",
    advisorExplanation: "Pending AI generation..."
  };
}