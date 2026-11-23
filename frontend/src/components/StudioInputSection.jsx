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
  Sliders,
  Globe,
  X,
  FileSpreadsheet,
  Film,
  Compass,
  User,
  Info
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
  const [activeTab, setActiveTab] = useState('file'); // 'file' | 'google' | 'script' | 'prompt'
  const [topicPrompt, setTopicPrompt] = useState('');
  const [scriptText, setScriptText] = useState('');
  const [googleUrl, setGoogleUrl] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);

  // Character & Environment Customizer
  const [customCharacter, setCustomCharacter] = useState('');
  const [customEnvironment, setCustomEnvironment] = useState('');
  const [showAdvancedDesign, setShowAdvancedDesign] = useState(false);

  // Reference Audio State
  const [referenceAudioFile, setReferenceAudioFile] = useState(null);
  const [referenceAudioUrl, setReferenceAudioUrl] = useState(null);
  const [referenceAudioName, setReferenceAudioName] = useState(null);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentNotice, setCurrentNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);

  const samplePrompts = [
    { label: 'Baby Sensory Play', prompt: 'Baby mirror sensory play with smiles, pineapple smell, and hand clapping' },
    { label: 'Science / Gravity', prompt: 'A physicist demonstrating planetary gravity and orbits in space' },
    { label: 'Nature / Botany', prompt: 'How green plant leaves turn sunlight into food through photosynthesis' },
    { label: 'Character Story', prompt: 'A cheerful chef baking a chocolate cake in a sunny rustic kitchen' }
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
    if (activeTab === 'file' && !uploadedFile) {
      setErrorMsg('Please select or drag in a document file (PDF, Word, Excel, CSV, or Text).');
      return;
    }
    if (activeTab === 'google' && !googleUrl.trim()) {
      setErrorMsg('Please enter a valid Google Docs or Google Sheets share link.');
      return;
    }
    if (activeTab === 'script' && !scriptText.trim()) {
      setErrorMsg('Please write or paste your script content first.');
      return;
    }
    if (activeTab === 'prompt' && !topicPrompt.trim()) {
      setErrorMsg('Please enter a topic prompt or choose one of the ideas above.');
      return;
    }

    setIsGenerating(true);
    setCurrentNotice('Analyzing script content & structuring scene segments...');

    try {
      const formData = new FormData();
      formData.append('design_style', selectedDesignStyle || 'pixar_3d');
      formData.append('custom_character', customCharacter);
      formData.append('custom_environment', customEnvironment);
      formData.append('voice', selectedVoice || 'Reference Voice Clone (100% Match)');
      formData.append('background_music', selectedMusic || 'inspiring_educational');

      if (activeTab === 'file' && uploadedFile) {
        formData.append('input_mode', 'document');
        formData.append('file', uploadedFile);
      } else if (activeTab === 'google') {
        formData.append('input_mode', 'google_url');
        formData.append('live_url', googleUrl.trim());
      } else if (activeTab === 'script') {
        formData.append('input_mode', 'script');
        formData.append('script_text', scriptText);
      } else {
        formData.append('input_mode', 'prompt');
        formData.append('topic_prompt', topicPrompt);
      }

      setCurrentNotice('Designing cinematic 16:9 visual prompts & camera framing...');

      const response = await fetch('/api/v1/studio/create-storyboard', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error (${response.status})`);
      }

      setCurrentNotice('Synthesizing initial keyframe renders...');
      const data = await response.json();

      if (data && data.scenes) {
        onStoryboardGenerated(data);
      } else {
        throw new Error('Received invalid storyboard response from server.');
      }
    } catch (err) {
      console.error('Storyboard generation error:', err);
      setErrorMsg(err.message || 'Failed to generate storyboard. Please verify your file or input format.');
    } finally {
      setIsGenerating(false);
      setCurrentNotice('');
    }
  };

  const scriptWordCount = scriptText.trim() ? scriptText.trim().split(/\s+/).length : 0;
  const estimatedSeconds = Math.round(scriptWordCount / 2.5);

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_20px_-4px_rgba(0,0,0,0.03)] space-y-6">
      {/* Studio Section Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
              Step 01
            </span>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Script Ingestion & Storyboard Setup
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Upload any document, spreadsheet, live Google link, or paste a script. The system automatically segments it into timed scenes.
          </p>
        </div>

        {/* Input Source Segmented Switcher */}
        <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 text-xs font-semibold flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('file')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition ${
              activeTab === 'file'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-indigo-600" />
            <span>Upload File</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('google')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition ${
              activeTab === 'google'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-sky-600" />
            <span>Google Docs / Sheets</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('script')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition ${
              activeTab === 'script'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-slate-600" />
            <span>Paste Script</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('prompt')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition ${
              activeTab === 'prompt'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Topic Prompt</span>
          </button>
        </div>
      </div>

      {/* Primary Input Container */}
      <div>
        {/* TAB 1: File Upload (PDF, Word, Excel, CSV, TXT) */}
        {activeTab === 'file' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-slate-800">
                Source Document or Spreadsheet File
              </label>
              <span className="text-slate-400 font-mono text-[11px]">
                Supports PDF • Word (.docx) • Excel (.xlsx) • CSV • TXT
              </span>
            </div>

            <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/70 hover:bg-indigo-50/20 rounded-xl p-8 text-center transition cursor-pointer relative group">
              <input
                type="file"
                accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.md"
                onChange={handleDocFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <FileUp className="w-10 h-10 text-indigo-600 mx-auto mb-2.5 group-hover:scale-105 transition-transform" />

              {uploadedFile ? (
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-3.5 py-1.5 rounded-lg text-indigo-900 text-xs font-semibold shadow-xs">
                    <span>{uploadedFile.name}</span>
                    <span className="text-[10px] text-indigo-600 font-mono">
                      ({(uploadedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Click or drag a new file to replace</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-800">
                    Drag and drop your file here, or click to browse
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Upload lesson plans, syllabus PDFs, spreadsheet row scripts, or text notes up to 25MB
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Live Google Docs & Google Sheets Link */}
        {activeTab === 'google' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-slate-800 flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-sky-600" />
                <span>Google Docs or Google Sheets URL</span>
              </label>
              <span className="text-[11px] font-mono text-emerald-600 font-semibold">
                Direct Cloud Sync Supported
              </span>
            </div>

            <div className="space-y-2">
              <input
                type="url"
                value={googleUrl}
                onChange={(e) => setGoogleUrl(e.target.value)}
                placeholder="https://docs.google.com/document/d/... or https://docs.google.com/spreadsheets/d/..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition font-mono"
              />
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span>Make sure sharing in Google Drive is set to <strong>"Anyone with the link can view"</strong> for direct syncing.</span>
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: Paste Script */}
        {activeTab === 'script' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-slate-800">
                Spoken Narration Script or Story Transcript
              </label>
              <span className="text-[11px] font-mono text-slate-500 font-medium">
                {scriptWordCount} words {estimatedSeconds > 0 && `• ~${estimatedSeconds}s estimated speech`}
              </span>
            </div>
            <textarea
              rows={5}
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              placeholder="Paste or write your full script here. You can format it into scenes (e.g., 'Scene 1: Introduction') or paste a continuous narrative, and the system will automatically break it down into clean video scenes..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition leading-relaxed font-mono"
            />
          </div>
        )}

        {/* TAB 4: Topic Prompt */}
        {activeTab === 'prompt' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">
                Video Topic, Idea, or Creative Narrative
              </label>
              <input
                type="text"
                value={topicPrompt}
                onChange={(e) => setTopicPrompt(e.target.value)}
                placeholder="e.g. Baby mirror sensory play, or A puppy walking in the park and barking, or How gravity works..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
              />
            </div>

            {/* Quick Starter Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-semibold text-slate-500 mr-1">Quick ideas:</span>
              {samplePrompts.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setTopicPrompt(item.prompt)}
                  className="text-[11px] bg-slate-100/80 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 text-slate-700 px-3 py-1 rounded-lg transition"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Visual Art Direction & Styles */}
      <div className="space-y-3 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Visual Art Style
            </h3>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvancedDesign(!showAdvancedDesign)}
            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 transition"
          >
            <Sliders className="w-3 h-3" />
            <span>{showAdvancedDesign ? 'Hide Character & Setting' : 'Custom Character & Setting'}</span>
          </button>
        </div>

        {/* Visual Style Selection Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {[
            { id: 'pixar_3d', name: '3D Pixar Animation', tag: 'Vibrant 3D' },
            { id: 'cinematic_realistic', name: 'Cinematic Realism', tag: '35mm Film' },
            { id: 'anime_ghibli', name: 'Studio Ghibli Anime', tag: 'Hand-drawn' },
            { id: 'claymation', name: 'Claymation Stop-Motion', tag: 'Tactile 3D' },
            { id: 'storybook_watercolor', name: 'Vintage Watercolor', tag: 'Storybook' },
            { id: 'cyberpunk_scifi', name: 'Futuristic Sci-Fi', tag: 'Volumetric' }
          ].map((style) => {
            const isSelected = selectedDesignStyle === style.id;
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => onSelectDesignStyle(style.id)}
                className={`p-3 rounded-xl border text-left transition relative ${
                  isSelected
                    ? 'bg-indigo-50/70 border-indigo-600 text-indigo-950 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50/50'
                }`}
              >
                <div className="text-xs font-bold mb-0.5">{style.name}</div>
                <div className="text-[10px] font-mono text-slate-400 font-medium">{style.tag}</div>
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-indigo-600 absolute top-2.5 right-2.5"></span>
                )}
              </button>
            );
          })}
        </div>

        {/* Collapsible Advanced Character & Environment Anchors */}
        {showAdvancedDesign && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 bg-slate-50 border border-slate-200 rounded-xl animate-in fade-in duration-150">
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                <span>Character Anchor (Optional)</span>
              </label>
              <input
                type="text"
                value={customCharacter}
                onChange={(e) => setCustomCharacter(e.target.value)}
                placeholder="Auto-detected from script, or specify (e.g. Caring mother and cute baby, brave pirate)"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 transition"
              />
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                <Compass className="w-3.5 h-3.5 text-indigo-600" />
                <span>Environment & Setting (Optional)</span>
              </label>
              <input
                type="text"
                value={customEnvironment}
                onChange={(e) => setCustomEnvironment(e.target.value)}
                placeholder="Auto-detected from script, or specify (e.g. Warm sunlit nursery with floor mirror, island beach)"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 transition"
              />
            </div>
          </div>
        )}
      </div>

      {/* Voice & Soundtrack Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-4 border-t border-slate-100">
        {/* Voiceover Actor & Reference Clone */}
        <div className="lg:col-span-7 bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Voiceover Engine
              </h3>
            </div>
            {referenceAudioUrl && (
              <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Custom Reference Loaded
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            {/* Voice Preset Dropdown */}
            <div className="sm:col-span-7 space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 block">
                Voice Actor Preset
              </label>
              <select
                value={selectedVoice}
                onChange={(e) => onSelectVoice(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-600 transition shadow-2xs"
              >
                {referenceAudioUrl && (
                  <option value={selectedVoice}>
                    ★ {referenceAudioName ? `Cloned Voice (${referenceAudioName})` : 'My Uploaded Voice'}
                  </option>
                )}
                {voices.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.locale || 'Studio AI'})
                  </option>
                ))}
              </select>
            </div>

            {/* Reference Voice File Upload Button */}
            <div className="sm:col-span-5 space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 block">
                Clone Your Own Voice (.mp3/.wav)
              </label>
              <label className="flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 border border-dashed border-slate-300 hover:border-indigo-400 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer transition shadow-2xs">
                {isUploadingAudio ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="truncate">
                      {referenceAudioName ? 'Replace Voice File' : 'Upload Audio'}
                    </span>
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
          </div>

          {/* Audio Preview Player if loaded */}
          {referenceAudioUrl && (
            <div className="pt-1">
              <audio
                controls
                src={referenceAudioUrl}
                className="w-full h-8 rounded-lg"
              />
            </div>
          )}
        </div>

        {/* Background Music Score */}
        <div className="lg:col-span-5 bg-slate-50/70 border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Soundtrack & Audio Ducking
              </h3>
            </div>
            <p className="text-[11px] text-slate-500">
              Music automatically lowers by <strong>-14dB</strong> during speech so narration stays distinct and crystal clear.
            </p>
          </div>

          <div>
            <select
              value={selectedMusic}
              onChange={(e) => onSelectMusic(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-600 transition shadow-2xs"
            >
              {musicTracks.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.description}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error Notice */}
      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Primary Action Button Bar */}
      <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-slate-500 flex items-center gap-2">
          {isGenerating ? (
            <span className="flex items-center gap-2 text-indigo-600 font-semibold animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              {currentNotice}
            </span>
          ) : (
            <span>
              Generates structured scene cards, narration timings, and high-res keyframes for your review.
            </span>
          )}
        </div>

        <button
          type="button"
          disabled={isGenerating}
          onClick={handleGenerateStoryboard}
          className={`w-full sm:w-auto px-7 py-3 rounded-xl text-xs font-bold text-white transition flex items-center justify-center gap-2 shadow-sm ${
            isGenerating
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-indigo-200 hover:shadow-md'
          }`}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating Storyboard...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Generate Storyboard & Keyframes</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
