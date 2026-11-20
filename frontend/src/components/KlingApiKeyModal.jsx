import React, { useState, useEffect } from 'react';
import { Key, X, Check, AlertCircle, ExternalLink } from 'lucide-react';

export default function KlingApiKeyModal({ isOpen, onClose, onConfigSaved }) {
  const [apiKey, setApiKey] = useState('');
  const [activePreview, setActivePreview] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [useLegacyAkSk, setUseLegacyAkSk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/v1/kling/status')
        .then(res => res.json())
        .then(data => {
          if (data.configured) {
            setActivePreview(data.access_key_preview || '');
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

    const payload = useLegacyAkSk
      ? { access_key: accessKey.trim(), secret_key: secretKey.trim() }
      : { api_key: apiKey.trim() };

    try {
      const res = await fetch('/api/v1/kling/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.configured) {
        setStatusMsg({ type: 'success', text: 'Kling API Key connected successfully!' });
        if (onConfigSaved) onConfigSaved(true);
        setTimeout(() => onClose(), 1200);
      } else {
        setStatusMsg({ type: 'error', text: 'Please enter a valid Kling API Key.' });
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
            <h3 className="text-base font-bold text-slate-900">Kling AI API Key</h3>
            <p className="text-xs text-slate-500">For 3D character animation, blinks & facial expressions</p>
          </div>
        </div>

        {activePreview ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between text-xs text-emerald-800">
            <div className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Current Key: <strong>{activePreview}</strong></span>
            </div>
            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Active</span>
          </div>
        ) : (
          <p className="text-xs text-slate-600 leading-relaxed bg-purple-50/60 p-3 rounded-xl border border-purple-200">
            Kling AI uses a <strong>single API Key</strong> (starts with <code>api-key-kling-...</code>) from your Kling Developer Console (<a href="https://api.klingai.com" target="_blank" rel="noreferrer" className="text-purple-700 underline font-semibold inline-flex items-center gap-0.5">api.klingai.com <ExternalLink className="w-3 h-3" /></a>).
          </p>
        )}

        <form onSubmit={handleSave} className="space-y-3.5">
          {!useLegacyAkSk ? (
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Kling API Key:
              </label>
              <input
                type="password"
                required
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={activePreview ? "Paste new key to replace (api-key-kling-...)" : "Paste your api-key-kling-... key here"}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white transition"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Note: In your Kling dashboard, if the key is masked with asterisks (***), copy the full key you saved, or click <strong>+ Create a new API Key</strong> to get and copy a fresh unmasked key.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
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
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setUseLegacyAkSk(!useLegacyAkSk)}
              className="text-[11px] text-purple-700 hover:underline font-medium"
            >
              {useLegacyAkSk ? "← Switch to single API Key" : "Have Access Key & Secret Key instead?"}
            </button>
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
              {loading ? 'Saving...' : 'Connect Kling Key'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
