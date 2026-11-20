import React from 'react';
import { Film, Key, Check } from 'lucide-react';

export default function Header({ klingConfigured, onOpenKlingModal }) {
  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-40 px-6 py-3.5 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 tracking-tight">
              AI Explainer Video Studio
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenKlingModal}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition ${
              klingConfigured
                ? 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100'
                : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
          >
            {klingConfigured ? (
              <>
                <Check className="w-3 h-3 text-purple-600" />
                <span>Kling AI Connected</span>
              </>
            ) : (
              <>
                <Key className="w-3 h-3 text-slate-500" />
                <span>Connect Kling Key</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
