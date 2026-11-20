import React, { useState, useEffect } from 'react';
import { Key, X, Check, AlertCircle, ExternalLink } from 'lucide-react';

export default function KlingApiKeyModal({ isOpen, onClose, onConfigSaved }) {
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/v1/kling/status')
        .then(res => res.json())
        .then(data => {
          if (data.configured) {
            setAccessKey(data.access_key_preview || '');
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
      const res = await fetch('/api/v1/kling/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_key: accessKey, secret_key: secretKey })
      });
      const data = await res.json();
      if (data.configured) {
        setStatusMsg({ type: 'success', text: 'Kling API credentials saved successfully!' });
        if (onConfigSaved) onConfigSaved(true);
        setTimeout(() => onClose(), 1200);
      } else {
        setStatusMsg({ type: 'error', text: 'Please enter valid keys.' });
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
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Kling AI API Configuration</h3>
            <p className="text-xs text-slate-500">For animating storyboard scene images into video</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
          Obtain your developer <strong>Access Key</strong> and <strong>Secret Key</strong> from the Kling AI developer console (<a href="https://api.klingai.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-medium inline-flex items-center gap-0.5">klingai.com <ExternalLink className="w-3 h-3" /></a>).
        </p>

        <form onSubmit={handleSave} className="space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Kling Access Key (AK):
            </label>
            <input
              type="text"
              required
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              placeholder="e.g. ak_xxxxxxxxxxxxxxxxxxxx"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white transition"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Kling Secret Key (SK):
            </label>
            <input
              type="password"
              required
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder="e.g. sk_xxxxxxxxxxxxxxxxxxxx"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white transition"
            />
          </div>

          {statusMsg && (
            <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
              statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {statusMsg.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-500" />}
              <span>{statusMsg.text}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition flex items-center gap-1.5"
            >
              {loading ? 'Saving...' : 'Save Keys'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
