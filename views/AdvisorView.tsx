import React, { useState, useEffect } from 'react';
import { CustomerProfile, FileData, Product, EvaluationResult } from '../types';
import { DEMO_PRODUCTS, INITIAL_PROFILE, REQUIREMENT_CONFIG } from '../constants';
import { extractProfileFromDocs, generateExplanations } from '../services/geminiService';
import { evaluateProductForProfile } from '../services/riskEngine';
import FileUpload from '../components/FileUpload';
import CountryAutocomplete from '../components/CountryAutocomplete';
import { CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp, Loader2, ArrowRight, User, AlertCircle } from 'lucide-react';

const GOAL_OPTIONS = {
  INDIVIDUAL: [
    { value: "CREDIT_CARD", label: "Credit Card" },
    { value: "PERSONAL_LOAN", label: "Personal Loan" },
    { value: "MORTGAGE", label: "Mortgage" },
    { value: "OTHER", label: "Other" }
  ],
  SME: [
    { value: "SME_WORKING_CAPITAL", label: "Working Capital Loan" },
    { value: "BUSINESS_EXPANSION", label: "Business Expansion Loan" },
    { value: "CREDIT_CARD", label: "Corporate Credit Card" },
    { value: "OTHER", label: "Other" }
  ]
};

const AdvisorView: React.FC = () => {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingText, setLoadingText] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  
  // Data State
  const [manualData, setManualData] = useState<Partial<CustomerProfile>>({
    customerType: "INDIVIDUAL",
    goal: "CREDIT_CARD", // Default matches first option of INDIVIDUAL
    riskTolerance: "MEDIUM"
  });
  const [files, setFiles] = useState<FileData[]>([]);
  const [profile, setProfile] = useState<CustomerProfile>(INITIAL_PROFILE);
  const [evaluations, setEvaluations] = useState<EvaluationResult[]>([]);
  const [expandedEval, setExpandedEval] = useState<string | null>(null);
  
  // Validation State
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});

  // Handlers
  const handleNextStep = () => {
    // Basic step 1 validation based on config
    const currentConfig = REQUIREMENT_CONFIG[manualData.customerType || "INDIVIDUAL"];
    const errors: Record<string, boolean> = {};
    let hasError = false;

    if (currentConfig.inputs.name?.required && !manualData.name?.trim()) {
        errors['name'] = true;
        hasError = true;
    }
    if (currentConfig.inputs.citizenship?.required && !manualData.citizenship?.trim()) {
        errors['citizenship'] = true;
        hasError = true;
    }
    if (currentConfig.inputs.countryOfResidence?.required && !manualData.countryOfResidence?.trim()) {
        errors['countryOfResidence'] = true;
        hasError = true;
    }

    if (hasError) {
        setValidationErrors(errors);
        alert("Please fill in all required fields.");
        return;
    }

    setValidationErrors({});
    setStep(prev => prev + 1);
  };
  
  const handleCitizenshipChange = (val: string) => {
    setManualData(prev => {
        const newData = { ...prev, citizenship: val };
        // Auto-fill residence if empty
        if (!prev.countryOfResidence) {
            newData.countryOfResidence = val;
        }
        return newData;
    });
  };

  const validateDocuments = () => {
      const currentConfig = REQUIREMENT_CONFIG[manualData.customerType || "INDIVIDUAL"];
      const errors: Record<string, boolean> = {};
      let hasError = false;

      // Check each document requirement
      Object.entries(currentConfig.documents).forEach(([key, req]) => {
          if (req.required) {
              const hasFile = files.some(f => f.docType === key);
              if (!hasFile) {
                  errors[key] = true;
                  hasError = true;
              }
          }
      });

      setValidationErrors(errors);
      return !hasError;
  };

  const handleAnalyze = async () => {
    if (!validateDocuments()) {
        return; // Stop if validation fails
    }

    setLoading(true);
    setError(null);
    setProgress(0);
    setLoadingText("Extracting data from documents with Gemini...");

    // Simulated progress for extraction phase (since we don't know exact duration)
    // We cap it at 60% until extraction actually finishes
    const progressInterval = setInterval(() => {
        setProgress(prev => {
            if (prev >= 60) return prev;
            return prev + 2; // slowly increment
        });
    }, 500);

    try {
      // 1. Extract
      const extractedProfile = await extractProfileFromDocs(files, manualData);
      
      // Extraction done, jump to 60%
      clearInterval(progressInterval);
      setProgress(60);
      setProfile(extractedProfile);
      
      // 2. Evaluate
      setLoadingText("Running risk engine...");
      const relevantProducts = DEMO_PRODUCTS.filter(p => 
        p.targetCustomerType === "BOTH" || p.targetCustomerType === extractedProfile.customerType
      );
      
      const initialEvals = relevantProducts.map(p => evaluateProductForProfile(extractedProfile, p));
      setEvaluations(initialEvals); // Show initial deterministic results fast
      setProgress(70);
      
      // 3. Generate Explanations in parallel (Update state as they come in)
      setLoadingText("Generating AI explanations...");
      
      const totalItems = initialEvals.length;
      let completedItems = 0;

      const fullEvals = await Promise.all(initialEvals.map(async (ev) => {
        const product = relevantProducts.find(p => p.id === ev.productId)!;
        const explanations = await generateExplanations(extractedProfile, product, ev);
        
        // Update progress for each completion
        completedItems++;
        const currentProgressBase = 70;
        const remainingPercentage = 30;
        const addedProgress = (completedItems / totalItems) * remainingPercentage;
        
        setProgress(Math.min(currentProgressBase + addedProgress, 99));

        return { ...ev, customerExplanation: explanations.customer, advisorExplanation: explanations.advisor };
      }));
      
      setEvaluations(fullEvals);
      setProgress(100);
      
      // Short delay to show 100% completion before switching view
      setTimeout(() => {
          setStep(3);
      }, 600);
      
    } catch (err: any) {
      clearInterval(progressInterval);
      console.error(err);
      let msg = "Analysis failed. Please try again.";
      if (err instanceof Error) {
          msg = err.message;
          // Clean up common Gemini error messages for display
          if (msg.includes("API key")) msg = "Invalid or missing API Key.";
          if (msg.includes("400")) msg = "Bad Request: The AI could not process these documents.";
          if (msg.includes("500")) msg = "Server Error: Gemini is currently experiencing issues.";
      }
      setError(msg);
    } finally {
      if (progressInterval) clearInterval(progressInterval);
      setLoading(false);
    }
  };

  // Render Helpers
  const renderDecisionPill = (decision: string) => {
    const styles = {
      APPROVE: "bg-emerald-100 text-emerald-700 border-emerald-200",
      REVIEW: "bg-amber-100 text-amber-700 border-amber-200",
      DECLINE: "bg-rose-100 text-rose-700 border-rose-200"
    }[decision] || "bg-slate-100 text-slate-700";

    const icons = {
      APPROVE: <CheckCircle className="w-3 h-3 mr-1" />,
      REVIEW: <AlertTriangle className="w-3 h-3 mr-1" />,
      DECLINE: <XCircle className="w-3 h-3 mr-1" />
    }[decision];

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles}`}>
        {icons} {decision}
      </span>
    );
  };

  const renderDocumentSection = () => {
    const config = REQUIREMENT_CONFIG[manualData.customerType || "INDIVIDUAL"];
    
    // Split into required and optional
    const requiredDocs = Object.entries(config.documents).filter(([, req]) => req.required);
    const optionalDocs = Object.entries(config.documents).filter(([, req]) => !req.required);

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center">
                    Required Documents
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {requiredDocs.map(([key, req]) => (
                        <FileUpload 
                            key={key}
                            files={files}
                            onFilesChange={setFiles}
                            docType={key}
                            label={req.label}
                            description={req.description}
                            required={true}
                            hasError={validationErrors[key]}
                        />
                    ))}
                </div>
            </div>

            {optionalDocs.length > 0 && (
                <div>
                    <h3 className="text-sm font-bold text-slate-500 mb-3 flex items-center">
                        Optional Supporting Docs
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {optionalDocs.map(([key, req]) => (
                            <FileUpload 
                                key={key}
                                files={files}
                                onFilesChange={setFiles}
                                docType={key}
                                label={req.label}
                                description={req.description}
                                required={false}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
  };

  const currentGoalOptions = GOAL_OPTIONS[manualData.customerType || "INDIVIDUAL"];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Subtitle / Intro for first step */}
      <div className="text-center py-2 -mb-2">
         <p className="text-lg text-slate-600 font-medium">Multimodal profiling and explainable product suitability for individuals and SMEs</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8 px-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
              step >= s ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
            }`}>
              {s}
            </div>
            <span className={`ml-2 text-sm font-medium hidden sm:block ${step >= s ? 'text-indigo-900' : 'text-slate-400'}`}>
              {s === 1 ? 'Basics' : s === 2 ? 'Documents' : 'Results'}
            </span>
            {s < 3 && <div className="w-12 h-0.5 bg-slate-200 mx-4 hidden sm:block" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-fade-in">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Customer Basics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Customer Type</label>
              <select 
                className="w-full rounded-lg border-slate-300 bg-white text-slate-900 focus:bg-slate-900 focus:text-white focus:ring-indigo-500 focus:border-indigo-500 p-2.5 border transition-colors"
                value={manualData.customerType}
                onChange={e => {
                  const newType = e.target.value as "INDIVIDUAL" | "SME";
                  setManualData({
                    ...manualData, 
                    customerType: newType,
                    goal: GOAL_OPTIONS[newType][0].value as any // Reset goal to first valid option
                  });
                }}
              >
                <option value="INDIVIDUAL">Individual</option>
                <option value="SME">SME (Business)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Primary Goal</label>
              <select 
                className="w-full rounded-lg border-slate-300 bg-white text-slate-900 focus:bg-slate-900 focus:text-white focus:ring-indigo-500 focus:border-indigo-500 p-2.5 border transition-colors"
                value={manualData.goal || ""}
                onChange={e => setManualData({...manualData, goal: e.target.value as any})}
              >
                {currentGoalOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">
                 Name <span className="text-rose-500">*</span>
               </label>
               <input 
                 type="text" 
                 required
                 className={`w-full rounded-lg border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:bg-slate-900 focus:text-white focus:ring-indigo-500 focus:border-indigo-500 p-2 border transition-colors ${validationErrors['name'] ? 'border-rose-500 ring-1 ring-rose-500' : ''}`}
                 value={manualData.name || ""}
                 onChange={e => setManualData({...manualData, name: e.target.value})}
                 placeholder="e.g. John Doe / Acme Corp"
               />
               {validationErrors['name'] && <p className="text-xs text-rose-500 mt-1">Name is required.</p>}
            </div>
             <div>
               <CountryAutocomplete 
                 label="Citizenship" 
                 value={manualData.citizenship || ""} 
                 onChange={handleCitizenshipChange} 
                 placeholder="e.g. United States"
                 required={REQUIREMENT_CONFIG[manualData.customerType || "INDIVIDUAL"].inputs.citizenship?.required}
               />
               {validationErrors['citizenship'] && <p className="text-xs text-rose-500 mt-1">Citizenship is required.</p>}
            </div>
            <div>
               <CountryAutocomplete 
                 label="Country of Residence" 
                 value={manualData.countryOfResidence || ""} 
                 onChange={(val) => setManualData({...manualData, countryOfResidence: val})} 
                 placeholder="e.g. United Kingdom"
                 required={REQUIREMENT_CONFIG[manualData.customerType || "INDIVIDUAL"].inputs.countryOfResidence?.required}
               />
               {validationErrors['countryOfResidence'] && <p className="text-xs text-rose-500 mt-1">Country of Residence is required.</p>}
            </div>
          </div>
          <div className="mt-8 flex justify-end">
            <button 
              onClick={handleNextStep}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center transition-colors"
            >
              Next Step <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <div>
                <h2 className="text-xl font-bold text-slate-900">
                    {manualData.customerType === "SME" ? "SME Documents" : "Individual Documents"}
                </h2>
                <p className="text-slate-500 text-sm">Upload the required proofs for analysis.</p>
            </div>
            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-semibold">
                {manualData.customerType}
            </span>
          </div>
          
          {renderDocumentSection()}
          
          {/* Progress Bar & Error Display Area */}
          <div className="mt-8 pt-4 border-t border-slate-100">
            {loading && (
              <div className="mb-4 space-y-2">
                 <div className="flex justify-between text-xs font-medium text-slate-600">
                    <span className="flex items-center gap-2">
                       <Loader2 className="w-3 h-3 animate-spin" />
                       {loadingText}
                    </span>
                    <span>{Math.round(progress)}%</span>
                 </div>
                 <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div 
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300 ease-out" 
                        style={{ width: `${progress}%` }}
                    />
                 </div>
              </div>
            )}

            {error && (
              <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3 text-rose-800 text-sm animate-fade-in">
                 <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
                 <div>
                    <strong className="block font-semibold text-rose-900 mb-1">Analysis Failed</strong>
                    <p>{error}</p>
                 </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setStep(1)}
                disabled={loading}
                className="text-slate-500 hover:text-slate-700 px-4 py-2 disabled:opacity-50"
              >
                Back
              </button>
              <button 
                onClick={handleAnalyze}
                disabled={loading}
                className={`bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium flex items-center transition-all ${
                  loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-700'
                }`}
              >
                {loading ? (
                  "Analyzing..."
                ) : (
                  <>Run AI Analysis <ArrowRight className="w-4 h-4 ml-2" /></>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6 animate-fade-in">
          {/* Profile Summary Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-4">
               <div className="p-2 bg-white/10 rounded-lg">
                 <User className="w-5 h-5 text-indigo-300" />
               </div>
               <div>
                 <h2 className="text-lg font-bold">{profile.name || "Customer Profile"}</h2>
                 <p className="text-slate-400 text-xs uppercase tracking-wider">{profile.customerType}</p>
               </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-white/5 p-3 rounded-lg">
                <div className="text-slate-400 text-xs">Monthly Income</div>
                <div className="text-lg font-mono font-medium">${profile.monthlyIncome?.toLocaleString() || '-'}</div>
              </div>
              <div className="bg-white/5 p-3 rounded-lg">
                <div className="text-slate-400 text-xs">Debt-to-Income</div>
                <div className="text-lg font-mono font-medium">{profile.debtToIncomeRatio ? (profile.debtToIncomeRatio * 100).toFixed(1) + '%' : '-'}</div>
              </div>
               <div className="bg-white/5 p-3 rounded-lg">
                <div className="text-slate-400 text-xs">Est. DSCR</div>
                <div className="text-lg font-mono font-medium">{profile.dscr?.toFixed(2) || '-'}</div>
              </div>
               <div className="bg-white/5 p-3 rounded-lg">
                <div className="text-slate-400 text-xs">Risk Flags</div>
                <div className="text-lg font-mono font-medium text-rose-300">{profile.riskFlags.length}</div>
              </div>
            </div>
            
            {profile.notes && (
              <div className="text-sm text-slate-300 bg-black/20 p-3 rounded-lg border border-white/5">
                <span className="font-semibold text-indigo-300">AI Notes:</span> {profile.notes}
              </div>
            )}
            
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {profile.riskFlags.map((flag, i) => (
                <span key={i} className="inline-block px-2 py-1 bg-rose-500/20 text-rose-200 text-xs rounded border border-rose-500/30 whitespace-nowrap">
                  {flag}
                </span>
              ))}
            </div>
          </div>

          <h3 className="text-lg font-bold text-slate-800 px-1">Product Recommendations</h3>
          
          <div className="space-y-4">
            {evaluations.map((result) => {
              const product = DEMO_PRODUCTS.find(p => p.id === result.productId);
              if (!product) return null;
              
              const isExpanded = expandedEval === result.productId;
              
              return (
                <div key={result.productId} className={`bg-white rounded-xl border transition-all duration-200 overflow-hidden ${
                  isExpanded ? 'border-indigo-300 shadow-md ring-1 ring-indigo-100' : 'border-slate-200 shadow-sm hover:border-indigo-200'
                }`}>
                  <div 
                    onClick={() => setExpandedEval(isExpanded ? null : result.productId)}
                    className="p-5 cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-bold text-slate-900">{product.name}</h4>
                        {renderDecisionPill(result.decision)}
                      </div>
                      <p className="text-sm text-slate-500">{result.summary}</p>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-right hidden sm:block">
                        <div className="text-xs text-slate-400 uppercase font-semibold">Match Score</div>
                        <div className={`text-xl font-mono font-bold ${
                          result.score > 0.7 ? 'text-emerald-600' : result.score > 0.5 ? 'text-amber-600' : 'text-slate-600'
                        }`}>
                          {Math.round(result.score * 100)}%
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-0 border-t border-slate-100 bg-slate-50/50">
                       <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="bg-white p-4 rounded-lg border border-slate-200">
                           <h5 className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-2">Customer Explanation</h5>
                           <p className="text-sm text-slate-700 leading-relaxed">
                             {result.customerExplanation === "Pending AI generation..." ? (
                               <span className="flex items-center gap-2 text-slate-400"><Loader2 className="w-3 h-3 animate-spin"/> Generating...</span>
                             ) : result.customerExplanation}
                           </p>
                         </div>
                         <div className="bg-white p-4 rounded-lg border border-slate-200">
                           <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Advisor Technical Notes</h5>
                           <p className="text-sm text-slate-600 font-mono text-xs leading-relaxed">
                              {result.advisorExplanation === "Pending AI generation..." ? (
                               <span className="flex items-center gap-2 text-slate-400"><Loader2 className="w-3 h-3 animate-spin"/> Generating...</span>
                             ) : result.advisorExplanation}
                           </p>
                           <div className="mt-3 pt-3 border-t border-slate-100">
                             <h6 className="text-[10px] font-bold text-slate-400 uppercase mb-1">Decision Factors</h6>
                             <ul className="space-y-1">
                               {result.reasons.length > 0 ? result.reasons.map((r, i) => (
                                 <li key={i} className="text-xs text-rose-600 flex items-center">
                                   <div className="w-1 h-1 bg-rose-500 rounded-full mr-2" />
                                   {r}
                                 </li>
                               )) : (
                                 <li className="text-xs text-emerald-600 flex items-center">
                                   <div className="w-1 h-1 bg-emerald-500 rounded-full mr-2" />
                                   All criteria met
                                 </li>
                               )}
                             </ul>
                           </div>
                         </div>
                       </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <button 
              onClick={() => { setStep(1); setFiles([]); setProfile(INITIAL_PROFILE); setEvaluations([]); setValidationErrors({}); setProgress(0); setError(null); }}
              className="mt-8 text-indigo-600 text-sm font-medium hover:underline"
            >
              Start New Assessment
            </button>
        </div>
      )}
    </div>
  );
};

export default AdvisorView;