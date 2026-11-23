import React from 'react';
import { Film, Key, Check } from 'lucide-react';

export default function Header({ replicateConfigured, onOpenReplicateModal }) {
  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-40 px-4 sm:px-6 lg:px-8 py-3.5 shadow-sm">
      <div className="max-w-[1680px] w-full mx-auto flex items-center justify-between">
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

        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          {/* Replicate AI Key (LivePortrait & LTX-Video) */}
          <button
            type="button"
            onClick={onOpenReplicateModal}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition shadow-sm ${
              replicateConfigured
                ? 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100'
                : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
          >
            {replicateConfigured ? (
              <>
                <Check className="w-3.5 h-3.5 text-indigo-600" />
                <span>Replicate AI Connected</span>
              </>
            ) : (
              <>
                <Key className="w-3.5 h-3.5 text-slate-500" />
                <span>Connect Replicate Key</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
