import React, { useState } from 'react';
import {
  Check,
  RefreshCw,
  Upload,
  Sparkles,
  Trash2,
  Plus,
  Play,
  Volume2,
  Sliders,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  MessageSquare,
  Eye,
  Loader2,
  Video,
  Clapperboard,
  Camera,
  Layers,
  Smile,
  Type
} from 'lucide-react';

export default function ApprovalBoard({
  config,
  onChangeConfig,
  onApproveAndRender,
  isRendering,
  musicTracks = [],
  voices = []
}) {
  const [regeneratingIdx, setRegeneratingIdx] = useState(null);
  const [editingPromptIdx, setEditingPromptIdx] = useState(null);
  const [customPromptText, setCustomPromptText] = useState('');
  const [uploadingIdx, setUploadingIdx] = useState(null);

  const scenes = config.scenes || [];

  const handleSceneChange = (index, field, value) => {
    const updated = [...scenes];
    if (updated[index]) {
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      onChangeConfig({
        ...config,
        scenes: updated
      });
    }
  };

  const handleOpenPromptEditor = (index) => {
    setEditingPromptIdx(index);
    setCustomPromptText(scenes[index]?.image_prompt || '');
  };

  const handleRegenerateImage = async (index) => {
    const scene = scenes[index];
    if (!scene) return;

    const sNum = scene.scene_number || index + 1;
    const promptToUse = customPromptText.trim() || scene.image_prompt || `Scene ${sNum} visual`;

    setRegeneratingIdx(index);

    try {
      const res = await fetch('/api/v1/studio/regenerate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scene_index: sNum,
          image_prompt: promptToUse
        })
      });

      if (!res.ok) {
        throw new Error(`Failed to regenerate image (${res.status})`);
      }

      const data = await res.json();
      const updated = [...scenes];
      updated[index] = {
        ...updated[index],
        image_path: data.image_path,
        preview_url: data.preview_url,
        image_prompt: promptToUse,
        image_provider: data.provider
      };

      onChangeConfig({
        ...config,
        scenes: updated
      });

      setEditingPromptIdx(null);
    } catch (err) {
      console.error('Error regenerating image:', err);
      alert(`Could not regenerate image: ${err.message}`);
    } finally {
      setRegeneratingIdx(null);
    }
  };

  const handleCustomImageUpload = async (index, file) => {
    if (!file) return;
    setUploadingIdx(index);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/v1/custom/upload-image', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Failed to upload image file');

      const data = await res.json();
      const updated = [...scenes];
      updated[index] = {
        ...updated[index],
        image_path: data.image_path,
        preview_url: data.preview_url,
        image_provider: 'custom_upload'
      };

      onChangeConfig({
        ...config,
        scenes: updated
      });
    } catch (err) {
      console.error('Image upload failed:', err);
      alert(`Could not upload image: ${err.message}`);
    } finally {
      setUploadingIdx(null);
    }
  };

  const handleAddScene = () => {
    const nextNum = scenes.length + 1;
    const newScene = {
      scene_number: nextNum,
      title: `Scene ${nextNum}`,
      narration: '',
      subtitle: '',
      image_prompt: 'Cinematic visual frame',
      motion_prompt: 'Natural eye blinking, gentle nodding, warm smile',
      motion_style: 'zoom_in',
      image_path: '',
      preview_url: ''
    };
    onChangeConfig({
      ...config,
      scenes: [...scenes, newScene]
    });
  };

  const handleRemoveScene = (idxToRemove) => {
    if (scenes.length <= 1) {
      alert('Your storyboard must contain at least one scene.');
      return;
    }
    const updated = scenes
      .filter((_, i) => i !== idxToRemove)
      .map((s, i) => ({
        ...s,
        scene_number: i + 1,
        title: s.title.startsWith('Scene ') ? `Scene ${i + 1}` : s.title
      }));
    onChangeConfig({
      ...config,
      scenes: updated
    });
  };

  const totalWords = scenes.reduce((acc, s) => {
    return acc + (s.narration ? s.narration.trim().split(/\s+/).filter(Boolean).length : 0);
  }, 0);
  const totalEstimatedSeconds = Math.round(totalWords / 2.5);

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_20px_-4px_rgba(0,0,0,0.03)] space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
              Step 02
            </span>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Interactive Storyboard & Scene Review
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review and adjust keyframe artwork, spoken voiceover, captions, and character motion before rendering.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-xs font-mono font-semibold bg-slate-50 text-slate-700 px-3 py-1.5 rounded-xl border border-slate-200">
            {scenes.length} {scenes.length === 1 ? 'Scene' : 'Scenes'} {totalEstimatedSeconds > 0 && `• ~${totalEstimatedSeconds}s total`}
          </span>

          <button
            type="button"
            onClick={handleAddScene}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition"
          >
            <Plus className="w-3.5 h-3.5 text-slate-700" />
            <span>Add Scene</span>
          </button>
        </div>
      </div>

      {/* Scene Cards Sequence */}
      <div className="space-y-6">
        {scenes.map((scene, index) => {
          const sNum = scene.scene_number || index + 1;
          const isRegen = regeneratingIdx === index;
          const isUpload = uploadingIdx === index;
          const isEditingPrompt = editingPromptIdx === index;
          const wordCount = scene.narration ? scene.narration.trim().split(/\s+/).filter(Boolean).length : 0;
          const sceneDuration = Math.round(wordCount / 2.5);

          return (
            <div
              key={index}
              className="border border-slate-200/90 rounded-2xl overflow-hidden bg-white hover:border-slate-300 transition shadow-xs space-y-0"
            >
              {/* Scene Card Header */}
              <div className="bg-slate-50/90 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 max-w-md">
                  <span className="font-mono text-[11px] font-bold text-white bg-indigo-600 px-2 py-0.5 rounded shadow-2xs">
                    SCENE {sNum < 10 ? `0${sNum}` : sNum}
                  </span>
                  <input
                    type="text"
                    value={scene.title || `Scene ${sNum}`}
                    onChange={(e) => handleSceneChange(index, 'title', e.target.value)}
                    className="text-xs font-bold text-slate-900 bg-transparent hover:bg-white focus:bg-white px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-indigo-600 focus:outline-none transition flex-1"
                  />
                </div>

                <div className="flex items-center gap-2">
                  {/* Camera Movement Pill */}
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 shadow-2xs">
                    <Camera className="w-3.5 h-3.5 text-slate-500" />
                    <select
                      value={scene.motion_style || 'zoom_in'}
                      onChange={(e) => handleSceneChange(index, 'motion_style', e.target.value)}
                      className="text-[11px] bg-transparent text-slate-700 font-semibold focus:outline-none cursor-pointer"
                    >
                      <option value="zoom_in">Push-In (Zoom)</option>
                      <option value="zoom_out">Pull-Back</option>
                      <option value="pan_right">Pan Right</option>
                      <option value="pan_left">Pan Left</option>
                    </select>
                  </div>

                  {/* Delete Scene Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveScene(index)}
                    title="Delete Scene"
                    className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-white transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Scene Card Body */}
              <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                {/* Left 5 cols: 16:9 Image Preview & Visual Actions */}
                <div className="md:col-span-5 space-y-3">
                  <div className="aspect-video w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-200 relative group flex items-center justify-center shadow-xs">
                    {scene.preview_url ? (
                      <img
                        src={scene.preview_url}
                        alt={`Scene ${sNum}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 space-y-1.5 p-4 text-center">
                        <ImageIcon className="w-8 h-8 opacity-40 text-slate-400" />
                        <span className="text-xs font-medium text-slate-400">Keyframe Pending</span>
                      </div>
                    )}

                    {/* Loading Overlay */}
                    {isRegen && (
                      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2 p-3 text-center">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                        <span className="text-xs font-semibold text-white">Rendering Keyframe...</span>
                      </div>
                    )}

                    {isUpload && (
                      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2 p-3 text-center">
                        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                        <span className="text-xs font-semibold text-white">Uploading File...</span>
                      </div>
                    )}

                    {/* Provider badge */}
                    {scene.preview_url && !isRegen && (
                      <div className="absolute top-2 left-2 bg-slate-900/75 backdrop-blur-xs text-[10px] text-white px-2 py-0.5 rounded font-mono font-medium">
                        {scene.image_provider === 'replicate_flux'
                          ? 'FLUX.1 Schnell'
                          : scene.image_provider === 'custom_upload'
                          ? 'Custom Upload'
                          : '16:9 Keyframe'}
                      </div>
                    )}
                  </div>

                  {/* Visual Control Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isRegen}
                      onClick={() => handleOpenPromptEditor(index)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-400 text-slate-700 hover:text-indigo-700 shadow-2xs transition"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRegen ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
                      <span>{isEditingPrompt ? 'Close Prompt' : 'Edit Prompt'}</span>
                    </button>

                    <label className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 shadow-2xs cursor-pointer transition">
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                      <span>Replace</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleCustomImageUpload(index, e.target.files[0])}
                      />
                    </label>
                  </div>

                  {/* Inline Prompt Modifier Box if open */}
                  {isEditingPrompt && (
                    <div className="p-3.5 bg-slate-50 border border-indigo-200 rounded-xl space-y-2.5 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span>Visual Frame Prompt</span>
                        <button
                          type="button"
                          onClick={() => setEditingPromptIdx(null)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          ✕
                        </button>
                      </div>
                      <textarea
                        rows={3}
                        value={customPromptText}
                        onChange={(e) => setCustomPromptText(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
                        placeholder="Describe character, lighting, and environment setting..."
                      />
                      <button
                        type="button"
                        onClick={() => handleRegenerateImage(index)}
                        className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Render New Keyframe</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Right 7 cols: Narration Script, Subtitles, Motion Prompts */}
                <div className="md:col-span-7 space-y-3.5">
                  {/* Spoken Narration Script */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-bold text-slate-800 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Spoken Narration (Voiceover)</span>
                      </label>
                      <span className="text-[11px] font-mono text-slate-500 font-medium">
                        {wordCount} words {sceneDuration > 0 && `(~${sceneDuration}s)`}
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      value={scene.narration || ''}
                      onChange={(e) => handleSceneChange(index, 'narration', e.target.value)}
                      placeholder="Enter the voiceover text for this scene..."
                      className="w-full bg-slate-50/60 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition leading-relaxed"
                    />
                  </div>

                  {/* Burned Subtitle */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5 text-sky-600" />
                      <span>On-Screen Subtitle Line</span>
                    </label>
                    <input
                      type="text"
                      value={scene.subtitle || ''}
                      onChange={(e) => handleSceneChange(index, 'subtitle', e.target.value)}
                      placeholder="Captions synchronized with spoken audio..."
                      className="w-full bg-slate-50/60 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
                    />
                  </div>

                  {/* Character Facial Motion & Expression Prompt */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Smile className="w-3.5 h-3.5 text-amber-500" />
                        <span>Character Facial Expression & Physical Motion</span>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={scene.motion_prompt || ''}
                      onChange={(e) => handleSceneChange(index, 'motion_prompt', e.target.value)}
                      placeholder="e.g. Warm smile, direct eye contact with camera, natural blinking, gentle head nodding..."
                      className="w-full bg-slate-50/60 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
                    />

                    {/* Quick Motion Presets */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[
                        'Warm smile & eye contact',
                        'Natural blinking & nodding',
                        'Cheerful laugh & gestures',
                        'Curious head tilt'
                      ].map((preset, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => handleSceneChange(index, 'motion_prompt', preset)}
                          className="text-[10px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 text-slate-600 px-2 py-0.5 rounded transition"
                        >
                          + {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Production Approval Banner */}
      <div className="pt-4 border-t border-slate-100">
        <div className="bg-gradient-to-r from-emerald-50/80 via-white to-emerald-50/60 border border-emerald-200/90 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Ready to Render Master Video?
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Synthesizes Edge-TTS voiceover, ducks background music by -14dB, animates character facial expressions, and burns in synchronized subtitles.
            </p>
          </div>

          <button
            type="button"
            disabled={isRendering || scenes.length === 0}
            onClick={onApproveAndRender}
            className={`w-full sm:w-auto px-8 py-3.5 rounded-xl text-xs font-bold text-white transition flex items-center justify-center gap-2 shadow-sm ${
              isRendering
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-emerald-200 hover:shadow-md'
            }`}
          >
            {isRendering ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Rendering 1080p Video...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-white" />
                <span>Approve & Render 1080p Video</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
