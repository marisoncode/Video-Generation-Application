import React, { useState } from 'react';
import { Image as ImageIcon, Sparkles, Film, Mic, X, CheckCircle2, Music, Plus, Trash2 } from 'lucide-react';

export default function DirectorWorkspace({ config, onChangeConfig, voices, selectedVoice, onSelectVoice, klingConfigured, didConfigured }) {
  const [uploadingIdx, setUploadingIdx] = useState(null);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const [customVoiceName, setCustomVoiceName] = useState(config.custom_voice_name || '');
  const [customVoicePreview, setCustomVoicePreview] = useState(config.custom_voice_preview || '');
  const [showVoiceUpload, setShowVoiceUpload] = useState(
    Boolean(selectedVoice?.startsWith('custom_voice:') || config.voice?.startsWith('custom_voice:'))
  );

  const handleFieldChange = (field, value) => {
    onChangeConfig({
      ...config,
      [field]: value
    });
  };

  const scenes = (config.scenes && config.scenes.length > 0)
    ? config.scenes
    : (config.demonstration_scenes && config.demonstration_scenes.length > 0)
      ? config.demonstration_scenes
      : [
          { scene_number: 1, title: 'Scene 1', image_path: '', preview_url: '', motion_prompt: '', narration: '', subtitle: '' }
        ];

  const handleSceneChange = (index, field, value) => {
    handleUpdateScene(index, { [field]: value });
  };

  const handleUpdateScene = (index, fields) => {
    const updated = [...scenes];
    if (updated[index]) {
      updated[index] = {
        ...updated[index],
        ...fields
      };
      onChangeConfig({
        ...config,
        scenes: updated,
        demonstration_scenes: updated
      });
    }
  };

  const handleAddScene = () => {
    const nextNum = scenes.length + 1;
    const newScene = {
      scene_number: nextNum,
      title: `Scene ${nextNum}`,
      image_path: '',
      preview_url: '',
      motion_prompt: '',
      motion_style: 'auto',
      narration: '',
      subtitle: ''
    };
    const updated = [...scenes, newScene];
    onChangeConfig({
      ...config,
      scenes: updated,
      demonstration_scenes: updated
    });
  };

  const handleRemoveScene = (idxToRemove) => {
    if (scenes.length <= 1) {
      alert('You must have at least one scene in your video.');
      return;
    }
    const updated = scenes
      .filter((_, i) => i !== idxToRemove)
      .map((scene, i) => ({
        ...scene,
        scene_number: i + 1,
        title: scene.title.startsWith('Scene ') ? `Scene ${i + 1}` : scene.title
      }));
    onChangeConfig({
      ...config,
      scenes: updated,
      demonstration_scenes: updated
    });
  };

  const handleImageUpload = async (index, file) => {
    if (!file) return;
    setUploadingIdx(index);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/v1/custom/upload-image', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.status === 'uploaded') {
        handleUpdateScene(index, {
          image_path: data.local_path,
          preview_url: data.preview_url
        });
      }
    } catch (err) {
      console.error('Error uploading image:', err);
      alert('Failed to upload image: ' + err.message);
    } finally {
      setUploadingIdx(null);
    }
  };

  const handleRemoveImage = (index) => {
    handleUpdateScene(index, {
      image_path: '',
      preview_url: ''
    });
  };

  const handleVoiceAudioUpload = async (file) => {
    if (!file) return;
    setUploadingVoice(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/v1/custom/upload-voice', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.status === 'uploaded') {
        setCustomVoiceName(data.voice_name);
        setCustomVoicePreview(data.preview_url);
        onSelectVoice(data.voice_id);
        onChangeConfig({
          ...config,
          voice: data.voice_id,
          custom_voice_name: data.voice_name,
          custom_voice_preview: data.preview_url
        });
      }
    } catch (err) {
      console.error('Error uploading voice audio:', err);
      alert('Failed to upload voice audio: ' + err.message);
    } finally {
      setUploadingVoice(false);
    }
  };

  const handleVoiceDropdownChange = (val) => {
    if (val === 'upload_custom') {
      setShowVoiceUpload(true);
    } else {
      setShowVoiceUpload(false);
      onSelectVoice(val);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Project Title & Voice Selection */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Film className="w-4 h-4 text-slate-700" />
          <h2 className="text-sm font-bold text-slate-900">1. Project & Voice</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
          {/* Title */}
          <div className="sm:col-span-7">
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Video Title:
            </label>
            <input
              type="text"
              value={config.title || ''}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              placeholder="Enter video project name..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-800 focus:bg-white transition"
            />
          </div>

          {/* Voice Selector */}
          <div className="sm:col-span-5">
            <label className="text-xs font-semibold text-slate-700 block mb-1 flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-slate-600" />
              Voice Selection:
            </label>
            <select
              value={showVoiceUpload ? 'upload_custom' : (selectedVoice || config.voice)}
              onChange={(e) => handleVoiceDropdownChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-800 focus:bg-white transition cursor-pointer"
            >
              {voices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
              <option value="upload_custom">
                + Upload Audio to Clone Voice
              </option>
            </select>
          </div>
        </div>

        {/* Dynamic Voice Cloner Upload Box */}
        {showVoiceUpload && (
          <div className="mt-3 p-4 bg-purple-50/60 border border-purple-200 rounded-xl space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-purple-700" />
                <span className="text-xs font-bold text-purple-950">
                  Dynamic Voice Cloner
                </span>
              </div>
              {customVoicePreview && (
                <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Voice Ready
                </span>
              )}
            </div>

            <p className="text-[11px] text-purple-900 leading-relaxed">
              Upload <strong>5 to 15 seconds</strong> of clean speaking audio (MP3, WAV, or M4A). Every scene will speak in this exact cloned voice.
            </p>

            <div className="flex items-center gap-3">
              <label className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer transition shadow-sm flex items-center gap-2">
                <span>{uploadingVoice ? 'Normalizing Audio...' : customVoicePreview ? 'Change Voice Audio' : 'Upload Audio File'}</span>
                <input
                  type="file"
                  accept="audio/*"
                  disabled={uploadingVoice}
                  onChange={(e) => handleVoiceAudioUpload(e.target.files?.[0])}
                  className="hidden"
                />
              </label>

              {customVoiceName && (
                <span className="text-xs text-purple-950 font-medium truncate max-w-xs">
                  {customVoiceName}
                </span>
              )}
            </div>

            {customVoicePreview && (
              <div className="pt-2">
                <audio controls src={customVoicePreview} className="w-full h-8" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Pure Storyboard Scenes List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            2. Video Storyboard Scenes
          </h2>
          <span className="text-[11px] bg-purple-50 text-purple-700 font-semibold px-2.5 py-0.5 rounded-full border border-purple-200">
            {scenes.length} {scenes.length === 1 ? 'Scene' : 'Scenes'} in Video
          </span>
        </div>

        <div className="space-y-4">
          {scenes.map((scene, idx) => {
            const previewSrc = scene.preview_url || null;
            return (
              <div
                key={idx}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4"
              >
                {/* Scene Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2.5 flex-1 mr-4">
                    <span className="w-6 h-6 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={scene.title || ''}
                      onChange={(e) => handleSceneChange(idx, 'title', e.target.value)}
                      placeholder={`Scene ${idx + 1} Title (e.g. Talking Lion)...`}
                      className="text-xs font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-800 focus:outline-none px-1 py-0.5 transition flex-1 max-w-md"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    {klingConfigured ? (
                      <span className="text-[11px] bg-purple-50 text-purple-700 font-semibold px-2 py-0.5 rounded-md border border-purple-200 hidden sm:inline-block">
                        ✨ Kling AI Video
                      </span>
                    ) : didConfigured ? (
                      <span className="text-[11px] bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-md border border-blue-200 hidden sm:inline-block">
                        🎭 D-ID Facial Expressions Active
                      </span>
                    ) : (
                      <span className="text-[11px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-md border border-emerald-200 hidden sm:inline-block">
                        ⚡ Free Dynamic Motion ($0)
                      </span>
                    )}
                    {scenes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveScene(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                        title="Delete Scene"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Remove</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                  {/* Left: Drag & Drop / Click Upload Box */}
                  <div className="md:col-span-4 space-y-2">
                    <label className="text-[11px] font-semibold text-slate-700 block">
                      Scene Image:
                    </label>

                    <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-50 border-2 border-dashed border-slate-300 hover:border-slate-500 transition group flex flex-col items-center justify-center text-center p-2">
                      {previewSrc ? (
                        <>
                          <img
                            src={previewSrc}
                            alt="Uploaded scene"
                            className="w-full h-full object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveImage(idx);
                            }}
                            className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-black text-white p-1 rounded-md transition"
                            title="Remove image"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <div className="space-y-1 text-slate-400">
                          <ImageIcon className="w-7 h-7 mx-auto text-slate-400 group-hover:text-slate-600 transition" />
                          <span className="text-xs font-semibold text-slate-700 block">
                            {uploadingIdx === idx ? 'Uploading...' : 'Click to Upload Image'}
                          </span>
                          <span className="text-[10px] text-slate-400 block">Any character, animal, or scene</span>
                        </div>
                      )}

                      {!previewSrc && (
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingIdx === idx}
                          onChange={(e) => handleImageUpload(idx, e.target.files?.[0])}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      )}
                    </div>
                  </div>

                  {/* Right: Motion Prompt, Camera Motion, Narration & Subtitle */}
                  <div className="md:col-span-8 space-y-3">
                    {/* Camera Motion Style & Kling Status */}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[11px] font-bold text-slate-700">
                        Camera Motion:
                      </span>
                      <select
                        value={scene.motion_style || 'auto'}
                        onChange={(e) => handleSceneChange(idx, 'motion_style', e.target.value)}
                        className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-slate-800 focus:outline-none focus:border-purple-600 transition cursor-pointer"
                      >
                        <option value="auto">🎬 Auto Cinematic (Smart Director)</option>
                        <option value="zoom_in">🔍 Slow Push-In (Zoom In)</option>
                        <option value="zoom_out">🔎 Smooth Pull-Back (Zoom Out)</option>
                        <option value="pan_right">➡️ Cinematic Pan Right</option>
                        <option value="pan_left">⬅️ Cinematic Pan Left</option>
                        <option value="static">⏸️ Static Frame (No Camera Move)</option>
                      </select>
                    </div>

                    {/* Kling Motion Prompt */}
                    <div>
                      <label className="text-[11px] font-bold text-purple-900 block mb-1">
                        Kling AI Motion Prompt (Used when Kling Key is connected):
                      </label>
                      <textarea
                        rows={2}
                        value={scene.motion_prompt || ''}
                        onChange={(e) => handleSceneChange(idx, 'motion_prompt', e.target.value)}
                        placeholder="Describe character motion, camera moves, and expressions (e.g. Lion roars gently and smiles, camera pushes in)..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white transition leading-relaxed placeholder:text-slate-400 font-sans"
                      />
                    </div>

                    {/* Spoken Voiceover Narration */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Spoken Narration Script / Spoken Words:
                      </label>
                      <textarea
                        rows={2}
                        value={scene.narration || ''}
                        onChange={(e) => handleSceneChange(idx, 'narration', e.target.value)}
                        placeholder="Words spoken by character or narrator during this scene..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800 focus:bg-white transition leading-relaxed placeholder:text-slate-400 font-sans"
                      />
                    </div>

                    {/* Subtitle */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        On-Screen Subtitle:
                      </label>
                      <input
                        type="text"
                        value={scene.subtitle || ''}
                        onChange={(e) => handleSceneChange(idx, 'subtitle', e.target.value)}
                        placeholder="Subtitle text to display at bottom of screen..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800 focus:bg-white transition placeholder:text-slate-400 font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add Scene Button */}
          <button
            type="button"
            onClick={handleAddScene}
            className="w-full py-4 border-2 border-dashed border-slate-300 hover:border-purple-500 hover:bg-purple-50/40 rounded-2xl text-xs font-bold text-slate-700 hover:text-purple-700 flex items-center justify-center gap-2 transition cursor-pointer shadow-sm active:scale-[0.99]"
          >
            <Plus className="w-4 h-4 text-purple-600" />
            <span>+ Add Another Scene</span>
          </button>
        </div>
      </div>
    </div>
  );
}
