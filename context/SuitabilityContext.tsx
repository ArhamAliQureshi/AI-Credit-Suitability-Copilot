
import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { CustomerProfile, FileData, EvaluationResult, Product } from '../types';
import { INITIAL_PROFILE, DEMO_PRODUCTS } from '../constants';
import { extractProfileFromDocs, generateExplanations, validateDocuments } from '../services/geminiService';
import { evaluateProductForProfile } from '../services/riskEngine';

interface SuitabilityState {
  step: number;
  manualData: Partial<CustomerProfile>;
  files: FileData[];
  profile: CustomerProfile;
  evaluations: EvaluationResult[];
  analysisStatus: 'idle' | 'running' | 'success' | 'failed';
  progress: number;
  error: string | null;
  lastActiveTimestamp: number;
}

interface SuitabilityContextType extends SuitabilityState {
  setStep: (step: number) => void;
  updateManualData: (data: Partial<CustomerProfile>) => void;
  updateFiles: (files: FileData[]) => void;
  runAnalysis: () => Promise<void>;
  cancelAnalysis: () => void;
  clearSession: () => void;
}

const SuitabilityContext = createContext<SuitabilityContextType | undefined>(undefined);

const STORAGE_KEY = 'gemini_fairlens_session';

export const SuitabilityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // State
  const [step, setStep] = useState<number>(1);
  const [manualData, setManualData] = useState<Partial<CustomerProfile>>({
    customerType: "INDIVIDUAL",
    goal: "CREDIT_CARD",
    riskTolerance: "MEDIUM"
  });
  const [files, setFiles] = useState<FileData[]>([]);
  const [profile, setProfile] = useState<CustomerProfile>(INITIAL_PROFILE);
  const [evaluations, setEvaluations] = useState<EvaluationResult[]>([]);
  const [analysisStatus, setAnalysisStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [lastActiveTimestamp, setLastActiveTimestamp] = useState<number>(Date.now());

  // Ref to track the current run ID to allow cancellation
  const currentRunId = useRef<string | null>(null);

  // Load from session storage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Restore state
        if (parsed.step) setStep(parsed.step);
        if (parsed.manualData) setManualData(parsed.manualData);
        if (parsed.files) setFiles(parsed.files);
        if (parsed.profile) setProfile(parsed.profile);
        if (parsed.evaluations) setEvaluations(parsed.evaluations);
        if (parsed.analysisStatus) setAnalysisStatus(parsed.analysisStatus);
        if (parsed.progress) setProgress(parsed.progress);
        if (parsed.error) setError(parsed.error);
        if (parsed.lastActiveTimestamp) setLastActiveTimestamp(parsed.lastActiveTimestamp);
      }
    } catch (e) {
      console.error("Failed to hydrate session:", e);
    }
  }, []);

  // Save to session storage on change
  useEffect(() => {
    try {
      const stateToSave = {
        step,
        manualData,
        files,
        profile,
        evaluations,
        analysisStatus,
        progress,
        error,
        lastActiveTimestamp
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      console.warn("Session storage quota exceeded or error:", e);
    }
  }, [step, manualData, files, profile, evaluations, analysisStatus, progress, error, lastActiveTimestamp]);

  const updateManualData = (data: Partial<CustomerProfile>) => {
    setManualData(prev => ({ ...prev, ...data }));
    setLastActiveTimestamp(Date.now());
  };

  const updateFiles = (newFiles: FileData[]) => {
    setFiles(newFiles);
    setLastActiveTimestamp(Date.now());
  };

  const clearSession = () => {
    setStep(1);
    setManualData({
      customerType: "INDIVIDUAL",
      goal: "CREDIT_CARD",
      riskTolerance: "MEDIUM"
    });
    setFiles([]);
    setProfile(INITIAL_PROFILE);
    setEvaluations([]);
    setAnalysisStatus('idle');
    setProgress(0);
    setError(null);
    setLastActiveTimestamp(Date.now());
    currentRunId.current = null;
    sessionStorage.removeItem(STORAGE_KEY);
  };

  const cancelAnalysis = () => {
    if (analysisStatus === 'running') {
      currentRunId.current = null; // Invalidate current run
      setAnalysisStatus('idle');
      setProgress(0);
      // We do not clear form data, just the job status
    }
  };

  const runAnalysis = async () => {
    const runId = Date.now().toString();
    currentRunId.current = runId;

    setAnalysisStatus('running');
    setError(null);
    setProgress(0);
    setLastActiveTimestamp(Date.now());

    // Artificial progress ticker
    const progressInterval = setInterval(() => {
      if (currentRunId.current !== runId) {
         clearInterval(progressInterval);
         return;
      }
      setProgress(prev => {
        // Validation (0-30), Extraction (30-60), Risk (60-70), Explanation (70-100)
        // We let the ticker push it slowly, but specific steps will jump it.
        if (prev >= 95) return prev;
        return prev + 1;
      });
    }, 400);

    try {
      // --- STEP 0: DOCUMENT VALIDATION ---
      // We do this first to ensure data integrity
      
      const validationResult = await validateDocuments(files, manualData.customerType || "INDIVIDUAL", manualData.name || "");
      
      if (currentRunId.current !== runId) throw new Error("Cancelled");

      const validationErrors: string[] = [];
      validationResult.documentValidations.forEach(v => {
        if (!v.nameMatchesDeclared || !v.typeMatchesSlot) {
            // Aggregate issues
            if (v.issues && v.issues.length > 0) {
                validationErrors.push(...v.issues);
            } else {
                 // Fallback message if AI didn't provide specific issue text
                 if (!v.nameMatchesDeclared) validationErrors.push(`Name mismatch in ${v.slotKey}: Expected '${manualData.name}', found '${v.detectedName}'.`);
                 if (!v.typeMatchesSlot) validationErrors.push(`Type mismatch in ${v.slotKey}: Expected ${v.expectedDocType}, found ${v.detectedDocType}.`);
            }
        }
      });

      if (validationErrors.length > 0) {
        throw new Error(`Document Validation Failed:\n• ${validationErrors.join("\n• ")}`);
      }
      
      setProgress(30);

      // --- STEP 1: EXTRACT PROFILE ---
      if (currentRunId.current !== runId) throw new Error("Cancelled");
      
      const extractedProfile = await extractProfileFromDocs(files, manualData);
      
      if (currentRunId.current !== runId) throw new Error("Cancelled");
      
      // clearInterval(progressInterval); // Keep ticker running for smoothness but jump
      setProgress(60);
      setProfile(extractedProfile);

      // --- STEP 2: EVALUATE LOGIC ---
      const relevantProducts = DEMO_PRODUCTS.filter(p => 
        p.targetCustomerType === "BOTH" || p.targetCustomerType === extractedProfile.customerType
      );
      
      const initialEvals = relevantProducts.map(p => evaluateProductForProfile(extractedProfile, p));
      
      if (currentRunId.current !== runId) throw new Error("Cancelled");
      
      setEvaluations(initialEvals);
      setProgress(70);

      // --- STEP 3: GENERATE EXPLANATIONS (PARALLEL) ---
      const totalItems = initialEvals.length;
      let completedItems = 0;

      const fullEvals = await Promise.all(initialEvals.map(async (ev) => {
        if (currentRunId.current !== runId) return ev; // Skip if cancelled

        const product = relevantProducts.find(p => p.id === ev.productId)!;
        const explanations = await generateExplanations(extractedProfile, product, ev);
        
        if (currentRunId.current !== runId) return ev;

        completedItems++;
        const currentProgressBase = 70;
        const remainingPercentage = 25; // Leave 5% for final
        const addedProgress = (completedItems / totalItems) * remainingPercentage;
        
        setProgress(Math.min(currentProgressBase + addedProgress, 95));

        return { ...ev, customerExplanation: explanations.customer, advisorExplanation: explanations.advisor };
      }));

      if (currentRunId.current !== runId) throw new Error("Cancelled");

      setEvaluations(fullEvals);
      setProgress(100);
      setAnalysisStatus('success');
      setLastActiveTimestamp(Date.now());
      
      // Auto-advance
      setTimeout(() => {
        if (currentRunId.current === runId) {
            setStep(3);
        }
      }, 600);

    } catch (err: any) {
      if (currentRunId.current === runId) {
        // Only set error if not cancelled
        if (err.message === "Cancelled") {
            setAnalysisStatus('idle');
            return;
        }

        console.error(err);
        let msg = "Analysis failed. Please try again.";
        if (err instanceof Error) {
            msg = err.message;
            if (msg.includes("API key")) msg = "Invalid or missing API Key.";
            if (msg.includes("400")) msg = "Bad Request: The AI could not process these documents.";
            if (msg.includes("500")) msg = "Server Error: Gemini is currently experiencing issues.";
        }
        setError(msg);
        setAnalysisStatus('failed');
      }
    } finally {
      clearInterval(progressInterval);
    }
  };

  const contextValue: SuitabilityContextType = {
    step,
    manualData,
    files,
    profile,
    evaluations,
    analysisStatus,
    progress,
    error,
    lastActiveTimestamp,
    setStep,
    updateManualData,
    updateFiles,
    runAnalysis,
    cancelAnalysis,
    clearSession,
  };

  return (
    <SuitabilityContext.Provider value={contextValue}>
      {children}
    </SuitabilityContext.Provider>
  );
};

export const useSuitability = () => {
  const context = useContext(SuitabilityContext);
  if (!context) {
    throw new Error('useSuitability must be used within a SuitabilityProvider');
  }
  return context;
};
