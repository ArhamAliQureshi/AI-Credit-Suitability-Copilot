import React from 'react';
import { CustomerProfile, EvaluationResult } from '../types';
import { DEMO_PRODUCTS } from '../constants';

interface ResultChartsProps {
  profile: CustomerProfile;
  evaluations: EvaluationResult[];
}

const ResultCharts: React.FC<ResultChartsProps> = ({ profile, evaluations }) => {
  // 1. DTI Chart Helpers
  const dti = profile.debtToIncomeRatio || 0;
  // Cap at 1 for visualization
  const dtiView = Math.min(dti, 1);
  const dtiColor = dti < 0.35 ? '#10b981' : dti < 0.5 ? '#f59e0b' : '#f43f5e';
  const dtiLabel = dti < 0.35 ? 'Healthy' : dti < 0.5 ? 'Moderate' : 'High Risk';
  
  // DTI Gauge Arc
  // Semi-circle gauge
  const radius = 80;
  const circumference = Math.PI * radius;
  const dtiOffset = circumference * (1 - dtiView);

  // 2. Product Scores Helpers
  const maxScore = 1;

  // 3. Radar Chart Helpers
  // Normalize metrics to 0-1
  // Axis 1: Income (Target 10k)
  const scoreIncome = Math.min((profile.monthlyIncome || 0) / 10000, 1);
  // Axis 2: Low Debt (1 - DTI/0.8)
  const scoreDebt = Math.max(1 - (dti / 0.8), 0);
  // Axis 3: Savings (Target 10k)
  const scoreSavings = Math.min((profile.savingsBalanceEstimate || 0) / 10000, 1);
  // Axis 4: Payment History (1 - (Late + Bounced)/4)
  const badEvents = (profile.latePaymentIncidentsLast12Months || 0) + (profile.bouncedChequesLast12Months || 0);
  const scoreHistory = Math.max(1 - (badEvents / 4), 0);
  // Axis 5: Stability (Business Age / 36m OR Age/60)
  const scoreStability = profile.customerType === 'SME' 
    ? Math.min((profile.businessAgeMonths || 0) / 36, 1)
    : 0.8; // Default for individual if employment duration not explicit

  const radarData = [
    { label: 'Income', value: scoreIncome },
    { label: 'Low Debt', value: scoreDebt },
    { label: 'Savings', value: scoreSavings },
    { label: 'History', value: scoreHistory },
    { label: 'Stability', value: scoreStability },
  ];

  const radarPoints = radarData.map((d, i) => {
    const angle = (Math.PI * 2 * i) / radarData.length - Math.PI / 2;
    const r = d.value * 60; // radius 60
    const x = 100 + r * Math.cos(angle);
    const y = 100 + r * Math.sin(angle);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="space-y-6">
      
      {/* 1. DTI Gauge */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
        <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-4 tracking-wide">Debt-to-Income Snapshot</h4>
            <div className="flex flex-col items-center">
            <div className="relative w-48 h-28 overflow-hidden">
                <svg viewBox="0 0 200 110" className="w-full h-full transform">
                {/* Background Arc */}
                <path 
                    d="M 20 100 A 80 80 0 0 1 180 100" 
                    fill="none" 
                    stroke="#e2e8f0" 
                    strokeWidth="20" 
                    strokeLinecap="round"
                />
                {/* Value Arc */}
                <path 
                    d="M 20 100 A 80 80 0 0 1 180 100" 
                    fill="none" 
                    stroke={dtiColor} 
                    strokeWidth="20" 
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dtiOffset}
                    className="transition-all duration-1000 ease-out"
                />
                </svg>
                <div className="absolute bottom-0 left-0 w-full text-center mb-2">
                <span className="text-3xl font-bold text-slate-800">{(dti * 100).toFixed(0)}%</span>
                </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold mt-2 ${
                dti < 0.35 ? 'bg-emerald-100 text-emerald-700' : 
                dti < 0.5 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
            }`}>
                {dtiLabel}
            </span>
            </div>
        </div>
        <p className="text-xs text-slate-400 mt-5 text-center leading-relaxed">
            This ratio compares total monthly debt payments to gross monthly income. A lower percentage indicates better financial health.
        </p>
      </div>

      {/* 2. Product Eligibility Bar Chart */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
        <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-4 tracking-wide">Product Suitability Scores</h4>
            <div className="space-y-3">
            {evaluations.map(ev => {
                const product = DEMO_PRODUCTS.find(p => p.id === ev.productId);
                const productName = product ? product.name : ev.productId;
                
                const isApproved = ev.decision === 'APPROVE';
                const isReview = ev.decision === 'REVIEW';
                const barColor = isApproved ? 'bg-emerald-500' : isReview ? 'bg-amber-400' : 'bg-rose-400';
                const widthPct = Math.max(ev.score * 100, 5); // min 5% width for visibility

                return (
                <div key={ev.productId} className="w-full">
                    <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 truncate max-w-[180px]" title={productName}>{productName}</span>
                    <span className="font-mono text-slate-500">{(ev.score * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div 
                        className={`h-full rounded-full ${barColor} transition-all duration-1000`} 
                        style={{ width: `${widthPct}%` }}
                    />
                    </div>
                </div>
                );
            })}
            </div>
        </div>
        <p className="text-xs text-slate-400 mt-5 leading-relaxed">
            Internal scores (0-100%) indicating how closely the profile matches the specific risk criteria and eligibility rules for each product.
        </p>
      </div>

      {/* 3. Risk Radar Chart */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
        <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 tracking-wide">Risk Profile Overview</h4>
            <div className="flex justify-center">
                {/* Expanded viewBox to prevent label cutoff */}
                <svg viewBox="-40 -20 280 240" className="w-48 h-48">
                    {/* Grid Rings */}
                    {[0.2, 0.4, 0.6, 0.8, 1].map(r => (
                        <circle key={r} cx="100" cy="100" r={r * 60} fill="none" stroke="#e2e8f0" strokeWidth="1" />
                    ))}
                    
                    {/* Axes */}
                    {radarData.map((d, i) => {
                        const angle = (Math.PI * 2 * i) / radarData.length - Math.PI / 2;
                        const x2 = 100 + 60 * Math.cos(angle);
                        const y2 = 100 + 60 * Math.sin(angle);
                        
                        // Label Pos
                        const lx = 100 + 75 * Math.cos(angle);
                        const ly = 100 + 75 * Math.sin(angle);
                        const anchor = Math.abs(angle + Math.PI/2) < 0.1 ? 'middle' : (Math.cos(angle) > 0 ? 'start' : 'end');

                        return (
                            <g key={i}>
                                <line x1="100" y1="100" x2={x2} y2={y2} stroke="#cbd5e1" strokeWidth="1" />
                                <text x={lx} y={ly} textAnchor={anchor} alignmentBaseline="middle" className="text-[10px] fill-slate-500 font-medium">
                                    {d.label}
                                </text>
                            </g>
                        );
                    })}

                    {/* Data Polygon */}
                    <polygon points={radarPoints} fill="rgba(99, 102, 241, 0.2)" stroke="#6366f1" strokeWidth="2" />
                    
                    {/* Data Points */}
                    {radarData.map((d, i) => {
                        const angle = (Math.PI * 2 * i) / radarData.length - Math.PI / 2;
                        const r = d.value * 60;
                        const x = 100 + r * Math.cos(angle);
                        const y = 100 + r * Math.sin(angle);
                        return <circle key={i} cx={x} cy={y} r="2" fill="#4f46e5" />;
                    })}
                </svg>
            </div>
        </div>
        <p className="text-xs text-slate-400 mt-2 text-center leading-relaxed">
            Visualizes relative strength across key dimensions. A larger, balanced area generally suggests a more stable financial profile.
        </p>
      </div>

    </div>
  );
};

export default ResultCharts;