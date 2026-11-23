import React, { useState, useEffect } from 'react';
import { Sparkles, X, Check, AlertCircle, ExternalLink, Key, ShieldCheck } from 'lucide-react';

export default function ReplicateApiKeyModal({ isOpen, onClose, onConfigSaved }) {
  const [apiToken, setApiToken] = useState('');
  const [activePreview, setActivePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/v1/replicate/status')
        .then(res => res.json())
        .then(data => {
          if (data.configured) {
            setActivePreview(data.token_preview || '');
          }
        })
        .catch(err => console.error(err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg(null);

    try {
      const res = await fetch('/api/v1/replicate/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_token: apiToken.trim() })
      });
      const data = await res.json();
      if (data.configured) {
        setStatusMsg({ type: 'success', text: 'Replicate API Token connected successfully!' });
        if (onConfigSaved) onConfigSaved(true);
        setTimeout(() => onClose(), 1200);
      } else {
        setStatusMsg({ type: 'error', text: 'Please enter a valid Replicate API token (starts with r8_).' });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-5 text-slate-800">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Replicate API Token</h3>
            <p className="text-xs text-slate-500">Powers FLUX keyframe rendering & facial motion animation</p>
          </div>
        </div>

        {activePreview ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-800">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Current Token: <strong className="font-mono">{activePreview}</strong></span>
            </div>
            <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
              Active
            </span>
          </div>
        ) : (
          <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Enter your API Token from your Replicate account (<a href="https://replicate.com/account/api-tokens" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-semibold inline-flex items-center gap-1">replicate.com/account/api-tokens <ExternalLink className="w-3 h-3" /></a>). Token starts with <code className="text-slate-700 font-mono font-semibold">r8_...</code>.
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Replicate API Token:
            </label>
            <input
              type="password"
              required
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              placeholder={activePreview ? "Paste new token to replace (r8_...)" : "r8_..."}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 font-mono transition"
            />
          </div>

          {statusMsg && (
            <div className={`p-3 rounded-xl flex items-center gap-2 text-xs ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {statusMsg.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl transition shadow-sm hover:shadow-md"
          >
            {loading ? 'Saving Token...' : 'Save Replicate Token'}
          </button>
        </form>
      </div>
    </div>
  );
}
