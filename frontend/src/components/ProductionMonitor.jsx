import React, { useState, useEffect } from 'react';
import { Download, Loader2, CheckCircle, AlertCircle, Film, Sparkles, Video } from 'lucide-react';

export default function ProductionMonitor({ config, externalJobId, onRenderingFinished }) {
  const [jobId, setJobId] = useState(externalJobId || null);
  const [jobStatus, setJobStatus] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [outputVideoUrl, setOutputVideoUrl] = useState(null);

  useEffect(() => {
    if (externalJobId) {
      setJobId(externalJobId);
      setGenerating(true);
      setJobStatus({ status: 'PROCESSING', progress_pct: 10, step_message: 'Starting 1080p video production...' });
      setOutputVideoUrl(null);
    }
  }, [externalJobId]);

  const startCustomGeneration = async () => {
    setGenerating(true);
    setJobStatus({ status: 'QUEUED', progress_pct: 5, step_message: 'Initializing video generation...' });
    setOutputVideoUrl(null);

    try {
      await fetch('/api/v1/custom/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      const res = await fetch('/api/v1/custom/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      setJobId(data.job_id);
    } catch (err) {
      setGenerating(false);
      setJobStatus({ status: 'FAILED', error: err.message });
      if (onRenderingFinished) onRenderingFinished();
    }
  };

  useEffect(() => {
    if (!jobId || !generating) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/videos/status/${jobId}`);
        const data = await res.json();
        setJobStatus(data);

        if (data.status === 'COMPLETED') {
          setGenerating(false);
          setOutputVideoUrl(data.download_url);
          if (onRenderingFinished) onRenderingFinished();
          clearInterval(interval);
        } else if (data.status === 'FAILED') {
          setGenerating(false);
          if (onRenderingFinished) onRenderingFinished();
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Error polling status:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId, generating, onRenderingFinished]);

  const scenesCount = config?.scenes?.length || 1;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-slate-800" />
            <h2 className="text-sm font-bold text-slate-900">3. Video Production & 1080p Player</h2>
          </div>
          <span className="text-[11px] bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-semibold">
            1080p Full HD
          </span>
        </div>

        {/* 16:9 Video Player Screen */}
        <div className="aspect-video w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-200 relative flex items-center justify-center shadow-inner">
          {outputVideoUrl ? (
            <video
              src={outputVideoUrl}
              controls
              autoPlay
              className="w-full h-full object-cover"
            />
          ) : generating ? (
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
              <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
              <div className="space-y-1 max-w-xs">
                <span className="text-xs font-semibold text-white block">
                  {jobStatus?.step_message || 'Processing video...'}
                </span>
                <span className="text-[11px] text-slate-400 block font-mono">
                  {jobStatus?.progress_pct || 0}% Completed
                </span>
              </div>
              <div className="w-56 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-300"
                  style={{ width: `${jobStatus?.progress_pct || 5}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="text-center p-6 space-y-2">
              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <Video className="w-6 h-6 text-slate-400" />
              </div>
              <span className="text-xs font-medium text-slate-300 block">
                Final 1080p video will preview here
              </span>
            </div>
          )}
        </div>

        {/* Status / Success Alert */}
        {jobStatus?.status === 'COMPLETED' && (
          <div className="mt-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900 shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">Video Rendered!</span>
            </div>
            <a
              href={outputVideoUrl}
              download
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg font-bold shadow-sm transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download MP4</span>
            </a>
          </div>
        )}

        {jobStatus?.status === 'FAILED' && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>Generation failed: {jobStatus.error || 'Unknown error'}</span>
          </div>
        )}
      </div>

      {/* Manual Quick Render Button */}
      <div className="pt-2 border-t border-slate-100">
        <button
          onClick={startCustomGeneration}
          disabled={generating || scenesCount === 0}
          className={`w-full py-3 px-5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            generating
              ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              : 'bg-slate-900 hover:bg-black text-white shadow-md active:scale-[0.99] cursor-pointer'
          }`}
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Rendering Video ({jobStatus?.progress_pct || 0}%)...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span>Direct Render ({scenesCount} {scenesCount === 1 ? 'Scene' : 'Scenes'})</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
