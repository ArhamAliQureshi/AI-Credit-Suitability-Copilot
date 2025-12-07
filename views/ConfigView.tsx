import React, { useState } from 'react';
import { Sparkles, ArrowRight, Code, Lock, ChevronRight } from 'lucide-react';
import { Product } from '../types';
import { generateProductFromText } from '../services/geminiService';
import { DEMO_PRODUCTS } from '../constants';

const ConfigView: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  // Holds the product currently displayed in the right panel (either generated or selected from demo)
  const [displayedProduct, setDisplayedProduct] = useState<Product | null>(null);
  const [displaySource, setDisplaySource] = useState<'generated' | 'demo' | null>(null);

  const handleGenerate = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    try {
      const product = await generateProductFromText(inputText);
      setDisplayedProduct(product);
      setDisplaySource('generated');
    } catch (e) {
      alert("Failed to generate product config.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemo = (product: Product) => {
    setDisplayedProduct(product);
    setDisplaySource('demo');
  };

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        {/* Generator Section */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-bold text-slate-900">New Product Designer</h2>
          </div>
          
          <p className="text-sm text-slate-500 mb-4">
            Describe a financial product in natural language. Gemini will convert it into a structured configuration file for the decision engine.
          </p>

          <textarea
            className="w-full h-40 p-4 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none"
            placeholder="Example: This is a premium credit card for SMEs with at least $20k monthly revenue. It requires a DSCR of 1.5 but tolerates 1 late payment. We prefer businesses older than 3 years..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />

          <button
            onClick={handleGenerate}
            disabled={loading || !inputText}
            className={`mt-4 w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium flex items-center justify-center transition-all ${
               loading || !inputText ? 'opacity-50' : 'hover:bg-indigo-700'
            }`}
          >
            {loading ? 'Generating JSON...' : 'Generate Configuration'}
            {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
          </button>
        </div>

        {/* Existing Products List */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Existing Demo Products</h3>
          <p className="text-xs text-slate-500 mb-4">Click a product to inspect its configuration.</p>
          <ul className="space-y-3">
            {DEMO_PRODUCTS.map(p => {
              const isActive = displayedProduct?.id === p.id;
              return (
                <li 
                  key={p.id} 
                  onClick={() => handleSelectDemo(p)}
                  className={`relative group cursor-pointer rounded-lg border p-3 transition-all duration-200 ${
                    isActive 
                      ? 'bg-white border-indigo-500 shadow-md ring-1 ring-indigo-500/20' 
                      : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`block font-bold text-sm mb-1 ${isActive ? 'text-indigo-900' : 'text-slate-700'}`}>
                        {p.name}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                        {p.category.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.targetCustomerType === 'SME' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                      }`}>
                          {p.targetCustomerType}
                      </span>
                      <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform ${isActive ? 'text-indigo-500 translate-x-1' : 'group-hover:text-slate-400'}`} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* JSON Viewer Panel */}
      <div className="bg-slate-900 rounded-2xl p-6 shadow-lg flex flex-col h-[600px] border border-slate-800">
        <div className="flex items-center justify-between mb-2 border-b border-slate-700 pb-4">
          <div className="flex items-center gap-2 text-slate-300">
            <Code className="w-4 h-4" />
            <span className="text-sm font-mono font-semibold">Product Configuration (JSON)</span>
          </div>
          {displaySource === 'generated' && (
            <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20 uppercase tracking-wider">
              Generated
            </span>
          )}
          {displaySource === 'demo' && (
            <span className="text-[10px] font-bold bg-indigo-500/10 text-indigo-300 px-2 py-1 rounded border border-indigo-500/20 uppercase tracking-wider">
              Read Only
            </span>
          )}
        </div>

        {/* Hint label */}
        <div className="mb-4 flex items-start gap-2 p-2 bg-slate-800/50 rounded border border-slate-700/50">
           <Lock className="w-3 h-3 text-slate-500 mt-0.5 flex-shrink-0" />
           <p className="text-[10px] text-slate-400 leading-tight">
             Read-only demo configuration – engine uses hard-coded products for this prototype.
           </p>
        </div>

        <div className="flex-grow overflow-auto custom-scrollbar bg-slate-950/30 rounded-lg p-2">
          {displayedProduct ? (
            <pre className="font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
              {JSON.stringify(displayedProduct, null, 2)}
            </pre>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 italic gap-2">
              <Code className="w-8 h-8 opacity-20" />
              <p>Select a product or generate one to view JSON...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfigView;