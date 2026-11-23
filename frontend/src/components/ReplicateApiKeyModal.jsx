import React, { useState, useEffect } from 'react';
import { Sparkles, X, Check, AlertCircle, ExternalLink } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Replicate API Token</h3>
            <p className="text-xs text-slate-500">For 3D character animation, blinks & facial expressions</p>
          </div>
        </div>

        {activePreview ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between text-xs text-emerald-800">
            <div className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Current Token: <strong>{activePreview}</strong></span>
            </div>
            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Active</span>
          </div>
        ) : (
          <p className="text-xs text-slate-600 leading-relaxed bg-indigo-50/60 p-3 rounded-xl border border-indigo-200">
            Paste your <strong>API Token</strong> (starts with <code>r8_...</code>) from your Replicate account (<a href="https://replicate.com/account/api-tokens" target="_blank" rel="noreferrer" className="text-indigo-700 underline font-semibold inline-flex items-center gap-0.5">replicate.com/account/api-tokens <ExternalLink className="w-3 h-3" /></a>).
          </p>
        )}

        <form onSubmit={handleSave} className="space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Replicate API Token:
            </label>
            <input
              type="password"
              required
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              placeholder={activePreview ? "Paste new token to replace (r8_...)" : "Paste your r8_... token here"}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition"
            />
          </div>

          {statusMsg && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm disabled:opacity-50"
            >
              {loading ? 'Connecting...' : 'Save Token'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
