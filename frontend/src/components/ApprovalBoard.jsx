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
  Loader2
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
    const promptToUse = customPromptText.trim() || scene.image_prompt || `Scene ${sNum} 3D Pixar character`;

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

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/v1/custom/upload-image', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Image upload failed');

      const data = await res.json();
      const updated = [...scenes];
      updated[index] = {
        ...updated[index],
        image_path: data.local_path,
        preview_url: data.preview_url,
        image_provider: 'custom_upload'
      };

      onChangeConfig({
        ...config,
        scenes: updated
      });
    } catch (err) {
      console.error('Upload error:', err);
      alert(`Failed to upload image: ${err.message}`);
    } finally {
      setUploadingIdx(null);
    }
  };

  const handleAddScene = () => {
    const nextNum = scenes.length + 1;
    const newScene = {
      scene_number: nextNum,
      title: `Scene ${nextNum}`,
      image_path: '',
      preview_url: '',
      image_prompt: '3D Pixar style character teacher in a modern colorful science classroom, warm lighting, 8k render',
      motion_prompt: 'Warm smile, looking directly at viewer, natural eye blinking, gentle nodding head',
      motion_style: 'zoom_in',
      narration: 'And here is another key step in this fascinating topic.',
      subtitle: 'And here is another key step in this fascinating topic.'
    };
    onChangeConfig({
      ...config,
      scenes: [...scenes, newScene]
    });
  };

  const handleRemoveScene = (idxToRemove) => {
    if (scenes.length <= 1) {
      alert('Your video project needs at least 1 scene.');
      return;
    }
    const updated = scenes
      .filter((_, i) => i !== idxToRemove)
      .map((scene, i) => ({
        ...scene,
        scene_number: i + 1,
        title: scene.title?.startsWith('Scene ') ? `Scene ${i + 1}` : scene.title
      }));
    onChangeConfig({
      ...config,
      scenes: updated
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <h2 className="text-lg font-bold text-slate-900">
              2. Storyboard & Visuals Approval Board
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review the AI-generated 16:9 images, adjust narration, or re-roll visuals before assembling your 1080p Full HD video.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100">
            {scenes.length} Scenes Ready
          </span>
          <button
            type="button"
            onClick={handleAddScene}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Scene</span>
          </button>
        </div>
      </div>

      {/* Scene Cards Grid */}
      <div className="space-y-6">
        {scenes.map((scene, index) => {
          const sNum = scene.scene_number || index + 1;
          const isRegen = regeneratingIdx === index;
          const isUpload = uploadingIdx === index;
          const isEditingPrompt = editingPromptIdx === index;

          return (
            <div
              key={index}
              className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 hover:border-slate-300 transition shadow-sm"
            >
              {/* Scene Card Header */}
              <div className="bg-slate-100/70 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                    {sNum}
                  </span>
                  <input
                    type="text"
                    value={scene.title || `Scene ${sNum}`}
                    onChange={(e) => handleSceneChange(index, 'title', e.target.value)}
                    className="text-xs font-bold text-slate-800 bg-transparent hover:bg-white focus:bg-white px-2 py-0.5 rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={scene.motion_style || 'zoom_in'}
                    onChange={(e) => handleSceneChange(index, 'motion_style', e.target.value)}
                    className="text-[11px] bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-medium focus:outline-none"
                  >
                    <option value="zoom_in">🔍 Camera Push-In</option>
                    <option value="zoom_out">🔍 Camera Pull-Back</option>
                    <option value="pan_right">➡️ Camera Pan Right</option>
                    <option value="pan_left">⬅️ Camera Pan Left</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => handleRemoveScene(index)}
                    title="Delete Scene"
                    className="text-slate-400 hover:text-red-600 p-1 rounded transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Scene Card Body */}
              <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                {/* Left 5 cols: 16:9 Image Preview & Visual Actions */}
                <div className="md:col-span-5 space-y-2.5">
                  <div className="aspect-video w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-200 relative group flex items-center justify-center">
                    {scene.preview_url ? (
                      <img
                        src={scene.preview_url}
                        alt={`Scene ${sNum}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-500 space-y-1">
                        <ImageIcon className="w-8 h-8 opacity-40" />
                        <span className="text-[11px]">No Image Yet</span>
                      </div>
                    )}

                    {/* Overlay Badges & Loading States */}
                    {isRegen && (
                      <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center text-white space-y-2 p-3 text-center">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                        <span className="text-xs font-semibold">Generating AI Image...</span>
                      </div>
                    )}

                    {isUpload && (
                      <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center text-white space-y-2 p-3 text-center">
                        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                        <span className="text-xs font-semibold">Uploading Image...</span>
                      </div>
                    )}

                    {/* Provider badge */}
                    {scene.preview_url && !isRegen && (
                      <div className="absolute top-2 left-2 bg-slate-900/75 backdrop-blur-sm text-[10px] text-white px-2 py-0.5 rounded font-mono font-medium">
                        {scene.image_provider === 'replicate_flux'
                          ? 'Replicate FLUX'
                          : scene.image_provider === 'custom_upload'
                          ? 'Uploaded Image'
                          : 'FLUX AI 16:9'}
                      </div>
                    )}
                  </div>

                  {/* Visual Control Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isRegen}
                      onClick={() => handleOpenPromptEditor(index)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:border-indigo-400 hover:text-indigo-600 text-slate-700 shadow-sm transition"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRegen ? 'animate-spin' : ''}`} />
                      <span>Regenerate Image</span>
                    </button>

                    <label className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:border-slate-300 text-slate-700 shadow-sm cursor-pointer transition">
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
                    <div className="p-3 bg-white border border-indigo-200 rounded-xl space-y-2 shadow-sm">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span>Edit 3D Visual Prompt:</span>
                        <button
                          type="button"
                          onClick={() => setEditingPromptIdx(null)}
                          className="text-slate-400 hover:text-slate-600 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={customPromptText}
                        onChange={(e) => setCustomPromptText(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="Describe the 3D character or classroom visual..."
                      />
                      <button
                        type="button"
                        onClick={() => handleRegenerateImage(index)}
                        className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Render New Image</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Right 7 cols: Narration Script, Subtitles, Motion Prompts */}
                <div className="md:col-span-7 space-y-3">
                  {/* Spoken Narration */}
                  <div className="space-y-1">
                    <label className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>🗣️ Spoken Voice Narration (TTS)</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {scene.narration?.split(' ').filter(Boolean).length || 0} words (~{Math.round((scene.narration?.split(' ').filter(Boolean).length || 0) / 2.5)}s)
                      </span>
                    </label>
                    <textarea
                      rows={3}
                      value={scene.narration || ''}
                      onChange={(e) => handleSceneChange(index, 'narration', e.target.value)}
                      placeholder="Write what the AI voiceover should say in this scene..."
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                    />
                  </div>

                  {/* Burned Subtitle */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      💬 On-Screen Subtitle
                    </label>
                    <input
                      type="text"
                      value={scene.subtitle || ''}
                      onChange={(e) => handleSceneChange(index, 'subtitle', e.target.value)}
                      placeholder="Captions synchronized with spoken audio..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                    />
                  </div>

                  {/* Character Facial Motion & Expression Prompt */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      🎭 Character Expression & Facial Motion
                    </label>
                    <input
                      type="text"
                      value={scene.motion_prompt || ''}
                      onChange={(e) => handleSceneChange(index, 'motion_prompt', e.target.value)}
                      placeholder="e.g. Warm smile, direct eye contact with camera, natural blinking, gentle head nodding..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Final Approval & Production CTA Banner */}
      <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Ready to Render 1080p Video?
            </h3>
          </div>
          <p className="text-xs text-slate-600">
            Clicking approve will synthesize the voiceover, mix ducked background music, animate character expressions, and assemble your final MP4.
          </p>
        </div>

        <button
          type="button"
          disabled={isRendering || scenes.length === 0}
          onClick={onApproveAndRender}
          className={`w-full sm:w-auto px-8 py-3.5 rounded-xl text-xs font-bold text-white transition flex items-center justify-center gap-2 shadow-lg ${
            isRendering
              ? 'bg-slate-400 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-emerald-200'
          }`}
        >
          {isRendering ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Rendering 1080p Video...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>🚀 Approve & Generate 1080p Video</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
