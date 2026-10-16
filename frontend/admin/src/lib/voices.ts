export interface VoiceOption {
  id: string;
  voice_id: string;
  name: string;
  gender: 'Female' | 'Male';
  accent: string;
  avatarUrl: string;
  description: string;
  previewSample: string;
  engine: string;
}

export interface AccentOption {
  code: string;
  label: string;
  speechLang: string;
  flag: string;
}

export const SUPPORTED_ACCENTS: AccentOption[] = [
  { code: 'hi-IN', label: 'Hindi / Hinglish', speechLang: 'hi-IN', flag: '🇮🇳' },
  { code: 'en-IN', label: 'Indian English', speechLang: 'en-IN', flag: '🇮🇳' },
  { code: 'pa-IN', label: 'Punjabi Accent', speechLang: 'pa-IN', flag: '🇮🇳' },
  { code: 'bn-IN', label: 'Bengali Accent', speechLang: 'bn-IN', flag: '🇮🇳' },
  { code: 'en-US', label: 'American English (US)', speechLang: 'en-US', flag: '🇺🇸' },
  { code: 'en-GB', label: 'British English (UK)', speechLang: 'en-GB', flag: '🇬🇧' },
];

export const AVAILABLE_VOICES: VoiceOption[] = [
  {
    id: 'kiara',
    voice_id: 'f8f5f1b2-f02d-4d8e-a40d-fd850a487b3d',
    name: 'Kiara',
    gender: 'Female',
    accent: 'Indian English (upbeat)',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&auto=format&fit=crop&q=80',
    description: 'Upbeat, enunciating Indian-accented English voice for patient triage and clinic inquiries.',
    previewSample: 'Hello, welcome to our clinic! How can I assist you with your appointment today?',
    engine: 'Cartesia Sonic Multilingual',
  },
  {
    id: 'lavanya',
    voice_id: 'c6bbc7d5-4b35-4d49-b1c6-4417019a61c1',
    name: 'Lavanya',
    gender: 'Female',
    accent: 'Hindi / Hinglish (India, upbeat)',
    avatarUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=160&auto=format&fit=crop&q=80',
    description: 'Approachable, upbeat native Hindi voice for patient appointments and clinic questions.',
    previewSample: 'नमस्ते! क्लिनिक में आपका स्वागत है। मैं आपकी अपॉइंटमेंट बुक करने में मदद कर सकती हूँ।',
    engine: 'Cartesia Sonic Multilingual',
  },
  {
    id: 'sagar',
    voice_id: '6303e5fb-a0a7-48f9-bb1a-dd42c216dc5d',
    name: 'Sagar',
    gender: 'Male',
    accent: 'Hindi / Hinglish (India, energetic)',
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=160&auto=format&fit=crop&q=80',
    description: 'Energetic native Hindi voice for patient support and appointment booking.',
    previewSample: 'नमस्ते! क्लिनिक में आपका स्वागत है। बताइए, मैं आपकी क्या मदद कर सकता हूँ?',
    engine: 'Cartesia Sonic Multilingual',
  },
  {
    id: 'meera',
    voice_id: 'a81fccdc-5595-4dfc-ae76-4de6a515b8a2',
    name: 'Meera',
    gender: 'Female',
    accent: 'Hindi / Hinglish (India, friendly)',
    avatarUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=160&auto=format&fit=crop&q=80',
    description: 'Friendly, approachable native Hindi voice for patient interactions and appointments.',
    previewSample: 'नमस्ते! क्लिनिक में आपका स्वागत है। बताइए, कौन सी तारीख़ आपके लिए ठीक रहेगी?',
    engine: 'Cartesia Sonic Multilingual',
  },
  {
    id: 'diya',
    voice_id: 'd2d3584d-1b44-428e-aab1-30255d28d978',
    name: 'Diya',
    gender: 'Female',
    accent: 'Hindi / Hinglish (India)',
    avatarUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=160&auto=format&fit=crop&q=80',
    description: 'Warm and conversational Hindi-English bilingual assistant for patient appointments.',
    previewSample: 'Namaste! Clinic me aapka swagat hai. Main doctor consultation schedule karne me aapki poori madad karungi.',
    engine: 'Cartesia Sonic Multilingual',
  },
  {
    id: 'skylar',
    voice_id: 'db6b0ed5-d5d3-463d-ae85-518a07d3c2b4',
    name: 'Skylar',
    gender: 'Female',
    accent: 'American English',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&auto=format&fit=crop&q=80',
    description: 'Empathetic, clear, and reassuring voice for medical appointments.',
    previewSample: 'Hello, welcome to our clinic. How can I assist you with your doctor appointment today?',
    engine: 'Cartesia Sonic Multilingual',
  },
  {
    id: 'daniel',
    voice_id: '47c38ca4-5f35-497b-b1a3-415245fb35e1',
    name: 'Daniel',
    gender: 'Male',
    accent: 'American English (modern professional)',
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=160&auto=format&fit=crop&q=80',
    description: 'Crisp and articulate male voice for medical appointments, check-ins, and clinic administration.',
    previewSample: 'Good day. Our doctors have open consultation slots available this week. How may I assist you?',
    engine: 'Cartesia Sonic Multilingual',
  },
  {
    id: 'gemma',
    voice_id: '62ae83ad-4f6a-430b-af41-a9bede9286ca',
    name: 'Gemma',
    gender: 'Female',
    accent: 'British English (UK)',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=160&auto=format&fit=crop&q=80',
    description: 'Polite, composed and decisive British accent for clinical reception and patient guidance.',
    previewSample: 'Hello! I can help you schedule or reschedule your medical consultation with our specialists.',
    engine: 'Cartesia Sonic Multilingual',
  },
];

export function getVoiceByModelId(voiceIdOrModel?: string): VoiceOption {
  if (!voiceIdOrModel) return AVAILABLE_VOICES[0];
  const found = AVAILABLE_VOICES.find(
    (v) =>
      v.voice_id.toLowerCase() === voiceIdOrModel.toLowerCase() ||
      v.id.toLowerCase() === voiceIdOrModel.toLowerCase() ||
      v.name.toLowerCase() === voiceIdOrModel.toLowerCase()
  );
  return found || AVAILABLE_VOICES[0];
}

export function getAccentByCode(accentCode?: string): AccentOption {
  if (!accentCode) return SUPPORTED_ACCENTS[0];
  const found = SUPPORTED_ACCENTS.find(
    (a) => a.code.toLowerCase() === accentCode.toLowerCase() || a.speechLang.toLowerCase() === accentCode.toLowerCase()
  );
  return found || SUPPORTED_ACCENTS[0];
}
