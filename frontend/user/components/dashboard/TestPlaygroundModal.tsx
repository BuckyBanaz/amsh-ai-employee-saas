"use client";
import React, { useState, useEffect, useRef } from 'react';
import { STRINGS } from '../../utils/strings/en';

type ScenarioId = 'booking' | 'reschedule' | 'emergency' | 'faq';
type Mode = 'scenario' | 'live';
type CallPhase = 'idle' | 'dialing' | 'connected' | 'ended';
type Message = { speaker: 'AI' | 'User'; text: string };

interface TestPlaygroundModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Keyword-based canned replies — this is a UI mockup only, no real LLM behind it.
function simulateReply(userText: string): string {
  const t = userText.toLowerCase();
  if (/(pain|emergency|urgent|hurt|bleeding|help me)/.test(t)) {
    return "I understand this sounds urgent. I'm escalating this to our on-call staff right away — please stay on the line.";
  }
  if (/(book|appointment|schedule|slot)/.test(t)) {
    return 'I can help with that. I have an opening tomorrow at 10:00 AM — would that work for you?';
  }
  if (/(cancel|reschedule|move|change)/.test(t)) {
    return 'No problem, I can take care of that. What day works best for you?';
  }
  if (/(price|cost|how much|fee)/.test(t)) {
    return 'Sure — that service is priced at €80 and takes about 45 minutes. Would you like me to book it for you?';
  }
  if (/(hour|open|close|time)/.test(t)) {
    return "We're open Monday to Saturday, 9 AM to 6 PM. Is there anything else I can help with?";
  }
  return "Got it — let me check that for you. Could you tell me a little more so I can help precisely?";
}

export function TestPlaygroundModal({ isOpen, onClose }: TestPlaygroundModalProps) {
  const content = STRINGS.DASHBOARD.COMPONENTS.TEST_PLAYGROUND;
  const [mode, setMode] = useState<Mode>('scenario');

  // Scripted scenario mode
  const [scenario, setScenario] = useState<ScenarioId>('booking');
  const [hasRun, setHasRun] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  // Live free-chat / simulated call mode
  const [phoneNumber, setPhoneNumber] = useState('');
  const [callPhase, setCallPhase] = useState<CallPhase>('idle');
  const [callSeconds, setCallSeconds] = useState(0);
  const [liveMessages, setLiveMessages] = useState<Message[]>([]);
  const [chatDraft, setChatDraft] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dialTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const replyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (replyTimeoutRef.current) clearTimeout(replyTimeoutRef.current);
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
    }, 900);
  };

  const selectScenario = (id: ScenarioId) => {
    setScenario(id);
    setHasRun(false);
    setIsRunning(false);
  };

  const resetLive = () => {
    setCallPhase('idle');
    setCallSeconds(0);
    setLiveMessages([]);
    setChatDraft('');
    setIsTyping(false);
  };

  const startCall = () => {
    if (!phoneNumber.trim()) return;
    setCallPhase('dialing');
    setCallSeconds(0);
    setLiveMessages([]);
    dialTimeoutRef.current = setTimeout(() => {
      setCallPhase('connected');
      setLiveMessages([{ speaker: 'AI', text: 'Good day, thank you for calling. I am your AI assistant. How may I help you today?' }]);
    }, 1600);
  };

  const endCall = () => {
    if (dialTimeoutRef.current) clearTimeout(dialTimeoutRef.current);
    setCallPhase('ended');
  };

  const sendChat = () => {
    const text = chatDraft.trim();
    if (!text) return;
    if (callPhase === 'idle') setCallPhase('connected');
    setLiveMessages((m) => [...m, { speaker: 'User', text }]);
    setChatDraft('');
    setIsTyping(true);
    replyTimeoutRef.current = setTimeout(() => {
      setLiveMessages((m) => [...m, { speaker: 'AI', text: simulateReply(text) }]);
      setIsTyping(false);
    }, 900);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const switchMode = (m: Mode) => {
    setMode(m);
    if (m === 'scenario') resetLive();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
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
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 p-1 rounded-md flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => switchMode('scenario')}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-colors ${
              mode === 'scenario' ? 'border-[#0066FF] bg-[#F0F7FF] text-[#0066FF]' : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            Scripted Scenario
          </button>
          <button
            onClick={() => switchMode('live')}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-colors ${
              mode === 'live' ? 'border-[#0066FF] bg-[#F0F7FF] text-[#0066FF]' : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            Live Chat / Call Test
          </button>
          <span className="text-[11px] text-gray-400 ml-1">Simulated — no real call is placed, no real AI model is called.</span>
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
                      <div className="h-full flex items-center justify-center text-[13px] text-gray-400 py-10 animate-pulse">
                        Simulating call...
                      </div>
                    )}
                    {hasRun && transcript.map((item, idx) => (
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
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={runTest}
                    disabled={isRunning}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#0066FF] hover:bg-[#0052cc] disabled:opacity-60 text-white rounded-lg text-[13px] font-bold shadow-sm transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    {isRunning ? content.RUNNING_BTN : content.RUN_BTN}
                  </button>
                  <button
                    onClick={() => { setHasRun(false); setIsRunning(false); }}
                    className="px-4 py-2.5 border border-gray-200 rounded-lg text-[13px] font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    {content.RESET_BTN}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Live mode: call status bar */}
                <div className="mb-3">
                  {callPhase === 'idle' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#0066FF]"
                      />
                      <button
                        onClick={startCall}
                        disabled={!phoneNumber.trim()}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-[13px] font-bold shadow-sm transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                        Call Me
                      </button>
                    </div>
                  )}
                  {callPhase === 'dialing' && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-[12px] font-bold text-amber-700">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                      Calling {phoneNumber}...
                    </div>
                  )}
                  {callPhase === 'connected' && (
                    <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-[12px] font-bold text-emerald-700">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Connected — {formatTime(callSeconds)}
                      </span>
                      <button onClick={endCall} className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-bold">
                        End Call
                      </button>
                    </div>
                  )}
                  {callPhase === 'ended' && (
                    <div className="flex items-center justify-between px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-[12px] font-bold text-gray-600">
                      <span>Call ended — duration {formatTime(callSeconds)}</span>
                      <button onClick={resetLive} className="px-2.5 py-1 border border-gray-300 rounded text-[11px] font-bold text-gray-600 hover:bg-white">
                        New Test
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex-1 flex flex-col min-h-[240px]">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Live Transcript
                  </div>
                  <div className="flex-1 space-y-2 overflow-y-auto max-h-60 pr-1">
                    {liveMessages.length === 0 && (
                      <div className="h-full flex items-center justify-center text-[13px] text-gray-400 py-8 text-center px-4">
                        Type a message below to chat with the AI, or enter a number above and hit "Call Me" to simulate a live call.
                      </div>
                    )}
                    {liveMessages.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-lg text-[12px] leading-relaxed ${
                          item.speaker === 'AI'
                            ? 'bg-[#F0F7FF] border border-[#BFDBFE]/60 text-gray-900'
                            : 'bg-white border border-gray-200 text-gray-900'
                        }`}
                      >
                        <span className={`font-bold block mb-0.5 ${item.speaker === 'AI' ? 'text-[#0066FF]' : 'text-gray-500'}`}>
                          {item.speaker === 'AI' ? 'AI Receptionist' : 'You'}:
                        </span>
                        {item.text}
                      </div>
                    ))}
                    {isTyping && (
                      <div className="p-2.5 rounded-lg text-[12px] bg-[#F0F7FF] border border-[#BFDBFE]/60 text-gray-400 italic">
                        AI is typing...
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
                    placeholder="Type what the caller would say..."
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#0066FF] disabled:bg-gray-100"
                  />
                  <button
                    onClick={sendChat}
                    disabled={!chatDraft.trim() || callPhase === 'ended'}
                    className="px-4 py-2 bg-[#0066FF] hover:bg-[#0052cc] disabled:opacity-50 text-white rounded-lg text-[13px] font-bold shadow-sm transition-colors"
                  >
                    Send
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Right: Scenario picker + Config + Results (scenario mode) / Config only (live mode) */}
          <div className="md:col-span-2 flex flex-col gap-4">
            {mode === 'scenario' && (
              <div>
                <div className="text-[12px] font-bold text-gray-700 mb-2">{content.SCENARIOS_LABEL}</div>
                <div className="grid grid-cols-2 gap-2">
                  {content.SCENARIOS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => selectScenario(s.id as ScenarioId)}
                      className={`px-2.5 py-2 rounded-lg text-[12px] font-bold border transition-colors text-left ${
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
              <div className="flex justify-between"><span className="text-gray-500">{content.CONFIG.GREETING}</span><span className="font-semibold text-gray-900">Default</span></div>
              <div className="flex justify-between"><span className="text-gray-500">{content.CONFIG.VOICE}</span><span className="font-semibold text-gray-900">Sarah (Warm Female)</span></div>
              <div className="flex justify-between"><span className="text-gray-500">{content.CONFIG.KNOWLEDGE}</span><span className="font-semibold text-gray-900">Services, FAQs</span></div>
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
              <div className="p-3 border border-gray-100 rounded-xl flex-1 text-[12px] text-gray-500 leading-relaxed">
                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Live Test Notes</div>
                Free-form test — no fixed checklist. Type anything as the caller and the AI replies based on keywords (booking, pricing, hours, emergency, reschedule). This is a UI simulation only: no real phone call is placed and no real AI model generates these replies yet.
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-[13px] font-bold text-gray-600 hover:bg-gray-50 transition-colors">
            {content.CLOSE_BTN}
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 rounded-lg text-[13px] font-bold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {content.SAVE_DRAFT_BTN}
            </button>
            <button
              onClick={onClose}
              disabled={mode === 'scenario' && !hasRun}
              className="px-4 py-2 bg-[#0066FF] hover:bg-[#0052cc] disabled:opacity-50 text-white rounded-lg text-[13px] font-bold shadow-sm transition-colors"
            >
              {content.PUBLISH_BTN}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
