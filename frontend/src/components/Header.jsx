import React from 'react';
import { Film, Key, Check, Sparkles, Zap } from 'lucide-react';

export default function Header({ replicateConfigured, groqConfigured, onOpenReplicateModal }) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 sm:px-6 lg:px-8 py-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition">
      <div className="max-w-[1680px] w-full mx-auto flex items-center justify-between">
        {/* Brand & Studio Identity */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-sm shadow-indigo-600/20">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-slate-900">
                VideoStudio <span className="text-indigo-600 font-medium">Motion</span>
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-semibold">
                1080p Full HD
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Automated AI Video Creation Pipeline
            </p>
          </div>
        </div>

        {/* Center: System Status Pill */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-600">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[11px] font-medium text-slate-600">Storyboard Engine Ready</span>
        </div>

        {/* Right Actions: Groq Status & Replicate AI Connection */}
        <div className="flex items-center gap-2.5">
          {/* Groq LLM Active Pill */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
            groqConfigured
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-slate-50 text-slate-600 border-slate-200'
          }`}>
            <Zap className={`w-3.5 h-3.5 ${groqConfigured ? 'text-amber-600 fill-amber-500' : 'text-slate-400'}`} />
            <span className="font-mono text-[11px]">{groqConfigured ? 'Groq 120B Active' : 'Groq Standby'}</span>
          </div>

          {/* Replicate Connection */}
          <button
            type="button"
            onClick={onOpenReplicateModal}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition shadow-xs ${
              replicateConfigured
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100/80'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            {replicateConfigured ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="font-mono text-[11px]">Replicate Connected</span>
              </>
            ) : (
              <>
                <Key className="w-3.5 h-3.5 text-indigo-600" />
                <span>Connect Replicate Key</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
