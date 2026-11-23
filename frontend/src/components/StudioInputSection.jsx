import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  Upload,
  FileUp,
  Music,
  Mic,
  Palette,
  Volume2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Play,
  User,
  Compass,
  Sliders
} from 'lucide-react';

export default function StudioInputSection({
  onStoryboardGenerated,
  voices = [],
  selectedVoice,
  onSelectVoice,
  selectedMusic,
  onSelectMusic,
  musicTracks = [],
  designStyles = [],
  selectedDesignStyle,
  onSelectDesignStyle
}) {
  const [activeTab, setActiveTab] = useState('pdf'); // 'pdf' | 'script' | 'prompt'
  const [topicPrompt, setTopicPrompt] = useState('');
  const [scriptText, setScriptText] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);

  // Design Agent State
  const [customCharacter, setCustomCharacter] = useState('Friendly teacher Leo with expressive warm smile, wearing navy blue vest');
  const [customEnvironment, setCustomEnvironment] = useState('Modern colorful science classroom with glowing interactive holograms');
  const [showAdvancedDesign, setShowAdvancedDesign] = useState(false);

  // Voice Agent Reference Audio State
  const [referenceAudioFile, setReferenceAudioFile] = useState(null);
  const [referenceAudioUrl, setReferenceAudioUrl] = useState(null);
  const [referenceAudioName, setReferenceAudioName] = useState(null);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentAgentNotice, setCurrentAgentNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);

  const samplePrompts = [
    'Photosynthesis for Grade 5 with 3D Pixar Animation',
    'How Solar Panels Turn Sunlight into Electricity',
    'Journey Inside the Human Cell & DNA',
    'The Water Cycle & Cloud Formation'
  ];

  const handleDocFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
      setErrorMsg(null);
    }
  };

  const handleReferenceAudioUpload = async (e) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setIsUploadingAudio(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/v1/studio/upload-reference-audio', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Failed to upload reference audio');

      const data = await res.json();
      setReferenceAudioFile(file);
      setReferenceAudioUrl(data.preview_url);
      setReferenceAudioName(file.name);

      // Select this uploaded audio as active voice
      onSelectVoice(data.voice_id);
    } catch (err) {
      console.error('Audio upload error:', err);
      setErrorMsg(`Audio upload failed: ${err.message}`);
    } finally {
      setIsUploadingAudio(false);
    }
  };

  const handleGenerateStoryboard = async () => {
    setErrorMsg(null);

    // Validation
    if (activeTab === 'pdf' && !uploadedFile) {
      setErrorMsg('Please select or upload a PDF or text file first.');
      return;
    }
    if (activeTab === 'script' && !scriptText.trim()) {
      setErrorMsg('Please paste or write your script text first.');
      return;
    }
    if (activeTab === 'prompt' && !topicPrompt.trim()) {
      setErrorMsg('Please enter a topic prompt or choose one of the suggestions.');
      return;
    }

    setIsGenerating(true);
    setCurrentAgentNotice('📝 ScriptAgent: Parsing educational concepts & segmenting scenes...');

    try {
      const formData = new FormData();
      formData.append('input_mode', activeTab === 'pdf' ? 'document' : activeTab);
      formData.append('design_style', selectedDesignStyle || 'pixar_3d');
      formData.append('custom_character', customCharacter);
      formData.append('custom_environment', customEnvironment);
      formData.append('voice', selectedVoice || 'Reference Voice Clone (100% Match)');
      formData.append('background_music', selectedMusic || 'inspiring_educational');

      if (activeTab === 'pdf' && uploadedFile) {
        formData.append('file', uploadedFile);
      } else if (activeTab === 'script') {
        formData.append('script_text', scriptText);
      } else {
        formData.append('topic_prompt', topicPrompt);
      }

      setCurrentAgentNotice('🎨 DesignAgent: Composing 16:9 visual prompts & aesthetic framing...');

      const response = await fetch('/api/v1/studio/create-storyboard', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error (${response.status})`);
      }

      setCurrentAgentNotice('🖼️ ImageAgent: Rendering 16:9 images with FLUX AI...');
      const data = await response.json();

      if (data && data.scenes) {
        onStoryboardGenerated(data);
      } else {
        throw new Error('Received invalid storyboard response from server.');
      }
    } catch (err) {
      console.error('Storyboard generation error:', err);
      setErrorMsg(err.message || 'Failed to generate storyboard. Please try again.');
    } finally {
      setIsGenerating(false);
      setCurrentAgentNotice('');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 mb-8 space-y-6">
      {/* Studio Header & Agent Roster */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
            <h2 className="text-lg font-bold text-slate-900">
              1. Multi-Agent Production Studio
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Dedicated AI agents manage Scripting, Visual Design, Image Rendering, Voiceover, and Audio Ducking.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('pdf')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              activeTab === 'pdf'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload PDF / Doc</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('script')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              activeTab === 'script'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Paste Script</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('prompt')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              activeTab === 'prompt'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Topic / Prompt</span>
          </button>
        </div>
      </div>

      {/* Primary Input Tabs */}
      <div>
        {activeTab === 'pdf' && (
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700">
              Upload Educational PDF or Script File (.pdf, .txt)
            </label>
            <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/20 rounded-xl p-6 text-center transition cursor-pointer relative">
              <input
                type="file"
                accept=".pdf,.txt"
                onChange={handleDocFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <FileUp className="w-9 h-9 text-indigo-500 mx-auto mb-2" />
              {uploadedFile ? (
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-800">{uploadedFile.name}</p>
                  <p className="text-xs text-slate-500">
                    {(uploadedFile.size / 1024).toFixed(1)} KB — Click to replace
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-700">
                    Drag and drop your PDF syllabus, lecture notes, or script here
                  </p>
                  <p className="text-xs text-slate-400">
                    ScriptAgent will automatically extract and segment it into timed scenes
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'script' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                Paste Written Lecture, Dialogue, or Multi-Scene Script
              </label>
              <span className="text-[11px] text-slate-400">
                ScriptAgent detects Scene 1, Scene 2 or splits by paragraph
              </span>
            </div>
            <textarea
              rows={5}
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              placeholder="Paste your script here... For example:&#10;&#10;Scene 1: Introduction&#10;Hello everyone! Today we will discover how green plants produce energy through photosynthesis...&#10;&#10;Scene 2: Inside the Chloroplast&#10;Inside plant leaves, chloroplasts capture sunlight and convert water into glucose..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            />
          </div>
        )}

        {activeTab === 'prompt' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Educational Topic or Creative Idea
              </label>
              <input
                type="text"
                value={topicPrompt}
                onChange={(e) => setTopicPrompt(e.target.value)}
                placeholder="e.g. Photosynthesis for grade 5 in 3D Pixar animation style with teacher Leo"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {samplePrompts.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setTopicPrompt(p)}
                  className="text-[11px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 transition text-left"
                >
                  💡 {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* DESIGN INPUT SECTION (Managed by DesignAgent) */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50/50 to-indigo-50/50 border border-purple-100 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-purple-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              🎨 Design Agent: Visual Art Style & Setting
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowAdvancedDesign(!showAdvancedDesign)}
            className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-1"
          >
            <Sliders className="w-3 h-3" />
            <span>{showAdvancedDesign ? 'Hide Design Details' : 'Customize Character & Setting'}</span>
          </button>
        </div>

        {/* Visual Style Preset Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { id: 'pixar_3d', name: '🌟 3D Pixar / Disney' },
            { id: 'cinematic_realistic', name: '🎬 Cinematic Film' },
            { id: 'anime_ghibli', name: '🎌 Anime (Ghibli)' },
            { id: 'claymation', name: '🧸 Claymation 3D' },
            { id: 'storybook_watercolor', name: '🖌️ Storybook Art' },
            { id: 'cyberpunk_scifi', name: '🔮 Sci-Fi Cyberpunk' }
          ].map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={() => onSelectDesignStyle(style.id)}
              className={`p-2.5 rounded-xl text-xs font-semibold border text-center transition ${
                selectedDesignStyle === style.id
                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                  : 'bg-white hover:bg-purple-50/50 text-slate-700 border-slate-200'
              }`}
            >
              {style.name}
            </button>
          ))}
        </div>

        {/* Collapsible Advanced Character & Setting Customizer */}
        {showAdvancedDesign && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-purple-100">
            <div className="space-y-1">
              <label className="flex items-center gap-1 text-[11px] font-bold text-slate-700">
                <User className="w-3 h-3 text-purple-600" />
                <span>Character Design Anchor</span>
              </label>
              <input
                type="text"
                value={customCharacter}
                onChange={(e) => setCustomCharacter(e.target.value)}
                placeholder="e.g. Friendly teacher Leo with expressive warm smile, wearing navy vest"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-1 text-[11px] font-bold text-slate-700">
                <Compass className="w-3 h-3 text-purple-600" />
                <span>Visual Environment / Setting</span>
              </label>
              <input
                type="text"
                value={customEnvironment}
                onChange={(e) => setCustomEnvironment(e.target.value)}
                placeholder="e.g. Modern colorful science classroom with glowing interactive holograms"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* VOICE AGENT & REFERENCE AUDIO SECTION */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              🎙️ Voice Agent: Voiceover & Reference Audio
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Voice Selector */}
          <div className="md:col-span-6 space-y-1">
            <label className="text-[11px] font-bold text-slate-600 block">
              Select Voiceover Preset
            </label>
            <select
              value={selectedVoice}
              onChange={(e) => onSelectVoice(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {referenceAudioUrl && (
                <option value={selectedVoice}>
                  ⭐ {referenceAudioName ? `My Cloned Voice (${referenceAudioName})` : 'My Uploaded Reference Audio'}
                </option>
              )}
              {voices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.locale || 'Natural AI'})
                </option>
              ))}
            </select>
          </div>

          {/* Reference Audio Upload & Audio Player */}
          <div className="md:col-span-6 space-y-1">
            <label className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
              <span>Upload Reference Audio File (.mp3, .wav, .m4a)</span>
              {referenceAudioUrl && <span className="text-emerald-600 font-bold">✓ Audio Loaded</span>}
            </label>

            <div className="flex items-center gap-2">
              <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-dashed border-indigo-300 hover:border-indigo-500 rounded-xl text-xs font-semibold text-indigo-700 cursor-pointer shadow-sm transition">
                {isUploadingAudio ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing Audio...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>{referenceAudioName ? 'Replace Audio File' : 'Upload Reference Audio'}</span>
                  </>
                )}
                <input
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a"
                  onChange={handleReferenceAudioUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* In-Browser Audio Player to Listen & Get Audio */}
            {referenceAudioUrl && (
              <div className="pt-2">
                <audio
                  controls
                  src={referenceAudioUrl}
                  className="w-full h-8 rounded-lg"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MUSIC AGENT SECTION (Ducked background music) */}
      <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              🎵 Music Agent: Royalty-Free Score & Audio Ducking
            </h3>
          </div>
          <p className="text-[11px] text-slate-500">
            Music automatically lowers (ducks) by -18dB whenever the voice speaks, keeping narration crystal clear.
          </p>
        </div>

        <select
          value={selectedMusic}
          onChange={(e) => onSelectMusic(e.target.value)}
          className="w-full sm:w-64 bg-white border border-emerald-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {musicTracks.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} — {m.description}
            </option>
          ))}
        </select>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Primary Action Button */}
      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-slate-500">
          {isGenerating ? (
            <span className="flex items-center gap-2 text-indigo-600 font-semibold">
              <Loader2 className="w-4 h-4 animate-spin" />
              {currentAgentNotice}
            </span>
          ) : (
            <span>DirectorAgent coordinates all agents to draft your storyboard + FLUX images</span>
          )}
        </div>

        <button
          type="button"
          disabled={isGenerating}
          onClick={handleGenerateStoryboard}
          className={`w-full sm:w-auto px-7 py-3.5 rounded-xl text-xs font-bold text-white transition flex items-center justify-center gap-2 shadow-md ${
            isGenerating
              ? 'bg-slate-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-indigo-200'
          }`}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Agents Working...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>✨ Generate AI Storyboard & Images</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
