import { Product, CustomerProfile, RequirementConfig } from './types';

export const REQUIREMENT_CONFIG: RequirementConfig = {
  INDIVIDUAL: {
    documents: {
      INDIVIDUAL_BANK_STATEMENT: {
        label: "Recent bank statement (PDF or image)",
        required: true,
        description: "Used to estimate income, expenses, and cash flow."
      },
      PAYSLIP: {
        label: "Latest payslip (PDF or image)",
        required: true,
        description: "Used to validate salary and allowances for salaried customers."
      },
      ID_DOCUMENT: {
        label: "ID / Passport (image or PDF)",
        required: true,
        description: "Used to enrich identity details."
      },
      ADDRESS_PROOF: {
        label: "Proof of address (utility bill)",
        required: false,
        description: "Used to verify country and city of residence."
      }
    },
    inputs: {
      goal: { required: true },
      riskTolerance: { required: false },
      countryOfResidence: { required: true },
      citizenship: { required: true },
      name: { required: true }
    }
  },
  SME: {
    documents: {
      SME_BANK_STATEMENT: {
        label: "Latest business bank statement (PDF or image)",
        required: true,
        description: "Used to estimate revenue, expenses, and cash flow stability."
      },
      TRADE_LICENSE: {
        label: "Trade license / commercial registration",
        required: true,
        description: "Used to derive business age and legal details."
      },
      PANDL_SUMMARY: {
        label: "Management accounts / P&L summary",
        required: false,
        description: "Used to derive profitability and margins."
      },
      SALES_DASHBOARD: {
        label: "Sales dashboard screenshot",
        required: false,
        description: "Used to understand sales patterns and seasonality (POS/Stripe)."
      }
    },
    inputs: {
      name: { required: true }, // Business Name
      goal: { required: true },
      countryOfResidence: { required: true } // Jurisdiction
    }
  }
};

export const DEMO_PRODUCTS: Product[] = [
  {
    id: "prod_cc_001",
    name: "Everyday Cashback Platinum",
    category: "CREDIT_CARD",
    description: "High-value cashback card for salaried individuals with stable income.",
    targetCustomerType: "INDIVIDUAL",
    constraints: {
      minAge: 21,
      minMonthlyIncome: 3000,
      maxDebtToIncome: 0.5,
      maxLatePaymentIncidentsLast12Months: 1
    },
    scoring: {
      weights: {
        incomeStability: 0.3,
        debtToIncome: 0.4,
        creditUtilization: 0.3
      },
      thresholds: {
        approve: 0.75,
        review: 0.5
      }
    },
    explanationTemplates: {
      approved: "You are well-qualified for the {{productName}} due to your low debt ratio.",
      review: "Your application requires manual review due to moderate credit utilization.",
      declined: "We cannot offer this card at this time due to high debt-to-income ratio."
    }
  },
  {
    id: "prod_pl_001",
    name: "Flexi-Personal Loan",
    category: "PERSONAL_LOAN",
    description: "Unsecured personal loan up to $50k for debt consolidation or large purchases.",
    targetCustomerType: "INDIVIDUAL",
    constraints: {
      minAge: 23,
      minMonthlyIncome: 4000,
      maxDebtToIncome: 0.6,
      maxBouncedChequesLast12Months: 0
    },
    scoring: {
      weights: {
        debtToIncome: 0.5,
        incomeStability: 0.3,
        latePayments: 0.2
      },
      thresholds: {
        approve: 0.8,
        review: 0.6
      }
    },
    explanationTemplates: {
      approved: "Your strong income stability makes you a great candidate for {{productName}}.",
      review: "We can consider your application, but may need additional guarantors.",
      declined: "Income stability or debt levels do not meet the strict criteria for this loan."
    }
  },
  {
    id: "prod_sme_001",
    name: "SME Working Capital Line",
    category: "SME_LOAN",
    description: "Revolving credit line for businesses to manage cash flow gaps.",
    targetCustomerType: "SME",
    constraints: {
      minBusinessAgeMonths: 24,
      minAverageMonthlyRevenue: 10000,
      minDSCR: 1.25,
      maxBouncedChequesLast12Months: 2
    },
    scoring: {
      weights: {
        revenueStability: 0.3,
        dscr: 0.4,
        bouncedCheques: 0.3
      },
      thresholds: {
        approve: 0.7,
        review: 0.5
      }
    },
    explanationTemplates: {
      approved: "Your business health and DSCR of {{dscr}} qualify you for our prime rate.",
      review: "Your cash flow is generally good, but recent bounced cheques trigger a manual review.",
      declined: "The business does not meet the minimum revenue or stability requirements."
    }
  },
  {
    id: "prod_sme_002",
    name: "Startup Builder Card",
    category: "CREDIT_CARD",
    description: "Credit card for early-stage businesses with high growth potential.",
    targetCustomerType: "SME",
    constraints: {
      minBusinessAgeMonths: 6,
      minAverageMonthlyRevenue: 2000
    },
    scoring: {
      weights: {
        revenueStability: 0.5,
        creditUtilization: 0.5
      },
      thresholds: {
        approve: 0.6,
        review: 0.4
      }
    },
    explanationTemplates: {
      approved: "Great fit for a young business showing consistent monthly revenue.",
      review: "Revenue history is short, but we can review with additional documentation.",
      declined: "Revenue levels are currently too low for this commercial card product."
    }
  }
];

export const INITIAL_PROFILE: CustomerProfile = {
  customerType: "INDIVIDUAL",
  name: null,
  age: null,
  citizenship: null,
  countryOfResidence: null,
  monthlyIncome: null,
  monthlyExpenses: null,
  existingLoanEMI: null,
  totalCreditCardLimits: null,
  totalCreditCardUtilization: null,
  businessAgeMonths: null,
  averageMonthlyRevenue: null,
  averageMonthlyNetProfit: null,
  bouncedChequesLast12Months: null,
  latePaymentIncidentsLast12Months: null,
  savingsBalanceEstimate: null,
  debtToIncomeRatio: null,
  dscr: null,
  riskFlags: [],
  goal: null,
  riskTolerance: null,
  notes: null
};

export const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
  "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo (Congo-Brazzaville)", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia (Czech Republic)",
  "Democratic Republic of the Congo", "Denmark", "Djibouti", "Dominica", "Dominican Republic",
  "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia",
  "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
  "Haiti", "Holy See", "Honduras", "Hungary",
  "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
  "Jamaica", "Japan", "Jordan",
  "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan",
  "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar (formerly Burma)",
  "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway",
  "Oman",
  "Pakistan", "Palau", "Palestine State", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar",
  "Romania", "Russia", "Rwanda",
  "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
  "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
  "Vanuatu", "Venezuela", "Vietnam",
  "Yemen",
  "Zambia", "Zimbabwe"
];
