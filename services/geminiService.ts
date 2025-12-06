import { GoogleGenAI, Type, Schema } from "@google/genai";
import { CustomerProfile, Product, EvaluationResult, FileData } from "../types";

// Initialize Gemini Client
// IMPORTANT: Using gemini-3-pro-preview as requested for complex tasks
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// JSON Schema for Customer Profile
const profileSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    customerType: { type: Type.STRING, enum: ["INDIVIDUAL", "SME"] },
    name: { type: Type.STRING },
    age: { type: Type.NUMBER },
    citizenship: { type: Type.STRING },
    countryOfResidence: { type: Type.STRING },
    monthlyIncome: { type: Type.NUMBER },
    monthlyExpenses: { type: Type.NUMBER },
    existingLoanEMI: { type: Type.NUMBER },
    totalCreditCardLimits: { type: Type.NUMBER },
    totalCreditCardUtilization: { type: Type.NUMBER },
    businessAgeMonths: { type: Type.NUMBER },
    averageMonthlyRevenue: { type: Type.NUMBER },
    averageMonthlyNetProfit: { type: Type.NUMBER },
    bouncedChequesLast12Months: { type: Type.NUMBER },
    latePaymentIncidentsLast12Months: { type: Type.NUMBER },
    savingsBalanceEstimate: { type: Type.NUMBER },
    debtToIncomeRatio: { type: Type.NUMBER },
    dscr: { type: Type.NUMBER },
    riskFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
    notes: { type: Type.STRING },
  },
  required: ["customerType", "riskFlags"],
};

export async function extractProfileFromDocs(
  files: FileData[],
  manualData: Partial<CustomerProfile>
): Promise<CustomerProfile> {
  const parts = files.map((f) => ({
    inlineData: {
      mimeType: f.mimeType,
      data: f.data,
    },
  }));

  // Construct file context map
  const fileContexts = files.map(f => `File Name: ${f.name}, Document Type: ${f.docType || "UNKNOWN"}`).join("\n");

  const promptText = `
    You are an expert financial analyst. Analyze the provided documents (bank statements, payslips, invoices) and the manual user inputs below.
    
    Attached Files Context:
    ${fileContexts}

    Analysis Rules based on Document Types:
    - BANK_STATEMENT: Extract monthly income, recurring expenses, existing loan EMIs. Look for patterns of bounced cheques or gambling. Estimate DTI.
    - PAYSLIP: Confirm net salary and employment stability.
    - ID_DOCUMENT: Extract full name, age/DOB, citizenship.
    - TRADE_LICENSE: Extract business start date (to calculate businessAgeMonths) and legal business name.
    - PANDL_SUMMARY: Extract average monthly revenue and net profit.
    - SALES_DASHBOARD: Use to corroborate revenue stability and seasonality.

    Manual Inputs:
    - Type: ${manualData.customerType}
    - Goal: ${manualData.goal}
    - Risk Tolerance: ${manualData.riskTolerance}
    - Name: ${manualData.name || "Unknown"}
    - Citizenship: ${manualData.citizenship || "Unknown"}
    - Residence: ${manualData.countryOfResidence || "Unknown"}

    Task:
    1. Extract all financial metrics found in the documents.
    2. Calculate derived metrics like Debt-to-Income (DTI) and DSCR where possible if not explicitly stated.
       - DTI = Total Monthly Debt Payments / Gross Monthly Income
       - DSCR = Net Operating Income / Total Debt Service
    3. Identify risk flags (e.g., "High Overdraft Usage", "Declining Revenue", "Gambling Transactions").
    4. Return a SINGLE JSON object matching the CustomerProfile schema.
    5. If a value is missing and cannot be reasonably estimated, use null.
    6. For 'notes', write a brief professional summary of the financial situation (2-3 sentences).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: {
        parts: [...parts, { text: promptText }],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: profileSchema,
        systemInstruction: "You are a precise data extraction engine for financial documents.",
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    const extracted = JSON.parse(text) as CustomerProfile;
    
    // Merge manual data back in to ensure it persists if Gemini missed it
    return {
      ...extracted,
      goal: manualData.goal,
      riskTolerance: manualData.riskTolerance,
      customerType: manualData.customerType || extracted.customerType, // Prefer manual type
      name: manualData.name || extracted.name,
      citizenship: manualData.citizenship || extracted.citizenship,
      countryOfResidence: manualData.countryOfResidence || extracted.countryOfResidence,
    };
  } catch (error) {
    console.error("Profile extraction failed:", error);
    throw error;
  }
}

export async function generateExplanations(
  profile: CustomerProfile,
  product: Product,
  evaluation: EvaluationResult
): Promise<{ customer: string; advisor: string }> {
  const prompt = `
    You are a bank relationship manager. Write explanations for a product suitability assessment.

    Context:
    - Product: ${product.name} (${product.description})
    - Decision: ${evaluation.decision}
    - Reasons: ${evaluation.reasons.join(", ")}
    - Score: ${evaluation.score}
    - Customer Profile Summary: Income ${profile.monthlyIncome}, DTI ${profile.debtToIncomeRatio}, Risk Flags: ${profile.riskFlags.join(", ")}

    Task:
    Return a JSON object with two keys:
    1. "customer": A polite, simple explanation addressed to the customer. No jargon. If declined, be constructive.
    2. "advisor": A technical explanation for the bank officer, referencing specific metrics (DTI, DSCR, etc.) and risk factors.

    Disclaimer:
    Do not promise approval. Use phrases like "appears suitable", "preliminary assessment", "subject to verification".
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                customer: { type: Type.STRING },
                advisor: { type: Type.STRING }
            }
        }
      },
    });

    const result = JSON.parse(response.text || "{}");
    return {
      customer: result.customer || "Explanation generation failed.",
      advisor: result.advisor || "Explanation generation failed.",
    };

  } catch (error) {
    console.error("Explanation generation failed:", error);
    return {
      customer: "Could not generate explanation.",
      advisor: "Could not generate explanation.",
    };
  }
}

export async function generateProductFromText(description: string): Promise<Product> {
    const prompt = `
      Convert the following natural language product description into a valid Product JSON configuration.
      
      Description: "${description}"
      
      Requirements:
      - Assign a random ID.
      - infer categories and strictness based on the text.
      - Populate constraints and scoring weights logically based on the description.
      - Create strict JSON.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });
        
        return JSON.parse(response.text || "{}") as Product;
    } catch (e) {
        console.error("Product gen failed", e);
        throw e;
    }
}
