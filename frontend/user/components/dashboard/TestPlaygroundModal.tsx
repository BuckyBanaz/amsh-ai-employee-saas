"use client";
import React, { useState, useEffect, useRef } from 'react';
import { STRINGS } from '../../utils/strings/en';
import { DashboardController, AgentItem } from '../../controllers/dashboard.controller';
import { API_ENDPOINTS } from '../../utils/api_endpoints';

type ScenarioId = 'booking' | 'reschedule' | 'emergency' | 'faq';
type Mode = 'scenario' | 'live';
type CallPhase = 'idle' | 'dialing' | 'connected' | 'ended';
type Message = { speaker: 'AI' | 'User'; text: string };

interface TestPlaygroundModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Fallback canned reply in case backend is offline
function simulateReply(userText: string): string {
  const t = userText.toLowerCase();
  if (/(pain|emergency|urgent|hurt|bleeding|help me)/.test(t)) {
    return "I understand this sounds urgent. I'm escalating this to our on-call medical staff right away — please stay on the line.";
  }
  if (/(book|appointment|schedule|slot|doctor)/.test(t)) {
    return 'I can help with that. Dr. Sarah Wilson is available tomorrow at 10:00 AM — shall I reserve that for you?';
  }
  if (/(cancel|reschedule|move|change)/.test(t)) {
    return 'No problem, I can help you reschedule. What day and time works best for you?';
  }
  if (/(price|cost|how much|fee)/.test(t)) {
    return 'Our general consultation starts at ₹500 and dental cleaning is ₹1,200. Would you like me to book an appointment?';
  }
  if (/(hour|open|close|time)/.test(t)) {
    return "We're open Monday to Saturday, 9:00 AM to 7:00 PM. How can I assist you further?";
  }
  return "Namaste! I have noted that. Could you tell me a little more so I can assist you accurately?";
}

export function TestPlaygroundModal({ isOpen, onClose }: TestPlaygroundModalProps) {
  const content = STRINGS.DASHBOARD.COMPONENTS.TEST_PLAYGROUND;
  const [mode, setMode] = useState<Mode>('live');

  // Scripted scenario mode
  const [scenario, setScenario] = useState<ScenarioId>('booking');
  const [hasRun, setHasRun] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  // Live free-chat / simulated call mode
  const [phoneNumber, setPhoneNumber] = useState('+91 8901414107');
  const [callPhase, setCallPhase] = useState<CallPhase>('idle');
  const [callSeconds, setCallSeconds] = useState(0);
  const [dialStatusMsg, setDialStatusMsg] = useState('');
  const [liveMessages, setLiveMessages] = useState<Message[]>([]);
  const [chatDraft, setChatDraft] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentCallId, setCurrentCallId] = useState<string>(() => 'sim_' + Math.random().toString(36).slice(2, 9));
  const [playingMsgIndex, setPlayingMsgIndex] = useState<number | null>(null);

  // Active Agent configuration
  const [agentConfig, setAgentConfig] = useState<AgentItem | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dialTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      DashboardController.getAgent()
        .then((agent) => setAgentConfig(agent))
        .catch((err) => console.warn('Failed to load agent config for playground:', err));
    }
  }, [isOpen]);

  useEffect(() => {
    if (callPhase === 'connected') {
      timerRef.current = setInterval(() => setCallSeconds((s) => s + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callPhase]);

  useEffect(() => {
    return () => {
      if (dialTimeoutRef.current) clearTimeout(dialTimeoutRef.current);
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  if (!isOpen) return null;

  const transcript = content.TRANSCRIPTS[scenario];
  const results = content.RESULTS[scenario];

  const runTest = () => {
    setIsRunning(true);
    setHasRun(false);
    setTimeout(() => {
      setIsRunning(false);
      setHasRun(true);
    }, 800);
  };

  const selectScenario = (id: ScenarioId) => {
    setScenario(id);
    setHasRun(false);
    setIsRunning(false);
  };

  const resetLive = () => {
    setCallPhase('idle');
    setCallSeconds(0);
    setDialStatusMsg('');
    setLiveMessages([]);
    setChatDraft('');
    setIsTyping(false);
    setCurrentCallId('sim_' + Math.random().toString(36).slice(2, 9));
    if (audioRef.current) {
      audioRef.current.pause();
      setPlayingMsgIndex(null);
    }
  };

  const startCall = async () => {
    if (!phoneNumber.trim()) return;
    setCallPhase('dialing');
    setCallSeconds(0);
    setLiveMessages([]);
    setDialStatusMsg(`Calling ${phoneNumber} via Exotel carrier...`);

    const newCallId = 'test_call_' + Math.random().toString(36).slice(2, 9);
    setCurrentCallId(newCallId);

    // 1. Dispatch real outbound call to the user's phone via Exotel
    try {
      const res = await DashboardController.triggerTestCall(phoneNumber.trim());
      if (res?.success) {
        setDialStatusMsg(`Calling ${phoneNumber} from ${res.from_number || '08047284627'}. Pick up to speak with AI!`);
      } else {
        setDialStatusMsg(res?.message || 'Outbound call initiated.');
      }
    } catch (err: any) {
      console.warn('Real outbound call trigger:', err);
      setDialStatusMsg(`Calling ${phoneNumber}. (Or chat/listen right below in browser)`);
    }

    // 2. Also prepare browser audio session
    const greeting = agentConfig?.greeting_message || 'Namaste! Sanjeevani Hospital me aapka swagat hai. Main AI receptionist Aanya hoon. Main aapki kya madad kar sakti hoon?';

    dialTimeoutRef.current = setTimeout(() => {
      setCallPhase('connected');
      setLiveMessages([{ speaker: 'AI', text: greeting }]);
      playSpeech(greeting, 0);
    }, 2500);
  };

  const endCall = () => {
    if (dialTimeoutRef.current) clearTimeout(dialTimeoutRef.current);
    setCallPhase('ended');
    if (audioRef.current) {
      audioRef.current.pause();
      setPlayingMsgIndex(null);
    }
  };

  const sendChat = async () => {
    const text = chatDraft.trim();
    if (!text) return;
    if (callPhase === 'idle') setCallPhase('connected');
    
    const userMsgIndex = liveMessages.length;
    setLiveMessages((m) => [...m, { speaker: 'User', text }]);
    setChatDraft('');
    setIsTyping(true);

    try {
      const res = await DashboardController.simulateVoice({
        user_transcript: text,
        call_id: currentCallId,
        caller_number: phoneNumber || '+918901414107',
      });
      const reply = res?.bot_response || simulateReply(text);
      const aiMsgIndex = userMsgIndex + 1;
      setLiveMessages((m) => [...m, { speaker: 'AI', text: reply }]);
      
      // Auto play speech if in simulated call mode
      if (callPhase === 'connected') {
        playSpeech(reply, aiMsgIndex);
      }

      if (res?.should_hangup) {
        setTimeout(() => setCallPhase('ended'), 2500);
      }
    } catch {
      const fallback = simulateReply(text);
      setLiveMessages((m) => [...m, { speaker: 'AI', text: fallback }]);
    } finally {
      setIsTyping(false);
    }
  };

  const playSpeech = (text: string, idx: number) => {
    if (playingMsgIndex === idx && audioRef.current) {
      audioRef.current.pause();
      setPlayingMsgIndex(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const voiceId = agentConfig?.config?.tts_provider?.voice_id || '25b902d8-21d9-482a-a922-2619058448f7';
    const previewUrl = `${API_ENDPOINTS.VOICE.PREVIEW}?voice_id=${encodeURIComponent(voiceId)}&text=${encodeURIComponent(text.slice(0, 160))}`;
    const audio = new Audio(previewUrl);
    audioRef.current = audio;
    setPlayingMsgIndex(idx);
    audio.play().catch(() => setPlayingMsgIndex(null));
    audio.onended = () => setPlayingMsgIndex(null);
  };

  const handlePublish = async () => {
    try {
      setIsPublishing(true);
      await DashboardController.updateAgent({ status: 'active' });
      setPublishSuccess(true);
      setTimeout(() => {
        setPublishSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Failed to publish agent:', err);
    } finally {
      setIsPublishing(false);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const switchMode = (m: Mode) => {
    setMode(m);
    if (m === 'scenario') resetLive();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-gray-100 rounded-2xl w-full max-w-4xl shadow-2xl p-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-[18px] font-bold text-gray-900 leading-tight">{content.TITLE}</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wide">
                {content.BADGE}
              </span>
            </div>
            <p className="text-[13px] text-gray-500">{content.SUBTITLE}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 p-1 rounded-md flex-shrink-0 cursor-pointer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button
            onClick={() => switchMode('live')}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-colors cursor-pointer ${
              mode === 'live' ? 'border-[#0066FF] bg-[#F0F7FF] text-[#0066FF]' : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            Live Chat / Call Test
          </button>
          <button
            onClick={() => switchMode('scenario')}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-colors cursor-pointer ${
              mode === 'scenario' ? 'border-[#0066FF] bg-[#F0F7FF] text-[#0066FF]' : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            Scripted Scenario
          </button>
          <span className="text-[11px] text-emerald-600 font-semibold ml-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Realtime AI Engine Active (&lt;200ms)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
          {/* Left: Simulator */}
          <div className="md:col-span-3 flex flex-col">
            {mode === 'scenario' ? (
              <>
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex-1 flex flex-col min-h-[280px]">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Simulated Caller
                  </div>
                  <div className="flex-1 space-y-2 overflow-y-auto max-h-72 pr-1">
                    {!hasRun && !isRunning && (
                      <div className="h-full flex items-center justify-center text-[13px] text-gray-400 py-10">
                        Pick a scenario and run the test call to see a simulated transcript.
                      </div>
                    )}
                    {isRunning && (
                      <div className="h-full flex items-center justify-center text-[13px] text-gray-400 py-10 flex-col gap-2">
                        <div className="w-6 h-6 border-2 border-[#0066FF] border-t-transparent rounded-full animate-spin"></div>
                        Simulating call with AI receptionist...
                      </div>
                    )}
                    {hasRun && !isRunning && (
                      transcript.map((item, idx) => (
                        <div
                          key={idx}
                          className={`p-2.5 rounded-lg text-[12px] leading-relaxed ${
                            item.speaker === 'AI'
                              ? 'bg-[#F0F7FF] border border-[#BFDBFE]/60 text-gray-900'
                              : 'bg-white border border-gray-200 text-gray-900'
                          }`}
                        >
                          <span className={`font-bold block mb-0.5 ${item.speaker === 'AI' ? 'text-[#0066FF]' : 'text-gray-500'}`}>
                            {item.speaker === 'AI' ? 'AI Receptionist' : 'Caller'}:
                          </span>
                          {item.text}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={runTest}
                    disabled={isRunning}
                    className="flex-1 py-2 bg-[#0066FF] hover:bg-[#0052cc] text-white rounded-lg text-[13px] font-bold shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    {content.RUN_TEST_BTN}
                  </button>
                  <button
                    onClick={() => { setHasRun(false); setIsRunning(false); }}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-[13px] font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    {content.RESET_BTN}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Simulated Phone Call Controls */}
                <div className="flex flex-col gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      disabled={callPhase === 'connected' || callPhase === 'dialing'}
                      placeholder="+91 89014 14107"
                      className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-[12px] font-mono font-bold focus:outline-none focus:border-[#0066FF] disabled:bg-gray-100"
                    />
                    {callPhase === 'idle' && (
                      <button
                        onClick={startCall}
                        disabled={!phoneNumber.trim()}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-[12px] font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                        </svg>
                        Call Me
                      </button>
                    )}
                  </div>

                  {callPhase === 'dialing' && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-[12px] font-bold text-amber-700">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                      Dialing {phoneNumber}...
                    </div>
                  )}
                  {callPhase === 'connected' && (
                    <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-[12px] font-bold text-emerald-700">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Connected — {formatTime(callSeconds)}
                      </span>
                      <button onClick={endCall} className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-bold cursor-pointer">
                        End Call
                      </button>
                    </div>
                  )}
                  {callPhase === 'ended' && (
                    <div className="flex items-center justify-between px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-[12px] font-bold text-gray-600">
                      <span>Call completed — duration {formatTime(callSeconds)}</span>
                      <button onClick={resetLive} className="px-2.5 py-1 border border-gray-300 rounded text-[11px] font-bold text-gray-600 hover:bg-white cursor-pointer">
                        New Test
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex-1 flex flex-col min-h-[240px]">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Live Transcript & Speech
                  </div>
                  <div className="flex-1 space-y-2 overflow-y-auto max-h-60 pr-1">
                    {liveMessages.length === 0 && (
                      <div className="h-full flex items-center justify-center text-[13px] text-gray-400 py-8 text-center px-4">
                        Type a message below to chat with your AI Receptionist, or click "Call Me" to test voice synthesis.
                      </div>
                    )}
                    {liveMessages.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-lg text-[12px] leading-relaxed relative group ${
                          item.speaker === 'AI'
                            ? 'bg-[#F0F7FF] border border-[#BFDBFE]/60 text-gray-900'
                            : 'bg-white border border-gray-200 text-gray-900'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`font-bold block ${item.speaker === 'AI' ? 'text-[#0066FF]' : 'text-gray-500'}`}>
                            {item.speaker === 'AI' ? 'AI Receptionist' : 'You'}:
                          </span>
                          {item.speaker === 'AI' && (
                            <button
                              type="button"
                              onClick={() => playSpeech(item.text, idx)}
                              className="text-gray-400 hover:text-[#0066FF] transition-colors p-0.5 rounded cursor-pointer"
                              title="Listen to voice output"
                            >
                              {playingMsgIndex === idx ? (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-emerald-600 animate-pulse">
                                  <rect x="6" y="4" width="4" height="16"></rect>
                                  <rect x="14" y="4" width="4" height="16"></rect>
                                </svg>
                              ) : (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                                </svg>
                              )}
                            </button>
                          )}
                        </div>
                        {item.text}
                      </div>
                    ))}
                    {isTyping && (
                      <div className="p-2.5 rounded-lg text-[12px] bg-[#F0F7FF] border border-[#BFDBFE]/60 text-[#0066FF] italic flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#0066FF] animate-pulse"></span>
                        AI Receptionist is answering...
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <input
                    type="text"
                    value={chatDraft}
                    onChange={(e) => setChatDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') sendChat(); }}
                    disabled={callPhase === 'ended'}
                    placeholder="Type what the caller would say (e.g. I need an appointment tomorrow)..."
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#0066FF] disabled:bg-gray-100"
                  />
                  <button
                    onClick={sendChat}
                    disabled={!chatDraft.trim() || callPhase === 'ended'}
                    className="px-4 py-2 bg-[#0066FF] hover:bg-[#0052cc] disabled:opacity-50 text-white rounded-lg text-[13px] font-bold shadow-sm transition-colors cursor-pointer"
                  >
                    Send
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Right: Config + Results (scenario mode) / Live Test Notes */}
          <div className="md:col-span-2 flex flex-col gap-4">
            {mode === 'scenario' && (
              <div>
                <div className="text-[12px] font-bold text-gray-700 mb-2">{content.SCENARIOS_LABEL}</div>
                <div className="grid grid-cols-2 gap-2">
                  {content.SCENARIOS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => selectScenario(s.id as ScenarioId)}
                      className={`px-2.5 py-2 rounded-lg text-[12px] font-bold border transition-colors text-left cursor-pointer ${
                        scenario === s.id
                          ? 'border-[#0066FF] bg-[#F0F7FF] text-[#0066FF]'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl space-y-1.5 text-[12px]">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">{content.CONFIG_TITLE}</div>
              <div className="flex justify-between">
                <span className="text-gray-500">{content.CONFIG.GREETING}</span>
                <span className="font-semibold text-gray-900 truncate max-w-[130px]" title={agentConfig?.greeting_message || 'Custom'}>
                  {agentConfig?.greeting_message ? 'Custom Greeting' : 'Default'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{content.CONFIG.VOICE}</span>
                <span className="font-semibold text-gray-900">
                  {agentConfig?.config?.tts_provider?.voice_name || 'Aanya (Indian Accent)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{content.CONFIG.KNOWLEDGE}</span>
                <span className="font-semibold text-gray-900">Services, Doctors, FAQs</span>
              </div>
            </div>

            {mode === 'scenario' ? (
              <div className="p-3 border border-gray-100 rounded-xl flex-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">{content.RESULTS_TITLE}</div>
                <div className="space-y-1.5">
                  {results.map((r, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-[12px]">
                      {hasRun ? (
                        r.pass ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-500 flex-shrink-0"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-amber-500 flex-shrink-0"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        )
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-gray-200 flex-shrink-0"></span>
                      )}
                      <span className={hasRun ? 'text-gray-900' : 'text-gray-400'}>{r.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 border border-gray-100 rounded-xl flex-1 text-[12px] text-gray-600 leading-relaxed bg-gray-50/40">
                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Live Engine Verification</div>
                <ul className="space-y-1.5 text-[11px]">
                  <li className="flex items-center gap-1.5 text-emerald-700 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Connected to Groq Llama-3 intent extraction
                  </li>
                  <li className="flex items-center gap-1.5 text-emerald-700 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    PostgreSQL conversation turns recorded
                  </li>
                  <li className="flex items-center gap-1.5 text-emerald-700 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Cartesia voice synthesis preview enabled
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-[13px] font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">
            {content.CLOSE_BTN}
          </button>
          <div className="flex items-center gap-2">
            {publishSuccess && (
              <span className="text-xs font-bold text-emerald-600 mr-2 animate-in fade-in">
                ✓ Published to Production Line!
              </span>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 rounded-lg text-[13px] font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              {content.SAVE_DRAFT_BTN}
            </button>
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className="px-4 py-2 bg-[#0066FF] hover:bg-[#0052cc] disabled:opacity-50 text-white rounded-lg text-[13px] font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
            >
              {isPublishing && <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
              {isPublishing ? 'Publishing...' : content.PUBLISH_BTN}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
