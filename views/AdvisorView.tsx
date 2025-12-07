import React, { useState, useEffect } from 'react';
import { CustomerProfile, FileData, Product, EvaluationResult, DocumentRequirement, InputRequirement } from '../types';
import { DEMO_PRODUCTS, REQUIREMENT_CONFIG, INITIAL_PROFILE } from '../constants';
import { useSuitability } from '../context/SuitabilityContext';
import FileUpload from '../components/FileUpload';
import CountryAutocomplete from '../components/CountryAutocomplete';
import ResultCharts from '../components/ResultCharts';
import { CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp, Loader2, ArrowRight, User, AlertCircle, Copy, Check, RotateCcw, X } from 'lucide-react';

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
  // Use Context instead of local state
  const { 
    step, setStep, 
    manualData, updateManualData, 
    files, updateFiles, 
    profile, evaluations, 
    analysisStatus, progress, error,
    runAnalysis, cancelAnalysis, clearSession,
    lastActiveTimestamp
  } = useSuitability();

  const loading = analysisStatus === 'running';
  
  // Local state for UI only (expansion, copied feedback)
  const [expandedEval, setExpandedEval] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Derived loading text
  const loadingText = progress < 60 ? "Extracting data from documents with Gemini..." : 
                     progress < 70 ? "Running risk engine..." : "Generating AI explanations...";

  // Dynamic Label Config based on Customer Type
  const customerType = manualData.customerType || "INDIVIDUAL";
  const fieldConfig = customerType === 'SME' ? {
    title: "Business Basics",
    nameLabel: "Business Name",
    namePlaceholder: "e.g. Bright Bean Cafe WLL",
    residenceLabel: "Country of Registration / Jurisdiction",
    residencePlaceholder: "e.g. Bahrain",
    citizenshipLabel: "Primary Operating Country / Region",
    citizenshipPlaceholder: "e.g. GCC, Bahrain, UAE",
  } : {
    title: "Customer Basics",
    nameLabel: "Name",
    namePlaceholder: "e.g. John Doe",
    residenceLabel: "Country of Residence",
    residencePlaceholder: "e.g. United Kingdom",
    citizenshipLabel: "Citizenship",
    citizenshipPlaceholder: "e.g. United States",
  };

  // Handlers
  const handleNextStep = () => {
    const currentConfig = REQUIREMENT_CONFIG[customerType];
    const inputs = currentConfig.inputs as Record<string, InputRequirement>;
    const errors: Record<string, boolean> = {};
    let hasError = false;

    if (inputs['name']?.required && !manualData.name?.trim()) {
        errors['name'] = true;
        hasError = true;
    }
    if (inputs['citizenship']?.required && !manualData.citizenship?.trim()) {
        errors['citizenship'] = true;
        hasError = true;
    }
    if (inputs['countryOfResidence']?.required && !manualData.countryOfResidence?.trim()) {
        errors['countryOfResidence'] = true;
        hasError = true;
    }

    if (hasError) {
        setValidationErrors(errors);
        alert("Please fill in all required fields.");
        return;
    }

    setValidationErrors({});
    setStep(step + 1);
  };
  
  const handleCitizenshipChange = (val: string) => {
    const newData = { citizenship: val } as Partial<CustomerProfile>;
    if (!manualData.countryOfResidence) {
        newData.countryOfResidence = val;
    }
    updateManualData(newData);
  };

  const validateDocuments = () => {
      const currentConfig = REQUIREMENT_CONFIG[customerType];
      const documents = currentConfig.documents as Record<string, DocumentRequirement>;
      const errors: Record<string, boolean> = {};
      let hasError = false;

      (Object.entries(documents) as [string, DocumentRequirement][]).forEach(([key, req]) => {
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

  const handleAnalyzeClick = async () => {
    if (!validateDocuments()) return;
    await runAnalysis();
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 2000);
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
    const config = REQUIREMENT_CONFIG[customerType];
    const documents = config.documents as Record<string, DocumentRequirement>;
    const entries = Object.entries(documents) as [string, DocumentRequirement][];
    const requiredDocs = entries.filter(([, req]) => req.required);
    const optionalDocs = entries.filter(([, req]) => !req.required);

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
                            onFilesChange={updateFiles}
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
                                onFilesChange={updateFiles}
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

  const currentGoalOptions = GOAL_OPTIONS[customerType];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Subtitle */}
      <div className="text-center py-2 -mb-2">
         <p className="text-lg text-slate-600 font-medium">Multimodal profiling and explainable product suitability for individuals and SMEs</p>
      </div>

      {/* Persistence Feedback */}
      {analysisStatus === 'running' && (
        <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 mb-4 rounded-r shadow-sm animate-fade-in">
           <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                 <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                 <p className="text-sm text-indigo-800">
                   <strong>Analysis in progress.</strong> {loadingText}
                 </p>
              </div>
              <button 
                onClick={cancelAnalysis} 
                className="text-xs text-rose-600 font-medium hover:underline flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Cancel Job
              </button>
           </div>
        </div>
      )}
      
      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8 px-4">
        <div className="flex items-center max-w-2xl w-full justify-between">
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
      </div>

      {step === 1 && (
        <div className="max-w-4xl mx-auto bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-900">{fieldConfig.title}</h2>
            {manualData.name && (
                <button onClick={clearSession} className="text-xs text-slate-400 hover:text-rose-500 flex items-center gap-1">
                    <RotateCcw className="w-3 h-3" /> Reset
                </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Customer Type</label>
              <select 
                className="w-full rounded-lg border-slate-300 bg-white text-slate-900 focus:bg-slate-900 focus:text-white focus:ring-indigo-500 focus:border-indigo-500 p-2.5 border transition-colors"
                value={manualData.customerType}
                onChange={e => {
                  const newType = e.target.value as "INDIVIDUAL" | "SME";
                  updateManualData({
                    customerType: newType,
                    goal: GOAL_OPTIONS[newType][0].value as any
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
                onChange={e => updateManualData({goal: e.target.value as any})}
              >
                {currentGoalOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">
                 {fieldConfig.nameLabel} <span className="text-rose-500">*</span>
               </label>
               <input 
                 type="text" 
                 required
                 className={`w-full rounded-lg border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:bg-slate-900 focus:text-white focus:ring-indigo-500 focus:border-indigo-500 p-2 border transition-colors ${validationErrors['name'] ? 'border-rose-500 ring-1 ring-rose-500' : ''}`}
                 value={manualData.name || ""}
                 onChange={e => updateManualData({name: e.target.value})}
                 placeholder={fieldConfig.namePlaceholder}
               />
               {validationErrors['name'] && <p className="text-xs text-rose-500 mt-1">{fieldConfig.nameLabel} is required.</p>}
            </div>
             <div>
               <CountryAutocomplete 
                 label={fieldConfig.citizenshipLabel}
                 value={manualData.citizenship || ""} 
                 onChange={handleCitizenshipChange} 
                 placeholder={fieldConfig.citizenshipPlaceholder}
                 required={(REQUIREMENT_CONFIG[customerType].inputs as Record<string, InputRequirement>)['citizenship']?.required}
               />
               {validationErrors['citizenship'] && <p className="text-xs text-rose-500 mt-1">{fieldConfig.citizenshipLabel} is required.</p>}
            </div>
            <div>
               <CountryAutocomplete 
                 label={fieldConfig.residenceLabel}
                 value={manualData.countryOfResidence || ""} 
                 onChange={(val) => updateManualData({countryOfResidence: val})} 
                 placeholder={fieldConfig.residencePlaceholder}
                 required={(REQUIREMENT_CONFIG[customerType].inputs as Record<string, InputRequirement>)['countryOfResidence']?.required}
               />
               {validationErrors['countryOfResidence'] && <p className="text-xs text-rose-500 mt-1">{fieldConfig.residenceLabel} is required.</p>}
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
        <div className="max-w-4xl mx-auto bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-fade-in">
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
              
              {/* Clear / Cancel Button */}
              {loading ? (
                <button
                    onClick={cancelAnalysis}
                    className="border border-rose-200 text-rose-600 hover:bg-rose-50 px-4 py-2.5 rounded-lg font-medium transition-colors"
                >
                    Cancel Analysis
                </button>
              ) : (
                <button
                    onClick={clearSession}
                    className="text-slate-400 hover:text-rose-500 px-4 py-2 text-sm"
                    title="Reset Form"
                >
                    <div className="flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Clear Form</div>
                </button>
              )}

              <button 
                onClick={handleAnalyzeClick}
                disabled={loading}
                className={`bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium flex items-center transition-all ${
                  loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-700'
                }`}
              >
                {loading ? "Analyzing..." : <>Run AI Analysis <ArrowRight className="w-4 h-4 ml-2" /></>}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
          {/* Left Column: Results & Explanations */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-lg font-bold text-slate-800">Product Recommendations</h3>
            
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
                           
                           {/* Customer Explanation */}
                           <div className="bg-white p-4 rounded-lg border border-slate-200 relative group">
                             <h5 className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-2">Customer Explanation</h5>
                             <button
                               onClick={(e) => { e.stopPropagation(); handleCopy(result.customerExplanation, `cust-${result.productId}`); }}
                               className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors"
                               title="Copy text"
                             >
                               {copiedField === `cust-${result.productId}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                             </button>
                             <p className="text-sm text-slate-700 leading-relaxed">
                               {result.customerExplanation === "Pending AI generation..." ? (
                                 <span className="flex items-center gap-2 text-slate-400"><Loader2 className="w-3 h-3 animate-spin"/> Generating...</span>
                               ) : result.customerExplanation}
                             </p>
                           </div>

                           {/* Advisor Explanation */}
                           <div className="bg-white p-4 rounded-lg border border-slate-200 relative group">
                             <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Advisor Technical Notes</h5>
                             <button
                               onClick={(e) => { e.stopPropagation(); handleCopy(result.advisorExplanation, `adv-${result.productId}`); }}
                               className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors"
                               title="Copy text"
                             >
                               {copiedField === `adv-${result.productId}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                             </button>
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

            <div className="pt-4 flex items-center justify-between">
                <button 
                  onClick={clearSession}
                  className="text-slate-400 hover:text-indigo-600 text-sm font-medium hover:underline flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" /> Start New Assessment
                </button>
            </div>
          </div>

          {/* Right Column: Charts & Insights */}
          <div className="lg:col-span-1 space-y-6">
             <ResultCharts profile={profile} evaluations={evaluations} />
             
             {/* Profile Data Mini-View */}
             <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Profile Data</h4>
                <div className="space-y-2 text-sm">
                   <div className="flex justify-between border-b border-slate-200 pb-2">
                     <span className="text-slate-600">Monthly Income</span>
                     <span className="font-mono font-medium">${profile.monthlyIncome?.toLocaleString()}</span>
                   </div>
                   <div className="flex justify-between border-b border-slate-200 pb-2">
                     <span className="text-slate-600">Risk Tolerance</span>
                     <span className="font-mono font-medium">{profile.riskTolerance}</span>
                   </div>
                   <div className="pt-2">
                      <span className="text-slate-600 block mb-1">AI Summary Notes</span>
                      <p className="text-xs text-slate-500 italic leading-relaxed">
                        {profile.notes || "No notes available."}
                      </p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvisorView;