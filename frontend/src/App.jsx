import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import DirectorWorkspace from './components/DirectorWorkspace';
import ProductionMonitor from './components/ProductionMonitor';
import KlingApiKeyModal from './components/KlingApiKeyModal';

export default function App() {
  const [config, setConfig] = useState({
    title: '',
    voice: 'Reference Voice Clone (100% Match)',
    scenes: [
      {
        scene_number: 1,
        title: 'Scene 1',
        image_path: '',
        preview_url: '',
        motion_prompt: '',
        narration: '',
        subtitle: ''
      },
      {
        scene_number: 2,
        title: 'Scene 2',
        image_path: '',
        preview_url: '',
        motion_prompt: '',
        narration: '',
        subtitle: ''
      },
      {
        scene_number: 3,
        title: 'Scene 3',
        image_path: '',
        preview_url: '',
        motion_prompt: '',
        narration: '',
        subtitle: ''
      }
    ]
  });

  const [voices, setVoices] = useState([
    { id: 'Reference Voice Clone (100% Match)', name: 'Reference Voice Clone (100% Match)' },
    { id: 'en-IN-NeerjaNeural', name: 'Indian English (Neerja)' }
  ]);
  const [selectedVoice, setSelectedVoice] = useState('Reference Voice Clone (100% Match)');
  const [klingConfigured, setKlingConfigured] = useState(false);
  const [isKlingModalOpen, setIsKlingModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch custom config from backend
    fetch('/api/v1/custom/config')
      .then(res => res.json())
      .then(data => {
        if (data) {
          const loadedScenes = (data.scenes && data.scenes.length > 0)
            ? data.scenes
            : (data.demonstration_scenes && data.demonstration_scenes.length > 0)
              ? data.demonstration_scenes
              : null;

          if (loadedScenes) {
            setConfig(prev => ({
              ...prev,
              title: data.title || '',
              voice: data.voice || prev.voice,
              custom_voice_name: data.custom_voice_name || '',
              custom_voice_preview: data.custom_voice_preview || '',
              scenes: loadedScenes
            }));
          }
          if (data.voice) setSelectedVoice(data.voice);
        }
      })
      .catch(err => console.error('Error loading config:', err));

    // Fetch voices
    fetch('/api/v1/voices')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setVoices(data);
      })
      .catch(err => console.error('Error loading voices:', err));

    // Fetch Kling status
    fetch('/api/v1/kling/status')
      .then(res => res.json())
      .then(data => setKlingConfigured(data.configured))
      .catch(err => console.error('Error loading Kling status:', err));
  }, []);

  const handleVoiceSelect = (voiceId) => {
    setSelectedVoice(voiceId);
    setConfig(prev => ({ ...prev, voice: voiceId }));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      <Header
        klingConfigured={klingConfigured}
        onOpenKlingModal={() => setIsKlingModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        {loading ? (
          <div className="py-24 text-center text-slate-400 text-sm font-medium">
            Loading Studio...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 7 Columns: Blank Clean Inputs for Images and Prompts */}
            <section className="lg:col-span-7">
              <DirectorWorkspace
                config={config}
                onChangeConfig={setConfig}
                voices={voices}
                selectedVoice={selectedVoice}
                onSelectVoice={handleVoiceSelect}
              />
            </section>

            {/* Right 5 Columns: 1080p Video Player & Single Run Action */}
            <section className="lg:col-span-5">
              <ProductionMonitor
                config={config}
              />
            </section>
          </div>
        )}
      </main>

      <KlingApiKeyModal
        isOpen={isKlingModalOpen}
        onClose={() => setIsKlingModalOpen(false)}
        onConfigSaved={() => setKlingConfigured(true)}
      />

      <footer className="border-t border-slate-200 bg-white px-6 py-4 text-center text-xs text-slate-400">
        AI Explainer Video Studio
      </footer>
    </div>
  );
}
