"use client";
import React from 'react';
import { STRINGS } from '../../../utils/strings/en';

export function VoiceTab() {
  const content = STRINGS.DASHBOARD.COMPONENTS.AI_TABS_CONTENT.VOICE;
  const voices = content.VOICE.OPTIONS;
  return (
    <div className="animate-in fade-in duration-500 bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
      <div className="max-w-4xl">
        <h2 className="text-[18px] font-bold text-gray-900 mb-2">{content.TITLE}</h2>
        <p className="text-[13px] text-gray-500 mb-8">{content.DESCRIPTION}</p>

        <div className="space-y-8">
          
          {/* Provider Select */}
          <div>
            <label className="block text-[13px] font-bold text-gray-700 mb-2">{content.ENGINE.LABEL}</label>
            <select className="w-full md:w-1/2 border border-gray-200 rounded-xl p-3 text-[13px] font-bold text-gray-800 focus:outline-none focus:border-[#0066FF] bg-white cursor-pointer appearance-none">
              <option value="elevenlabs">{content.ENGINE.ELEVEN_LABS}</option>
              <option value="cartesia">{content.ENGINE.CARTESIA}</option>
            </select>
          </div>

          <div className="h-px bg-gray-100 w-full"></div>

          {/* Voice Selection */}
          <div>
            <label className="block text-[13px] font-bold text-gray-700 mb-4">{content.VOICE.LABEL}</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {voices.map(voice => (
                <div key={voice.id} className={`border rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all ${
                  voice.active ? 'border-[#0066FF] bg-[#F0F7FF] ring-1 ring-[#0066FF]' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <div className="flex items-center gap-3">
                    <button className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      voice.active ? 'bg-[#0066FF] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    </button>
                    <div>
                      <div className="text-[14px] font-bold text-gray-900">{voice.name}</div>
                      <div className="text-[11px] font-medium text-gray-500">{voice.type} • {voice.provider}</div>
                    </div>
                  </div>
                  {voice.active && (
                    <div className="text-[#0066FF]">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="h-px bg-gray-100 w-full"></div>

          {/* Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-[13px] font-bold text-gray-700 mb-4">{content.SLIDERS.SPEED}</label>
              <input type="range" min="0" max="100" defaultValue="50" className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0066FF]" />
              <div className="flex justify-between mt-2">
                <span className="text-[11px] font-bold text-gray-400">{content.SLIDERS.SPEED_SLOW}</span>
                <span className="text-[11px] font-bold text-gray-400">{content.SLIDERS.SPEED_NORM}</span>
                <span className="text-[11px] font-bold text-gray-400">{content.SLIDERS.SPEED_FAST}</span>
              </div>
            </div>
            
            <div>
              <label className="block text-[13px] font-bold text-gray-700 mb-4">{content.SLIDERS.PITCH}</label>
              <input type="range" min="0" max="100" defaultValue="50" className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0066FF]" />
              <div className="flex justify-between mt-2">
                <span className="text-[11px] font-bold text-gray-400">{content.SLIDERS.PITCH_LOW}</span>
                <span className="text-[11px] font-bold text-gray-400">{content.SLIDERS.PITCH_NORM}</span>
                <span className="text-[11px] font-bold text-gray-400">{content.SLIDERS.PITCH_HIGH}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button className="px-6 py-2.5 bg-[#0066FF] text-white rounded-lg text-[13px] font-bold shadow-sm hover:bg-[#0052cc] transition-colors">
              {content.SAVE}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
