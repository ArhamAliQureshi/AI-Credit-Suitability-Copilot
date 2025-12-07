
export interface CustomerProfile {
  customerType: "INDIVIDUAL" | "SME";
  name: string | null;
  age: number | null;
  citizenship: string | null;
  countryOfResidence: string | null;
  monthlyIncome: number | null;
  monthlyExpenses: number | null;
  existingLoanEMI: number | null;
  totalCreditCardLimits: number | null;
  totalCreditCardUtilization: number | null;
  businessAgeMonths: number | null; // for SMEs
  averageMonthlyRevenue: number | null; // for SMEs
  averageMonthlyNetProfit: number | null; // for SMEs
  bouncedChequesLast12Months: number | null;
  latePaymentIncidentsLast12Months: number | null;
  savingsBalanceEstimate: number | null;
  debtToIncomeRatio: number | null;
  dscr: number | null; // debt service coverage ratio
  riskFlags: string[];
  goal: "CREDIT_CARD" | "PERSONAL_LOAN" | "MORTGAGE" | "SME_WORKING_CAPITAL" | "BUSINESS_EXPANSION" | "OTHER" | null;
  riskTolerance: "LOW" | "MEDIUM" | "HIGH" | null;
  notes: string | null;
}

export interface Product {
  id: string;
  name: string;
  category: "CREDIT_CARD" | "PERSONAL_LOAN" | "SME_LOAN";
  description: string;
  targetCustomerType: "INDIVIDUAL" | "SME" | "BOTH";
  constraints: {
    minAge?: number;
    maxAge?: number;
    minMonthlyIncome?: number;
    minAverageMonthlyRevenue?: number;
    minBusinessAgeMonths?: number;
    maxDebtToIncome?: number;
    minDSCR?: number;
    maxBouncedChequesLast12Months?: number;
    maxLatePaymentIncidentsLast12Months?: number;
  };
  scoring: {
    weights: {
      incomeStability?: number;
      revenueStability?: number;
      debtToIncome?: number;
      dscr?: number;
      creditUtilization?: number;
      bouncedCheques?: number;
      latePayments?: number;
    };
    thresholds: {
      approve: number;
      review: number;
    };
  };
  explanationTemplates: {
    approved: string;
    review: string;
    declined: string;
  };
}

export interface EvaluationResult {
  productId: string;
  eligible: boolean;
  decision: "APPROVE" | "REVIEW" | "DECLINE";
  score: number;
  reasons: string[];
  summary: string;
  customerExplanation: string;
  advisorExplanation: string;
}

export interface FileData {
  name: string;
  mimeType: string;
  data: string; // Base64 string
  docType?: string; // Tag for the document type (e.g., "PAYSLIP", "TRADE_LICENSE")
}

export interface DocumentRequirement {
  label: string;
  required: boolean;
  description?: string;
}

export interface InputRequirement {
  required: boolean;
}

export interface CustomerTypeConfig {
  documents: Record<string, DocumentRequirement>;
  inputs: Record<string, InputRequirement>;
}

export type RequirementConfig = Record<"INDIVIDUAL" | "SME", CustomerTypeConfig>;

export interface DocumentValidation {
  slotKey: string;
  expectedDocType: string;
  detectedName: string | null;
  detectedDocType: string | null;
  nameMatchesDeclared: boolean;
  typeMatchesSlot: boolean;
  issues: string[];
}

export interface ValidationResponse {
  documentValidations: DocumentValidation[];
}
