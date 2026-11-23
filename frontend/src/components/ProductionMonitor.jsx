import React, { useState, useEffect } from 'react';
import {
  Download,
  Loader2,
  CheckCircle,
  AlertCircle,
  Film,
  Sparkles,
  Video,
  Clapperboard,
  Layers,
  Clock,
  Play,
  Share2,
  RefreshCw
} from 'lucide-react';

export default function ProductionMonitor({ config, externalJobId, onRenderingFinished }) {
  const [jobId, setJobId] = useState(externalJobId || null);
  const [jobStatus, setJobStatus] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [outputVideoUrl, setOutputVideoUrl] = useState(null);

  useEffect(() => {
    if (externalJobId) {
      setJobId(externalJobId);
      setGenerating(true);
      setJobStatus({ status: 'PROCESSING', progress_pct: 10, step_message: 'Initializing 1080p production pipeline...' });
      setOutputVideoUrl(null);
    }
  }, [externalJobId]);

  useEffect(() => {
    if (!jobId || !generating) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/videos/status/${jobId}`);
        if (!res.ok) return;
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
  const progressPct = jobStatus?.progress_pct || 0;

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_20px_-4px_rgba(0,0,0,0.03)] space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Clapperboard className="w-4 h-4 text-indigo-600" />
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Video Output & Player
          </h2>
        </div>
        <span className="text-[10px] font-mono font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded">
          1080p Full HD
        </span>
      </div>

      {/* 16:9 Video Display Container */}
      <div className="aspect-video w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-200 relative flex items-center justify-center shadow-inner">
        {outputVideoUrl ? (
          <video
            src={outputVideoUrl}
            controls
            autoPlay
            className="w-full h-full object-cover"
          />
        ) : generating ? (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 max-w-sm">
            <Loader2 className="w-9 h-9 text-indigo-400 animate-spin" />
            <div className="space-y-1">
              <span className="text-xs font-bold text-white block">
                {jobStatus?.step_message || 'Processing Video Scenes...'}
              </span>
              <span className="text-[11px] font-mono text-indigo-300">
                {progressPct}% Completed
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden border border-slate-700">
              <div
                className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300 shadow-sm"
                style={{ width: `${Math.max(5, progressPct)}%` }}
              ></div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-400">
            <Film className="w-10 h-10 opacity-30 text-slate-400" />
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-slate-300 block">
                Master Video Preview
              </span>
              <span className="text-[11px] text-slate-500 block max-w-[220px]">
                Approve scenes in the storyboard editor to assemble and render your 1080p MP4.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Active Pipeline Stages Indicator */}
      {generating && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
            Assembly Pipeline Tracker
          </span>
          <div className="space-y-1.5 text-[11px] font-mono">
            {[
              { label: 'Voiceover Synthesis (24kHz WAV)', min: 10 },
              { label: 'Soundtrack Ducking (-14dB Speech Duck)', min: 30 },
              { label: 'Facial Motion & Character Keyframing', min: 50 },
              { label: 'Burned Subtitle Synchronization', min: 75 },
              { label: 'Final 1080p MP4 Stitch & Render', min: 90 }
            ].map((step, idx) => {
              const isDone = progressPct > step.min;
              const isCurrent = progressPct <= step.min && (idx === 0 || progressPct > [0, 10, 30, 50, 75][idx]);
              return (
                <div key={idx} className="flex items-center justify-between text-slate-600">
                  <span className={isDone ? 'text-emerald-600 font-medium' : isCurrent ? 'text-indigo-600 font-bold' : 'text-slate-400'}>
                    {idx + 1}. {step.label}
                  </span>
                  {isDone ? (
                    <span className="text-emerald-600 text-[10px] font-bold">✓ Done</span>
                  ) : isCurrent ? (
                    <span className="text-indigo-600 text-[10px] font-bold animate-pulse">In Progress...</span>
                  ) : (
                    <span className="text-slate-400 text-[10px]">Queued</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Output Actions when Ready */}
      {outputVideoUrl && (
        <div className="space-y-3 animate-in fade-in duration-200">
          <a
            href={outputVideoUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
          >
            <Download className="w-4 h-4" />
            <span>Download 1080p Master MP4</span>
          </a>

          {/* Video Metadata Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] font-mono text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span>Resolution:</span>
              <span className="text-slate-900 font-semibold">1920 × 1080 (16:9)</span>
            </div>
            <div className="flex justify-between">
              <span>Frame Rate:</span>
              <span className="text-slate-900 font-semibold">30 FPS Progressive</span>
            </div>
            <div className="flex justify-between">
              <span>Audio Mix:</span>
              <span className="text-slate-900 font-semibold">Ducked (-14dB) 48kHz Stereo</span>
            </div>
            <div className="flex justify-between">
              <span>Subtitles:</span>
              <span className="text-slate-900 font-semibold">Burned-in Synchronized</span>
            </div>
          </div>
        </div>
      )}

      {/* Failure State */}
      {jobStatus?.status === 'FAILED' && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{jobStatus.error || 'Rendering encountered an issue. Please try re-rendering.'}</span>
        </div>
      )}
    </div>
  );
}
