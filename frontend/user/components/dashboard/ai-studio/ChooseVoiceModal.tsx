"use client";
import React, { useState } from 'react';
import { API_ENDPOINTS } from '../../../utils/api_endpoints';
import { StorageService } from '../../../services/storage.service';

export interface VoiceOption {
  id: string;
  voice_id: string;
  name: string;
  gender: 'Female' | 'Male';
  accent: string;
  avatarUrl: string;
  descriptions: {
    restaurant: string;
    clinic: string;
    salon: string;
    generic: string;
  };
  previewSamples: {
    restaurant: string;
    clinic: string;
    salon: string;
    generic: string;
  };
}

// Voice ids below were checked against Cartesia's /voices API. The first four are the Indian-accent options:
// Kiara speaks English with an Indian accent; Lavanya, Sagar and Meera are native Hindi voices (they also handle
// English words with an Indian accent). The original list had no Indian voice at all, and "Diya" reused Skylar's id.
export const AVAILABLE_VOICES: VoiceOption[] = [
  {
    id: 'kiara',
    voice_id: 'f8f5f1b2-f02d-4d8e-a40d-fd850a487b3d',
    name: 'Kiara',
    gender: 'Female',
    accent: 'Indian English (upbeat)',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&auto=format&fit=crop&q=80',
    descriptions: {
      restaurant: 'Upbeat, clear Indian-accented English host for reservations and dining inquiries.',
      clinic: 'Upbeat, clear Indian-accented English voice for patient appointments and clinic inquiries.',
      salon: 'Bright Indian-accented English voice for salon and spa bookings.',
      generic: 'Upbeat, enunciating Indian-accented English voice for customer reception.',
    },
    previewSamples: {
      restaurant: 'Hello, welcome to our restaurant! Would you like to reserve a table for tonight?',
      clinic: 'Hello, welcome to our clinic! How can I help you with your appointment today?',
      salon: 'Welcome to our salon! Would you like to book a haircut or a spa slot today?',
      generic: 'Hello, welcome! How can I help you with your booking today?',
    },
  },
  {
    id: 'lavanya',
    voice_id: 'c6bbc7d5-4b35-4d49-b1c6-4417019a61c1',
    name: 'Lavanya',
    gender: 'Female',
    accent: 'Hindi / Hinglish (India, upbeat)',
    avatarUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=160&auto=format&fit=crop&q=80',
    descriptions: {
      restaurant: 'Approachable, upbeat native Hindi voice for dining inquiries and table bookings.',
      clinic: 'Approachable, upbeat native Hindi voice for patient appointments and clinic questions.',
      salon: 'Friendly native Hindi voice for salon appointments and beauty treatments.',
      generic: 'Approachable and upbeat native Hindi voice for everyday customer reception.',
    },
    previewSamples: {
      restaurant: 'नमस्ते! हमारे रेस्टोरेंट में आपका स्वागत है। क्या मैं आपके लिए टेबल बुक कर दूँ?',
      clinic: 'नमस्ते! क्लिनिक में आपका स्वागत है। मैं आपकी अपॉइंटमेंट बुक करने में मदद कर सकती हूँ।',
      salon: 'नमस्ते! हमारे सैलून में आपका स्वागत है। क्या मैं आपके लिए हेयरकट बुक कर दूँ?',
      generic: 'नमस्ते! आपका स्वागत है। मैं आपकी बुकिंग में पूरी मदद कर सकती हूँ।',
    },
  },
  {
    id: 'sagar',
    voice_id: '6303e5fb-a0a7-48f9-bb1a-dd42c216dc5d',
    name: 'Sagar',
    gender: 'Male',
    accent: 'Hindi / Hinglish (India, energetic)',
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=160&auto=format&fit=crop&q=80',
    descriptions: {
      restaurant: 'Energetic native Hindi voice for engaging customer conversations and reservations.',
      clinic: 'Energetic native Hindi voice for engaging patient support and appointment booking.',
      salon: 'Energetic native Hindi voice for salon bookings and customer questions.',
      generic: 'Energetic adult male native Hindi voice for customer support and conversations.',
    },
    previewSamples: {
      restaurant: 'नमस्ते! हमारे रेस्टोरेंट में आपका स्वागत है। बताइए, कितने लोगों की टेबल चाहिए?',
      clinic: 'नमस्ते! क्लिनिक में आपका स्वागत है। बताइए, मैं आपकी क्या मदद कर सकता हूँ?',
      salon: 'नमस्ते! हमारे सैलून में आपका स्वागत है। बताइए, कौन सी सर्विस चाहिए?',
      generic: 'नमस्ते! आपका स्वागत है। बताइए, मैं आपकी क्या मदद कर सकता हूँ?',
    },
  },
  {
    id: 'meera',
    voice_id: 'a81fccdc-5595-4dfc-ae76-4de6a515b8a2',
    name: 'Meera',
    gender: 'Female',
    accent: 'Hindi / Hinglish (India, friendly)',
    avatarUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=160&auto=format&fit=crop&q=80',
    descriptions: {
      restaurant: 'Friendly, approachable native Hindi voice for everyday interactions and reservations.',
      clinic: 'Friendly, approachable native Hindi voice for patient interactions and appointments.',
      salon: 'Friendly native Hindi voice for salon appointment bookings.',
      generic: 'Friendly, approachable native Hindi female voice for everyday interactions.',
    },
    previewSamples: {
      restaurant: 'नमस्ते! हमारे रेस्टोरेंट में आपका स्वागत है। मैं आपकी टेबल बुक कर सकती हूँ।',
      clinic: 'नमस्ते! क्लिनिक में आपका स्वागत है। बताइए, कौन सी तारीख़ आपके लिए ठीक रहेगी?',
      salon: 'नमस्ते! हमारे सैलून में आपका स्वागत है। बताइए, कौन सी तारीख़ ठीक रहेगी?',
      generic: 'नमस्ते! आपका स्वागत है। बताइए, मैं आपकी क्या मदद कर सकती हूँ?',
    },
  },
  {
    id: 'skylar',
    voice_id: 'db6b0ed5-d5d3-463d-ae85-518a07d3c2b4',
    name: 'Skylar',
    gender: 'Female',
    accent: 'American English',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&auto=format&fit=crop&q=80',
    descriptions: {
      restaurant: 'Empathetic, clear, and welcoming. Ideal for table reservations, guest dining, and party bookings.',
      clinic: 'Empathetic, clear, and reassuring. Ideal for patient triage, doctor bookings, and clinic inquiries.',
      salon: 'Warm and polished front-desk voice for haircut appointments, spa slots, and styling inquiries.',
      generic: 'Empathetic, composed, and reassuring voice for customer service and appointments.',
    },
    previewSamples: {
      restaurant: 'Hello, welcome to our restaurant! Would you like to reserve a table for tonight or check our specials?',
      clinic: 'Hello, welcome to our clinic. How can I assist you with your doctor appointment today?',
      salon: 'Welcome to our salon and spa! Would you like to schedule a haircut, styling, or massage today?',
      generic: 'Hello, welcome! How can I assist you with your booking and inquiries today?',
    },
  },
  {
    id: 'diya',
    voice_id: 'd2d3584d-1b44-428e-aab1-30255d28d978', // was Skylar's id, so "Diya (Hindi)" sounded American; this is Cartesia's Hindi "Diya"
    name: 'Diya',
    gender: 'Female',
    accent: 'Hindi / Hinglish (India)',
    avatarUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=160&auto=format&fit=crop&q=80',
    descriptions: {
      restaurant: 'Warm and conversational Hindi-English bilingual host for dining inquiries and table bookings.',
      clinic: 'Warm and conversational Hindi-English bilingual assistant for patient appointments and doctor advice.',
      salon: 'Friendly Hindi-English bilingual assistant for beauty treatments and salon appointment bookings.',
      generic: 'Warm and natural Hindi-English bilingual receptionist for customer reception.',
    },
    previewSamples: {
      restaurant: 'Namaste! Hamare restaurant me aapka swagat hai. Main aapke liye dinner table book kar sakti hoon ya menu dekhna chahenge?',
      clinic: 'Namaste! Clinic me aapka swagat hai. Main doctor consultation schedule karne me aapki poori madad karungi.',
      salon: 'Namaste! Hamare salon me aapka swagat hai. Kya main aapke liye haircut ya spa slot book kar doon?',
      generic: 'Namaste! Aapka swagat hai. Main aapki booking aur jankari me poori madad kar sakti hoon.',
    },
  },
  {
    id: 'daniel',
    voice_id: '47c38ca4-5f35-497b-b1a3-415245fb35e1',
    name: 'Daniel',
    gender: 'Male',
    accent: 'American English (modern professional)',
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=160&auto=format&fit=crop&q=80',
    descriptions: {
      restaurant: 'Crisp and articulate host voice for front-desk reception, reservations, and dining inquiries.',
      clinic: 'Crisp and articulate male voice for medical appointments, check-ins, and clinic administration.',
      salon: 'Sharp, modern professional voice for salon appointments and service scheduling.',
      generic: 'Crisp, modern, and articulate professional voice for corporate reception and bookings.',
    },
    previewSamples: {
      restaurant: 'Good evening! Welcome to our dining room. How many guests will be joining us for your reservation?',
      clinic: 'Good day. Our doctors have open consultation slots available this week. How may I assist you?',
      salon: 'Good day! Welcome to our salon studio. Which styling service would you like to reserve today?',
      generic: 'Good day! Welcome to our business. How may I assist you with your booking today?',
    },
  },
  {
    id: 'gemma',
    voice_id: '62ae83ad-4f6a-430b-af41-a9bede9286ca',
    name: 'Gemma',
    gender: 'Female',
    accent: 'British English (UK)',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=160&auto=format&fit=crop&q=80',
    descriptions: {
      restaurant: 'Polite, composed and refined British accent for fine dining, reservations, and guest hospitality.',
      clinic: 'Polite, composed and decisive British accent for clinical reception and patient guidance.',
      salon: 'Refined, elegant British voice for premium spa bookings and styling appointments.',
      generic: 'Polite, composed and decisive British accent for customer support and bookings.',
    },
    previewSamples: {
      restaurant: 'Good evening, welcome to the restaurant. May I assist you with reserving a table for this evening?',
      clinic: 'Hello! I can help you schedule or reschedule your medical consultation with our specialists.',
      salon: 'Hello! May I assist you with reserving a hair styling or wellness spa appointment today?',
      generic: 'Hello! Welcome. How may I assist you with your reservation or inquiry today?',
    },
  },
  {
    id: 'archie',
    voice_id: 'ef191366-f52f-447a-a398-ed8c0f2943a1',
    name: 'Archie',
    gender: 'Male',
    accent: 'Casual & Approachable',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=160&auto=format&fit=crop&q=80',
    descriptions: {
      restaurant: 'Warm, upbeat tone for casual dining, takeout inquiries, and relaxed guest reservations.',
      clinic: 'Warm, conversational tone for relaxed patient intake, routine visits, and check-ups.',
      salon: 'Casual, friendly tone for men\'s grooming, haircuts, and styling appointments.',
      generic: 'Warm, upbeat, and conversational tone for relaxed phone interactions.',
    },
    previewSamples: {
      restaurant: 'Hey there! Thanks for calling the restaurant. Are you looking to book a table or order for pickup?',
      clinic: 'Hey there! Let me know what date and time suits you best for your checkup or doctor visit.',
      salon: 'Hey there! Looking for a fresh haircut, beard trim, or styling session today?',
      generic: 'Hey there! Thanks for reaching out. What can I help you take care of today?',
    },
  },
  {
    id: 'jacqueline',
    voice_id: '9626c31c-bec5-4cca-baa8-f8ba9e84c8bc',
    name: 'Jacqueline',
    gender: 'Female',
    accent: 'Reassuring Care',
    avatarUrl: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=160&auto=format&fit=crop&q=80',
    descriptions: {
      restaurant: 'Calm, welcoming presence designed for high-touch hospitality and guest dining care.',
      clinic: 'Calm, soothing voice designed for triage, reassurance, and patient comfort.',
      salon: 'Gentle, soothing presence ideal for holistic spa and relaxation treatment bookings.',
      generic: 'Calm, reassuring voice designed for caring customer service.',
    },
    previewSamples: {
      restaurant: 'Welcome to our restaurant! We would be delighted to host you. What date and time works best for your visit?',
      clinic: 'Welcome to our healthcare care center. How can I make your appointment booking easy today?',
      salon: 'Welcome to our wellness sanctuary. Let me help you find the perfect time for your treatment.',
      generic: 'Welcome! We are delighted to assist you. How can I make your booking easy today?',
    },
  },
  {
    id: 'clive',
    voice_id: 'b24f41fd-00a3-4cd8-992a-a0c9f13f3ef1',
    name: 'Clive',
    gender: 'Male',
    accent: 'Measured Expert',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&auto=format&fit=crop&q=80',
    descriptions: {
      restaurant: 'Composed, authoritative voice for dining policies, operating hours, and VIP reservations.',
      clinic: 'Composed, authoritative voice for delivering clinic policies, doctor hours, and consultations.',
      salon: 'Measured, professional voice for salon schedules, pricing details, and bookings.',
      generic: 'Composed, authoritative voice for business hours, policy questions, and scheduling.',
    },
    previewSamples: {
      restaurant: 'Welcome. Our kitchen is open Tuesday through Sunday from 11 AM to 11 PM. How may I assist your booking?',
      clinic: 'Please note our clinic hours are Monday through Saturday, 9 AM to 7 PM. How may I assist you?',
      salon: 'Our salon operates Monday to Sunday from 10 AM to 8 PM. How may I schedule your visit today?',
      generic: 'Our office hours are Monday through Saturday, 9 AM to 7 PM. How may I assist your inquiry today?',
    },
  },
  {
    id: 'ella',
    voice_id: '2a12b36c-7f9b-4c3a-9f7a-72731b15323a',
    name: 'Ella',
    gender: 'Female',
    accent: 'Bright & Friendly',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80',
    descriptions: {
      restaurant: 'Energetic, cheerful presence for quick front-desk reservations and menu specials.',
      clinic: 'Energetic, cheerful presence for quick front-desk inquiries and check-ins.',
      salon: 'Bright, cheerful tone for styling appointments, nail care, and makeover sessions.',
      generic: 'Energetic, cheerful presence for quick service bookings and customer reception.',
    },
    previewSamples: {
      restaurant: 'Hi! Welcome to our restaurant. Let me get you a table booked with our best seating right away!',
      clinic: 'Hi! Let me get you scheduled with our available doctors right away.',
      salon: 'Hi! Welcome to our salon. Let us get you booked for your makeover or styling right away!',
      generic: 'Hi there! Welcome. Let me help you get everything scheduled right away!',
    },
  },
];

export function getVoiceDescription(v: VoiceOption, vertical: string): string {
  const norm = (vertical || 'clinic').toLowerCase();
  if (norm.includes('rest')) return v.descriptions.restaurant;
  if (norm.includes('salon') || norm.includes('spa')) return v.descriptions.salon;
  if (norm.includes('clinic') || norm.includes('health') || norm.includes('medic') || norm.includes('doctor')) {
    return v.descriptions.clinic;
  }
  return v.descriptions.generic;
}

export function getVoicePreviewText(v: VoiceOption, vertical: string): string {
  const norm = (vertical || 'clinic').toLowerCase();
  if (norm.includes('rest')) return v.previewSamples.restaurant;
  if (norm.includes('salon') || norm.includes('spa')) return v.previewSamples.salon;
  if (norm.includes('clinic') || norm.includes('health') || norm.includes('medic') || norm.includes('doctor')) {
    return v.previewSamples.clinic;
  }
  return v.previewSamples.generic;
}

interface ChooseVoiceModalProps {
  isOpen: boolean;
  vertical?: string;
  selectedVoice?: VoiceOption;
  selectedVoiceId?: string;
  onSelect?: (voice: VoiceOption) => void;
  onSelectVoice?: (voice: VoiceOption) => void;
  onClose: () => void;
}

export function ChooseVoiceModal({
  isOpen,
  vertical,
  selectedVoice,
  selectedVoiceId,
  onSelect,
  onSelectVoice,
  onClose,
}: ChooseVoiceModalProps) {
  const [filterGender, setFilterGender] = useState<'All' | 'Female' | 'Male'>('All');
  const [search, setSearch] = useState('');
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [justSavedId, setJustSavedId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Resolve active vertical dynamically from prop or persistent store
  const storedBusiness = StorageService.getBusiness();
  const currentVertical = (vertical || storedBusiness?.vertical || 'clinic').toLowerCase();

  const verticalDisplayName = currentVertical.includes('rest')
    ? 'Restaurant'
    : currentVertical.includes('salon') || currentVertical.includes('spa')
    ? 'Salon & Spa'
    : currentVertical.includes('clinic') || currentVertical.includes('health')
    ? 'Clinical'
    : 'Business';

  const activeVoice =
    selectedVoice ||
    AVAILABLE_VOICES.find((v) => v.voice_id === selectedVoiceId || v.id === selectedVoiceId) ||
    AVAILABLE_VOICES[0];
  const currentVoiceId = activeVoice.voice_id;

  const handleSelect = (voice: VoiceOption) => {
    setJustSavedId(voice.id);
    if (onSelect) onSelect(voice);
    if (onSelectVoice) onSelectVoice(voice);
    setTimeout(() => {
      setJustSavedId(null);
    }, 2000);
  };

  const playPreview = (v: VoiceOption, e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window === 'undefined') return;

    if (previewingId === v.id) {
      setPreviewingId(null);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      return;
    }

    setPreviewingId(v.id);

    const sampleText = getVoicePreviewText(v, currentVertical);
    // Hindi voices are previewed in Hindi (their samples are written in Devanagari); everything else in English.
    const langPrefix = v.accent.toLowerCase().includes('hindi') ? 'hi' : 'en';
    const previewUrl = `${API_ENDPOINTS.VOICE.PREVIEW}?voice_id=${encodeURIComponent(v.voice_id)}&text=${encodeURIComponent(sampleText.slice(0, 250))}&language=${encodeURIComponent(langPrefix)}`;
    const audio = new Audio(previewUrl);

    audio.onended = () => setPreviewingId(null);
    audio.onerror = () => {
      // Instant speech synthesis fallback with vertical-specific sample
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(sampleText);
        utt.rate = 1.0;
        utt.lang = v.id === 'diya' ? 'hi-IN' : 'en-US';
        utt.onend = () => setPreviewingId(null);
        utt.onerror = () => setPreviewingId(null);
        window.speechSynthesis.speak(utt);
      } else {
        setPreviewingId(null);
      }
    };

    audio.play().catch(() => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(sampleText);
        utt.rate = 1.0;
        utt.lang = v.id === 'diya' ? 'hi-IN' : 'en-US';
        utt.onend = () => setPreviewingId(null);
        utt.onerror = () => setPreviewingId(null);
        window.speechSynthesis.speak(utt);
      } else {
        setPreviewingId(null);
      }
    });
  };

  const filteredVoices = AVAILABLE_VOICES.filter((v) => {
    const matchesGender = filterGender === 'All' || v.gender === filterGender;
    const matchesSearch =
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.accent.toLowerCase().includes(search.toLowerCase());
    return matchesGender && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Choose an AI Voice</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-[#0066FF] uppercase tracking-wide">
                {verticalDisplayName}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {AVAILABLE_VOICES.length} natural {verticalDisplayName.toLowerCase()} voices • Tailored speech samples and avatars
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Filter and Search */}
        <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-3 bg-white">
          <div className="relative flex-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-2.5 text-slate-400">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search voices by name or accent..."
              className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-[#0066FF]"
            />
          </div>

          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
            {(['All', 'Female', 'Male'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setFilterGender(g)}
                className={`px-2.5 py-1 rounded-md text-[11px] transition-colors cursor-pointer ${
                  filterGender === g ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Voice Cards Grid with Realistic Profile Pictures */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto flex-1">
          {filteredVoices.map((v) => {
            const isSelected = v.voice_id === currentVoiceId || v.id === currentVoiceId;
            const description = getVoiceDescription(v, currentVertical);
            const sampleText = getVoicePreviewText(v, currentVertical);

            return (
              <div
                key={v.id}
                onClick={() => {
                  handleSelect(v);
                }}
                className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer select-none group relative ${
                  isSelected
                    ? 'border-[#0066FF] bg-blue-50/50 shadow-xs ring-1 ring-[#0066FF]'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    {/* Profile Picture Avatar */}
                    <div className="flex items-center gap-3">
                      <div className="relative w-11 h-11 rounded-full overflow-hidden shrink-0 border border-slate-200 shadow-2xs bg-slate-100 ring-2 ring-white">
                        <img
                          src={v.avatarUrl}
                          alt={v.name}
                          className="w-full h-full object-cover object-top"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 bg-blue-100 text-[#0066FF] flex items-center justify-center font-bold text-xs -z-10">
                          {v.name[0]}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900">{v.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                            {v.gender}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium mt-0.5">{v.accent}</div>
                      </div>
                    </div>

                    {/* Selection Indicator */}
                    {isSelected ? (
                      <div className="w-5 h-5 rounded-full bg-[#0066FF] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-slate-300 group-hover:border-slate-400 shrink-0"></div>
                    )}
                  </div>

                  {/* Vertical-tailored Description */}
                  <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed mb-3">
                    {description}
                  </p>
                </div>

                {/* Vertical-aware Audio Preview Button */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={(e) => playPreview(v, e)}
                    className="text-[11px] font-bold text-[#0066FF] hover:underline flex items-center gap-1.5 cursor-pointer"
                  >
                    {previewingId === v.id ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-[#0066FF] animate-ping"></span>
                        <span>Playing {verticalDisplayName} sample...</span>
                      </>
                    ) : (
                      <>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                        <span>Preview {verticalDisplayName} Voice</span>
                      </>
                    )}
                  </button>

                  {justSavedId === v.id && (
                    <span className="text-[10px] font-semibold text-emerald-600 animate-in fade-in flex items-center gap-1">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Saved
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer with Auto-Save Indicator */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              Active: <strong className="text-slate-800">{activeVoice?.name || 'Selected'}</strong> ({activeVoice?.accent || ''})
            </span>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Auto-saved to DB
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#0066FF] text-white text-xs font-bold rounded-lg shadow-xs hover:bg-[#0052cc] transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
