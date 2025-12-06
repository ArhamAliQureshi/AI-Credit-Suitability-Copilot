import React, { useState } from 'react';
import { Sparkles, ArrowRight, Code } from 'lucide-react';
import { Product } from '../types';
import { generateProductFromText } from '../services/geminiService';
import { DEMO_PRODUCTS } from '../constants';

const ConfigView: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedProduct, setGeneratedProduct] = useState<Product | null>(null);

  const handleGenerate = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    try {
      const product = await generateProductFromText(inputText);
      setGeneratedProduct(product);
    } catch (e) {
      alert("Failed to generate product config.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
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

        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Existing Demo Products</h3>
          <ul className="space-y-2">
            {DEMO_PRODUCTS.map(p => (
              <li key={p.id} className="text-xs text-slate-600 flex items-center justify-between bg-white p-2 rounded border border-slate-200">
                <span className="font-medium">{p.name}</span>
                <span className="text-slate-400">{p.targetCustomerType}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl p-6 shadow-lg flex flex-col h-[600px]">
        <div className="flex items-center justify-between mb-4 border-b border-slate-700 pb-4">
          <div className="flex items-center gap-2 text-slate-300">
            <Code className="w-4 h-4" />
            <span className="text-sm font-mono">Product Configuration (JSON)</span>
          </div>
          {generatedProduct && (
            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">Generated Successfully</span>
          )}
        </div>

        <div className="flex-grow overflow-auto font-mono text-xs text-slate-300">
          {generatedProduct ? (
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(generatedProduct, null, 2)}
            </pre>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-600 italic">
              JSON output will appear here...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfigView;