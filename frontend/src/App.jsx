import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import StudioInputSection from './components/StudioInputSection';
import ApprovalBoard from './components/ApprovalBoard';
import ProductionMonitor from './components/ProductionMonitor';
import ReplicateApiKeyModal from './components/ReplicateApiKeyModal';

export default function App() {
  const [config, setConfig] = useState({
    title: 'New Video Project',
    voice: 'Reference Voice Clone (100% Match)',
    background_music: 'inspiring_educational',
    design_style: 'pixar_3d',
    scenes: []
  });

  const [voices, setVoices] = useState([
    { id: 'Reference Voice Clone (100% Match)', name: 'Reference Voice Clone', locale: 'Natural Voice Clone' },
    { id: 'en-IN-NeerjaNeural', name: 'Neerja', locale: 'Indian English Clear' },
    { id: 'en-US-JennyNeural', name: 'Jenny', locale: 'US English Warm' },
    { id: 'en-US-GuyNeural', name: 'Guy', locale: 'US English Clear' }
  ]);
  const [selectedVoice, setSelectedVoice] = useState('Reference Voice Clone (100% Match)');

  const [musicTracks, setMusicTracks] = useState([
    { id: 'inspiring_educational', name: 'Inspiring Acoustic', description: 'Uplifting warm acoustic background' },
    { id: 'gentle_lofi', name: 'Gentle Lofi Atmosphere', description: 'Smooth, relaxed ambient warmth' },
    { id: 'playful_curiosity', name: 'Playful Curiosity', description: 'Bright, cheerful learning atmosphere' },
    { id: 'none', name: 'No Soundtrack', description: 'Pure spoken voice only' }
  ]);
  const [selectedMusic, setSelectedMusic] = useState('inspiring_educational');

  const [designStyles, setDesignStyles] = useState([
    { id: 'pixar_3d', name: '3D Pixar Animation' },
    { id: 'cinematic_realistic', name: 'Cinematic Realism' },
    { id: 'anime_ghibli', name: 'Studio Ghibli Anime' },
    { id: 'claymation', name: 'Claymation Stop-Motion' },
    { id: 'storybook_watercolor', name: 'Vintage Watercolor' },
    { id: 'cyberpunk_scifi', name: 'Futuristic Sci-Fi' }
  ]);
  const [selectedDesignStyle, setSelectedDesignStyle] = useState('pixar_3d');

  const [replicateConfigured, setReplicateConfigured] = useState(false);
  const [groqConfigured, setGroqConfigured] = useState(false);
  const [isReplicateModalOpen, setIsReplicateModalOpen] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [jobId, setJobId] = useState(null);

  const approvalBoardRef = useRef(null);
  const productionMonitorRef = useRef(null);

  useEffect(() => {
    // 1. Fetch current saved config
    fetch('/api/v1/custom/config')
      .then(res => res.json())
      .then(data => {
        if (data && data.scenes && data.scenes.length > 0) {
          setConfig(data);
          if (data.voice) setSelectedVoice(data.voice);
          if (data.background_music) setSelectedMusic(data.background_music);
          if (data.design_style) setSelectedDesignStyle(data.design_style);
        }
      })
      .catch(err => console.error('Error loading config:', err));

    // 2. Fetch voices
    fetch('/api/v1/voices')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setVoices(data);
      })
      .catch(err => console.error('Error loading voices:', err));

    // 3. Fetch music tracks
    fetch('/api/v1/studio/music-tracks')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setMusicTracks(data);
      })
      .catch(err => console.error('Error loading music tracks:', err));

    // 4. Fetch design styles
    fetch('/api/v1/studio/design-styles')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setDesignStyles(data);
      })
      .catch(err => console.error('Error loading design styles:', err));

    // 5. Fetch Replicate status
    fetch('/api/v1/replicate/status')
      .then(res => res.json())
      .then(data => setReplicateConfigured(data.configured))
      .catch(err => console.error('Error loading Replicate status:', err));

    // 6. Fetch Groq AI status
    fetch('/api/v1/groq/status')
      .then(res => res.json())
      .then(data => setGroqConfigured(data.configured))
      .catch(err => console.error('Error loading Groq status:', err));
  }, []);

  const handleVoiceSelect = (voiceId) => {
    setSelectedVoice(voiceId);
    setConfig(prev => ({ ...prev, voice: voiceId }));
  };

  const handleMusicSelect = (musicId) => {
    setSelectedMusic(musicId);
    setConfig(prev => ({ ...prev, background_music: musicId }));
  };

  const handleDesignStyleSelect = (styleId) => {
    setSelectedDesignStyle(styleId);
    setConfig(prev => ({ ...prev, design_style: styleId }));
  };

  const handleStoryboardGenerated = (newStoryboardData) => {
    setConfig(newStoryboardData);
    if (newStoryboardData.voice) setSelectedVoice(newStoryboardData.voice);
    if (newStoryboardData.background_music) setSelectedMusic(newStoryboardData.background_music);
    if (newStoryboardData.design_style) setSelectedDesignStyle(newStoryboardData.design_style);

    // Scroll smoothly to approval board
    setTimeout(() => {
      if (approvalBoardRef.current) {
        approvalBoardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
  };

  const handleApproveAndRender = async () => {
    setIsRendering(true);

    try {
      // 1. Persist config
      await fetch('/api/v1/custom/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      // 2. Trigger generation
      const res = await fetch('/api/v1/custom/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (!res.ok) throw new Error('Failed to start video rendering job');

      const data = await res.json();
      setJobId(data.job_id);

      // Scroll to video monitor
      setTimeout(() => {
        if (productionMonitorRef.current) {
          productionMonitorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 200);
    } catch (err) {
      console.error('Error starting video production:', err);
      alert(`Could not start video generation: ${err.message}`);
      setIsRendering(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans">
      <Header
        replicateConfigured={replicateConfigured}
        groqConfigured={groqConfigured}
        onOpenReplicateModal={() => setIsReplicateModalOpen(true)}
      />

      <main className="flex-1 max-w-[1680px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Step 1: Input Studio */}
        <StudioInputSection
          onStoryboardGenerated={handleStoryboardGenerated}
          voices={voices}
          selectedVoice={selectedVoice}
          onSelectVoice={handleVoiceSelect}
          musicTracks={musicTracks}
          selectedMusic={selectedMusic}
          onSelectMusic={handleMusicSelect}
          designStyles={designStyles}
          selectedDesignStyle={selectedDesignStyle}
          onSelectDesignStyle={handleDesignStyleSelect}
        />

        {/* 2-Column Section: Left = Approval Board, Right = Production Monitor / 1080p Player */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left 7-8 Columns: Interactive Approval Board */}
          <section ref={approvalBoardRef} className="lg:col-span-7 xl:col-span-8">
            <ApprovalBoard
              config={config}
              onChangeConfig={setConfig}
              onApproveAndRender={handleApproveAndRender}
              isRendering={isRendering}
              musicTracks={musicTracks}
              voices={voices}
            />
          </section>

          {/* Right 4-5 Columns: Sticky 1080p Video Player & Production Progress */}
          <section ref={productionMonitorRef} className="lg:col-span-5 xl:col-span-4 sticky top-20">
            <ProductionMonitor
              config={config}
              externalJobId={jobId}
              onRenderingFinished={() => setIsRendering(false)}
            />
          </section>
        </div>
      </main>

      <ReplicateApiKeyModal
        isOpen={isReplicateModalOpen}
        onClose={() => setIsReplicateModalOpen(false)}
        onConfigSaved={() => setReplicateConfigured(true)}
      />

      <footer className="border-t border-slate-200/90 bg-white px-6 py-4 text-center text-xs text-slate-400 mt-12">
        VideoStudio Motion • 1080p Cinematic Multi-Scene Production
      </footer>
    </div>
  );
}
