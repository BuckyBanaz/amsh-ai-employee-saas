"use client";
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { DashboardController, AgentItem } from '../../../controllers/dashboard.controller';
import { API_ENDPOINTS } from '../../../utils/api_endpoints';
import { StorageService } from '../../../services/storage.service';
import {
  VoiceOption,
  AVAILABLE_VOICES,
  getVoiceDescription,
  getVoicePreviewText,
} from '../ai-studio/ChooseVoiceModal';

const ACCENT_GROUPS = [
  {
    region: 'India & South Asia',
    accents: [
      { code: 'hi-IN', label: 'Hindi / Hinglish', flag: '🇮🇳', speechLang: 'hi-IN' },
      { code: 'en-IN', label: 'Indian English', flag: '🇮🇳', speechLang: 'en-IN' },
      { code: 'pa-IN', label: 'Punjabi Accent', flag: '🇮🇳', speechLang: 'pa-IN' },
      { code: 'bn-IN', label: 'Bengali Accent', flag: '🇮🇳', speechLang: 'bn-IN' },
    ],
  },
  {
    region: 'Global & International',
    accents: [
      { code: 'en-US', label: 'American English (US)', flag: '🇺🇸', speechLang: 'en-US' },
      { code: 'en-GB', label: 'British English (UK)', flag: '🇬🇧', speechLang: 'en-GB' },
      { code: 'es-ES', label: 'Spanish (Castilian)', flag: '🇪🇸', speechLang: 'es-ES' },
      { code: 'de-DE', label: 'German (Standard)', flag: '🇩🇪', speechLang: 'de-DE' },
      { code: 'nl-NL', label: 'Dutch (Netherlands)', flag: '🇳🇱', speechLang: 'nl-NL' },
    ],
  },
];

export function VoiceTab() {
  const [provider, setProvider] = useState('cartesia');
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('f8f5f1b2-f02d-4d8e-a40d-fd850a487b3d'); // Kiara: Indian-accent default (was American Skylar)
  const [selectedAccentCode, setSelectedAccentCode] = useState<string>('hi-IN');
  const [speed, setSpeed] = useState(1.0);
  const [pitch, setPitch] = useState(0);

  const [genderFilter, setGenderFilter] = useState<'All' | 'Female' | 'Male'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Business vertical awareness (e.g. restaurant vs clinic vs salon)
  const business = StorageService.getBusiness();
  const currentVertical = (business?.vertical || 'clinic').toLowerCase();
  const verticalDisplayName = currentVertical.includes('rest')
    ? 'Restaurant'
    : currentVertical.includes('salon') || currentVertical.includes('spa')
    ? 'Salon & Spa'
    : currentVertical.includes('clinic') || currentVertical.includes('health') || currentVertical.includes('doctor')
    ? 'Clinical Care'
    : 'Business Reception';

  // Load existing agent configuration from DB
  useEffect(() => {
    DashboardController.getAgent()
      .then((agent: AgentItem) => {
        if (agent) {
          if (agent.voice_provider) setProvider(agent.voice_provider);

          // 1. Restore exact saved voice from DB
          const ttsCfg = agent.config?.tts_provider || {};
          if (agent.voice_model && agent.voice_model !== 'default') {
            setSelectedVoiceId(agent.voice_model);
          } else if (ttsCfg.voice_id) {
            setSelectedVoiceId(ttsCfg.voice_id);
          } else if (ttsCfg.voice_name) {
            const found = AVAILABLE_VOICES.find(
              (v) => v.name.toLowerCase() === ttsCfg.voice_name.toLowerCase()
            );
            if (found) setSelectedVoiceId(found.voice_id);
          }

          // 2. Restore exact saved accent from DB
          if (agent.config?.accent) {
            setSelectedAccentCode(agent.config.accent);
          } else if (agent.config?.stt?.language) {
            setSelectedAccentCode(agent.config.stt.language);
          } else if (agent.primary_language) {
            const lang = agent.primary_language.toLowerCase();
            if (lang.includes('hi')) setSelectedAccentCode('hi-IN');
            else if (lang.includes('pa')) setSelectedAccentCode('pa-IN');
            else if (lang.includes('bn')) setSelectedAccentCode('bn-IN');
            else if (lang.includes('es')) setSelectedAccentCode('es-ES');
            else if (lang.includes('de')) setSelectedAccentCode('de-DE');
            else if (lang.includes('nl')) setSelectedAccentCode('nl-NL');
            else setSelectedAccentCode('en-IN');
          }

          // 3. Sliders
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

  // Filter available voices based on gender & search query
  const filteredVoices = useMemo(() => {
    return AVAILABLE_VOICES.filter((voice) => {
      const matchGender = genderFilter === 'All' || voice.gender === genderFilter;
      const matchSearch =
        searchQuery === '' ||
        voice.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        voice.accent.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getVoiceDescription(voice, currentVertical).toLowerCase().includes(searchQuery.toLowerCase());
      return matchGender && matchSearch;
    });
  }, [genderFilter, searchQuery, currentVertical]);

  // Instant Auto-Save Voice Selection to DB
  const saveVoiceToDb = async (voice: VoiceOption) => {
    setSelectedVoiceId(voice.voice_id);
    try {
      setSaveFeedback(`Saving ${voice.name}...`);
      await DashboardController.updateAgent({
        voice_model: voice.voice_id,
        voice_provider: provider,
        config: {
          tts_provider: {
            provider: provider,
            voice_id: voice.voice_id,
            voice_name: voice.name,
            accent: voice.accent,
            language: selectedAccentCode.slice(0, 2),
          },
        },
      });
      setSaveFeedback(`✓ ${voice.name} auto-saved to DB!`);
      setTimeout(() => setSaveFeedback(null), 3000);
    } catch (err) {
      console.error('Failed to auto-save voice to DB:', err);
      setSaveFeedback('Save error');
      setTimeout(() => setSaveFeedback(null), 3000);
    }
  };

  // Instant Auto-Save Accent Selection to DB
  const saveAccentToDb = async (accentCode: string) => {
    setSelectedAccentCode(accentCode);
    const selectedObj = ACCENT_GROUPS.flatMap((g) => g.accents).find((a) => a.code === accentCode);
    try {
      setSaveFeedback(`Saving ${selectedObj?.label || accentCode}...`);
      await DashboardController.updateAgent({
        primary_language: accentCode.slice(0, 2),
        config: {
          accent: accentCode,
          stt: {
            language: accentCode,
          },
          tts_provider: {
            language: accentCode.slice(0, 2),
          },
        },
      });
      setSaveFeedback(`✓ ${selectedObj?.label || 'Accent'} auto-saved to DB!`);
      setTimeout(() => setSaveFeedback(null), 3000);
    } catch (err) {
      console.error('Failed to auto-save accent to DB:', err);
      setSaveFeedback('Save error');
      setTimeout(() => setSaveFeedback(null), 3000);
    }
  };

  // Play Speech Preview with vertical-tailored dialogue
  const handlePlayPreview = (voice: VoiceOption, e: React.MouseEvent) => {
    e.stopPropagation();

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

    const sampleText = getVoicePreviewText(voice, currentVertical);
    const langPrefix = selectedAccentCode.slice(0, 2);
    const previewUrl = `${API_ENDPOINTS.VOICE.PREVIEW}?voice_id=${encodeURIComponent(
      voice.voice_id
    )}&text=${encodeURIComponent(sampleText)}&language=${encodeURIComponent(langPrefix)}`;
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

    audio.onerror = () => {
      setPlayingVoiceId(null);
      audioRef.current = null;
    };
  };

  // Explicit Save for Sliders & Full Config
  const handleSaveAll = async () => {
    try {
      setIsSaving(true);
      const activeVoice = AVAILABLE_VOICES.find((v) => v.voice_id === selectedVoiceId) || AVAILABLE_VOICES[0];

      await DashboardController.updateAgent({
        voice_provider: provider,
        voice_model: selectedVoiceId,
        primary_language: selectedAccentCode.slice(0, 2),
        config: {
          accent: selectedAccentCode,
          tts_provider: {
            voice_id: selectedVoiceId,
            voice_name: activeVoice.name,
            provider: provider,
            accent: activeVoice.accent,
            language: selectedAccentCode.slice(0, 2),
          },
          stt: {
            language: selectedAccentCode,
          },
          voice_settings: {
            speed: Math.round(speed * 50),
            pitch: pitch * 10 + 50,
          },
        },
      });

      setSaveFeedback('✓ All voice settings successfully saved to DB!');
      setTimeout(() => setSaveFeedback(null), 3500);
    } catch (err) {
      console.error('Failed to save full voice settings:', err);
      setSaveFeedback('Error saving voice settings');
      setTimeout(() => setSaveFeedback(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-10 shadow-xs flex flex-col items-center justify-center min-h-[360px]">
        <div className="w-7 h-7 border-2 border-[#0066FF]/20 border-t-[#0066FF] rounded-full animate-spin mb-3"></div>
        <span className="text-xs text-gray-500 font-semibold tracking-wide">
          Loading neural voice models &amp; regional accents...
        </span>
      </div>
    );
  }

  const selectedVoice = AVAILABLE_VOICES.find((v) => v.voice_id === selectedVoiceId) || AVAILABLE_VOICES[0];
  const activeAccent = ACCENT_GROUPS.flatMap((g) => g.accents).find((a) => a.code === selectedAccentCode);

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      <style>{`
        @keyframes audio-wave {
          0%, 100% { height: 4px; }
          50% { height: 16px; }
        }
        .voice-wave-bar {
          animation: audio-wave 0.8s ease-in-out infinite;
        }
      `}</style>

      {/* HEADER WITH AUTO-SAVE CONFIRMATION BADGE */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-gray-900">Voice &amp; Regional Speech Engine</h2>
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-full">
                {verticalDisplayName}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1 max-w-2xl">
              Choose your AI receptionist persona, select regional speech accents (Hinglish, Punjabi, Indian English), and preview tailored {verticalDisplayName.toLowerCase()} dialogue.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {saveFeedback && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 animate-in fade-in flex items-center gap-1.5 shadow-2xs">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                {saveFeedback}
              </span>
            )}
            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="px-4 py-2 bg-[#0066FF] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#0052cc] transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 shrink-0"
            >
              {isSaving && <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
              {isSaving ? 'Saving...' : 'Save Voice Settings'}
            </button>
          </div>
        </div>

        {/* ACTIVE SELECTION SUMMARY PILL */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-medium">Selected Persona:</span>
            <div className="flex items-center gap-1.5 bg-blue-50/70 border border-blue-100 text-blue-800 px-2.5 py-1 rounded-lg font-bold">
              <span className="w-2 h-2 rounded-full bg-[#0066FF]"></span>
              {selectedVoice.name} ({selectedVoice.accent})
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-medium">Regional Accent:</span>
            <div className="flex items-center gap-1.5 bg-indigo-50/70 border border-indigo-100 text-indigo-800 px-2.5 py-1 rounded-lg font-bold">
              <span className="text-xs">{activeAccent?.flag || '🌐'}</span>
              {activeAccent?.label || selectedAccentCode}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-medium">TTS Provider:</span>
            <span className="text-gray-700 font-semibold bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-md">
              Cartesia Sonic (&lt;90ms)
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 1: ACCENT & REGIONAL DIALECT SELECTOR */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Regional Accent &amp; Dialect</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Determines how the AI speaks and listens. Hindi/Hinglish and Indian English use specialized acoustic models.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg">
            Auto-saves immediately
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          {ACCENT_GROUPS.map((group) => (
            <div key={group.region} className="border border-gray-100 rounded-xl p-3.5 bg-gray-50/40">
              <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2.5">
                {group.region}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.accents.map((acc) => {
                  const isSelected = selectedAccentCode === acc.code;
                  return (
                    <button
                      key={acc.code}
                      type="button"
                      onClick={() => saveAccentToDb(acc.code)}
                      className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'border-[#0066FF] bg-[#F0F7FF] text-[#0066FF] ring-1 ring-[#0066FF]/30 font-bold shadow-2xs'
                          : 'border-gray-200 hover:border-gray-300 bg-white text-gray-800 font-medium hover:bg-gray-50/80'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{acc.flag}</span>
                        <div>
                          <div className="text-xs">{acc.label}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{acc.code}</div>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-[#0066FF] text-white flex items-center justify-center shrink-0">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: VOICE PERSONA SELECTION */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Voice Persona</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Click any persona to immediately switch and auto-save. Previews play {verticalDisplayName.toLowerCase()} dialogue.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Gender Filter */}
            <div className="flex p-0.5 bg-gray-100 rounded-xl border border-gray-200/60">
              {(['All', 'Female', 'Male'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGenderFilter(g)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    genderFilter === g
                      ? 'bg-white text-gray-900 shadow-2xs'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search voices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-40 sm:w-48 pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0066FF] focus:bg-white transition-all"
              />
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
          </div>
        </div>

        {/* VOICES GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredVoices.map((voice) => {
            const isSelected = selectedVoiceId === voice.voice_id;
            const isPlaying = playingVoiceId === voice.voice_id;
            const description = getVoiceDescription(voice, currentVertical);

            return (
              <div
                key={voice.id + voice.voice_id}
                onClick={() => saveVoiceToDb(voice)}
                className={`group relative rounded-2xl border p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#0066FF] bg-[#F0F7FF] ring-2 ring-[#0066FF]/20 shadow-xs'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50 hover:shadow-2xs'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-3">
                      {/* Realistic Avatar Image */}
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-gray-200/80 bg-gray-100 shadow-2xs">
                        <img
                          src={voice.avatarUrl}
                          alt={voice.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div className="w-full h-full flex items-center justify-center font-bold text-gray-600 text-sm">
                          {voice.name[0]}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-gray-900 leading-none">{voice.name}</h4>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              voice.gender === 'Female'
                                ? 'bg-pink-50 text-pink-700 border border-pink-100'
                                : 'bg-blue-50 text-blue-700 border border-blue-100'
                            }`}
                          >
                            {voice.gender}
                          </span>
                        </div>
                        <div className="text-[11px] font-semibold text-gray-500 mt-1">
                          {voice.accent}
                        </div>
                      </div>
                    </div>

                    {/* Selection State / Checkmark */}
                    {isSelected ? (
                      <div className="flex items-center gap-1 bg-[#0066FF] text-white px-2 py-1 rounded-full text-[10px] font-bold shadow-2xs">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Selected
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                      </div>
                    )}
                  </div>

                  {/* Vertical-specific description */}
                  <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                    {description}
                  </p>
                </div>

                {/* Footer of Card: Audio Sample Play Button & Persona Details */}
                <div className="mt-3.5 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={(e) => handlePlayPreview(voice, e)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs ${
                      isPlaying
                        ? 'bg-[#0066FF] text-white'
                        : isSelected
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    title={`Listen to ${voice.name} speak ${verticalDisplayName.toLowerCase()} sample`}
                  >
                    {isPlaying ? (
                      <>
                        <div className="flex items-center gap-[2.5px] h-3.5">
                          <div className="w-[2px] bg-white rounded-full voice-wave-bar" style={{ animationDelay: '0.0s' }}></div>
                          <div className="w-[2px] bg-white rounded-full voice-wave-bar" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-[2px] bg-white rounded-full voice-wave-bar" style={{ animationDelay: '0.4s' }}></div>
                          <div className="w-[2px] bg-white rounded-full voice-wave-bar" style={{ animationDelay: '0.1s' }}></div>
                        </div>
                        <span>Playing Sample</span>
                      </>
                    ) : (
                      <>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                        <span>Listen Sample</span>
                      </>
                    )}
                  </button>

                  <span className="text-[11px] font-medium text-gray-400">
                    Cartesia Sonic &bull; &lt;90ms
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: VOICE TUNING & PROVIDER SETTINGS */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
        <h3 className="text-sm font-bold text-gray-900 mb-1">Acoustic Delivery &amp; Speed Settings</h3>
        <p className="text-xs text-gray-500 mb-5">Fine-tune delivery pace and pitch to fit your front-desk tone.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Speaking Speed */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-700">Speaking Pace / Speed</label>
              <span className="text-xs font-bold text-[#0066FF] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                {speed.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0066FF]"
            />
            <div className="flex justify-between mt-1.5 text-[11px] text-gray-400 font-medium">
              <span>0.5x (Deliberate)</span>
              <span>1.0x (Standard)</span>
              <span>1.5x (Brisk)</span>
            </div>
          </div>

          {/* Pitch Correction */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-700">Pitch Correction</label>
              <span className="text-xs font-bold text-gray-700 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-200">
                {pitch === 0 ? 'Natural (0)' : pitch > 0 ? `+${pitch}` : `${pitch}`}
              </span>
            </div>
            <input
              type="range"
              min="-5"
              max="5"
              step="1"
              value={pitch}
              onChange={(e) => setPitch(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0066FF]"
            />
            <div className="flex justify-between mt-1.5 text-[11px] text-gray-400 font-medium">
              <span>-5 (Deeper)</span>
              <span>0 (Default)</span>
              <span>+5 (Higher)</span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-600">TTS Engine Provider:</span>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl py-1.5 px-3 text-xs font-bold text-gray-800 focus:outline-none focus:border-[#0066FF] cursor-pointer shadow-2xs"
            >
              <option value="cartesia">Cartesia Sonic (Ultra-Low Latency &lt;90ms) - Recommended</option>
              <option value="elevenlabs">ElevenLabs (High Quality Neural)</option>
            </select>
          </div>

          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#0066FF] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#0052cc] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving && <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
            {isSaving ? 'Saving Settings...' : 'Save Voice Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
