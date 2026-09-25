"use client";
import React, { useEffect, useState, useRef } from 'react';
import { STRINGS } from '../../../utils/strings/en';
import { DashboardController, AgentItem } from '../../../controllers/dashboard.controller';
import { API_ENDPOINTS } from '../../../utils/api_endpoints';

interface VoiceOption {
  id: string;
  voice_id: string;
  name: string;
  type: string;
  provider: string;
  previewText?: string;
}

// Curated Cartesia Sonic voices matching user persona requirements and screenshots
const INITIAL_CARTESIA_VOICES: VoiceOption[] = [
  {
    id: 'sarah',
    voice_id: 'a0e99841-438c-4a64-b679-ae501e7d6091',
    name: 'Sarah',
    type: 'Warm Female',
    provider: 'Cartesia Sonic',
    previewText: 'Hello, thank you for calling. How can I assist you with scheduling today?',
  },
  {
    id: 'marcus',
    voice_id: '69267136-1bdc-4103-a11a-70e503b82412',
    name: 'Marcus',
    type: 'Professional Male',
    provider: 'Cartesia Sonic',
    previewText: 'Good morning! I am here to help you manage doctor appointments and clinical inquiries.',
  },
  {
    id: 'emma',
    voice_id: '25b902d8-21d9-482a-a922-2619058448f7',
    name: 'Emma',
    type: 'Young Female',
    provider: 'Cartesia Sonic',
    previewText: 'Hi there! Welcome to our clinic. What date and time works best for your visit?',
  },
  {
    id: 'james',
    voice_id: 'e5da3c22-b5ff-4be5-94be-b4dbf4228965',
    name: 'James',
    type: 'Deep Male',
    provider: 'Cartesia Sonic',
    previewText: 'Welcome. I am your clinic virtual receptionist. Please let me know how I may help you.',
  },
];

export function VoiceTab() {
  const content = STRINGS.DASHBOARD.COMPONENTS.AI_TABS_CONTENT.VOICE;

  const [provider, setProvider] = useState('cartesia');
  const [voices, setVoices] = useState<VoiceOption[]>(INITIAL_CARTESIA_VOICES);
  const [selectedVoiceId, setSelectedVoiceId] = useState('a0e99841-438c-4a64-b679-ae501e7d6091');
  const [speed, setSpeed] = useState(1.0);
  const [pitch, setPitch] = useState(0);
  const [greeting, setGreeting] = useState('');
  
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // 1. Fetch available voices dynamically from Cartesia API (just like onboarding!)
    DashboardController.getVoices()
      .then((data: any) => {
        const voicesArr = Array.isArray(data?.voices) ? data.voices : (data?.voices?.data || []);
        if (voicesArr && Array.isArray(voicesArr) && voicesArr.length > 0) {
          const apiFormatted: VoiceOption[] = voicesArr.map((v: any) => ({
            id: v.id,
            voice_id: v.id,
            name: v.name || 'Voice',
            type: `${v.language || 'English'} • ${v.description || 'Natural Voice'}`,
            provider: 'Cartesia Sonic',
            previewText: 'Hello, thank you for calling. How can I assist you today?',
          }));

          // Merge: ensure standard Sarah/Marcus/Emma/James are prioritized and dynamic voices appended
          const merged = [...INITIAL_CARTESIA_VOICES];
          apiFormatted.forEach((apiV) => {
            if (!merged.some((m) => m.voice_id === apiV.voice_id || m.id === apiV.id)) {
              merged.push(apiV);
            }
          });
          setVoices(merged);
        }
      })
      .catch((err) => console.warn('Failed to fetch dynamic Cartesia voices:', err));

    // 2. Fetch Agent's configured settings
    DashboardController.getAgent()
      .then((agent: AgentItem) => {
        if (agent) {
          if (agent.voice_provider) setProvider(agent.voice_provider);
          if (agent.greeting_message) setGreeting(agent.greeting_message);

          const ttsCfg = agent.config?.tts_provider || {};
          if (ttsCfg.voice_id) {
            setSelectedVoiceId(ttsCfg.voice_id);
          } else if (agent.voice_model && agent.voice_model !== 'default') {
            setSelectedVoiceId(agent.voice_model);
          }
          
          if (agent.config?.voice_settings?.speed !== undefined) {
            const rawSpeed = agent.config.voice_settings.speed;
            setSpeed(typeof rawSpeed === 'number' && rawSpeed > 5 ? rawSpeed / 50 : rawSpeed || 1.0);
          }
          if (agent.config?.voice_settings?.pitch !== undefined) {
            const rawPitch = agent.config.voice_settings.pitch;
            setPitch(typeof rawPitch === 'number' && rawPitch > 10 ? Math.round((rawPitch - 50) / 10) : rawPitch || 0);
          }
        }
      })
      .catch((err) => console.warn('Failed to load agent voice config:', err))
      .finally(() => setLoading(false));

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlayPreview = (voice: VoiceOption, e: React.MouseEvent) => {
    e.stopPropagation();

    // Toggle pause if currently playing this voice
    if (playingVoiceId === voice.voice_id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingVoiceId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const previewText = greeting || voice.previewText || 'Hello, thank you for calling. How can I help you today?';
    const previewUrl = `${API_ENDPOINTS.VOICE.PREVIEW}?voice_id=${encodeURIComponent(voice.voice_id)}&text=${encodeURIComponent(previewText)}`;
    const audio = new Audio(previewUrl);
    audioRef.current = audio;

    setPlayingVoiceId(voice.voice_id);

    audio.play().catch((err) => {
      console.warn('Audio playback error:', err);
      setPlayingVoiceId(null);
    });

    audio.onended = () => {
      setPlayingVoiceId(null);
      audioRef.current = null;
    };
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveSuccess(false);

      const matchedVoice = voices.find((v) => v.voice_id === selectedVoiceId) || voices[0];

      await DashboardController.updateAgent({
        voice_provider: provider,
        voice_model: selectedVoiceId,
        config: {
          tts_provider: {
            voice_id: selectedVoiceId,
            voice_name: matchedVoice.name,
            provider: provider,
          },
          voice_settings: {
            speed: Math.round(speed * 50),
            pitch: pitch * 10 + 50,
          },
        },
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save voice settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl p-8 shadow-xs flex items-center justify-center min-h-[300px]">
        <div className="w-6 h-6 border-2 border-[#0066FF]/20 border-t-[#0066FF] rounded-full animate-spin mr-3"></div>
        <span className="text-xs text-gray-500 font-medium">Loading voice models & synthesizers...</span>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 bg-white border border-gray-100 rounded-xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
      <style>{`
        @keyframes audio-wave {
          0%, 100% { height: 4px; }
          50% { height: 14px; }
        }
        .wave-bar {
          animation: audio-wave 0.8s ease-in-out infinite;
        }
      `}</style>
      
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-bold text-gray-900">Voice &amp; TTS Configuration</h2>
          {saveSuccess && (
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 animate-in fade-in">
              ✓ Voice model saved to AI Receptionist!
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mb-5">Select the voice engine and persona for your AI Receptionist.</p>

        <div className="space-y-6">
          
          {/* Primary TTS Engine */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Primary TTS Engine</label>
            <div className="relative max-w-md">
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-xs font-medium text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] cursor-pointer"
              >
                <option value="cartesia">Cartesia Sonic (Ultra-Low Latency &lt;90ms)</option>
                <option value="elevenlabs">ElevenLabs (High Quality)</option>
              </select>
            </div>
          </div>

          {/* Voice Persona */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2.5">Voice Persona</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {voices.map((voice) => {
                const isSelected = selectedVoiceId === voice.voice_id;
                const isPlaying = playingVoiceId === voice.voice_id;
                return (
                  <div
                    key={voice.voice_id || voice.id}
                    onClick={() => setSelectedVoiceId(voice.voice_id)}
                    className={`border rounded-xl p-3 flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#0066FF] bg-[#F0F7FF] ring-1 ring-[#0066FF]'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={(e) => handlePlayPreview(voice, e)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xs ${
                          isPlaying
                            ? 'bg-[#0066FF] text-white animate-pulse'
                            : isSelected
                            ? 'bg-[#0066FF] text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        title="Listen to voice sample"
                      >
                        {isPlaying ? (
                          <div className="flex items-center gap-[2px] h-3">
                            <div className="w-[2px] bg-white rounded-full wave-bar" style={{ animationDelay: '0.0s' }}></div>
                            <div className="w-[2px] bg-white rounded-full wave-bar" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-[2px] bg-white rounded-full wave-bar" style={{ animationDelay: '0.4s' }}></div>
                          </div>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                          </svg>
                        )}
                      </button>
                      <div>
                        <div className="text-xs font-bold text-gray-900">{voice.name}</div>
                        <div className="text-[10px] font-medium text-gray-500">
                          {voice.type} • {voice.provider}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="text-[#0066FF]">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-700">Speaking Speed</label>
              </div>
              <input 
                type="range" 
                min="0.5" 
                max="1.5" 
                step="0.1"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0066FF]" 
              />
              <div className="flex justify-between mt-1 text-[10px] text-gray-400 font-medium">
                <span>Slow</span>
                <span className="text-gray-700 font-semibold">{speed.toFixed(1)}x</span>
                <span>Fast</span>
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-700">Pitch Correction</label>
              </div>
              <input 
                type="range" 
                min="-5" 
                max="5" 
                step="1"
                value={pitch}
                onChange={(e) => setPitch(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0066FF]" 
              />
              <div className="flex justify-between mt-1 text-[10px] text-gray-400 font-medium">
                <span>- 5</span>
                <span className="text-gray-700 font-semibold">{pitch === 0 ? 'Default' : pitch > 0 ? `+${pitch}` : `${pitch}`}</span>
                <span>+ 5</span>
              </div>
            </div>
          </div>

          <div className="pt-3 flex justify-end">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 bg-[#0066FF] text-white rounded-lg text-xs font-semibold shadow-xs hover:bg-[#0052cc] transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving && <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
              {isSaving ? 'Saving...' : 'Save Voice Settings'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
