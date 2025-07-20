import React, { useState, useEffect, useRef } from 'react';
import bridgboxLogo from '../assets/logo.png';

// A new, light-mode version of the Globe component
const Globe = () => (
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full">
        <defs>
            <radialGradient id="grad-light" cx="30%" cy="30%" r="70%">
                <stop offset="0%" style={{ stopColor: 'rgba(200, 200, 200, 0.2)', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: 'rgba(255, 255, 255, 0)', stopOpacity: 1 }} />
            </radialGradient>
            <path id="circlePath" d="M 100, 100 m -75, 0 a 75,75 0 1,1 150,0 a 75,75 0 1,1 -150,0" />
            <path id="arcPath1" d="M 50,60 A 80 80 0 0 1 150 140" stroke="none" fill="none" />
            <path id="arcPath2" d="M 40,120 A 90 70 0 0 1 160 80" stroke="none" fill="none" />
            <path id="arcPath3" d="M 140,50 A 70 70 0 0 1 60 150" stroke="none" fill="none" />
        </defs>

        <circle cx="100" cy="100" r="75" fill="url(#grad-light)" stroke="#DDDDDD" strokeWidth="0.2" />

        {/* Nodes on the globe */}
        {[...Array(15)].map((_, i) => (
            <circle key={i} r="1" fill="#AAAAAA" className="animate-pulse">
                <animateMotion dur={`${5 + i % 5}s`} repeatCount="indefinite" rotate="auto">
                    <mpath href="#circlePath" />
                </animateMotion>
            </circle>
        ))}

        {/* Animated Arcs */}
        <circle r="1.5" fill="#FF3142" className="animate-arc-one">
            <animateMotion dur="3s" repeatCount="indefinite" rotate="auto">
                <mpath href="#arcPath1" />
            </animateMotion>
        </circle>
        <circle r="1.5" fill="#FF3142" className="animate-arc-two">
            <animateMotion dur="2.5s" repeatCount="indefinite" rotate="auto">
                <mpath href="#arcPath2" />
            </animateMotion>
        </circle>
        <circle r="1.5" fill="#FF3142" className="animate-arc-three">
            <animateMotion dur="3.5s" repeatCount="indefinite" rotate="auto">
                <mpath href="#arcPath3" />
            </animateMotion>
        </circle>
    </svg>
);


export default function ConnectPage({ connectWallet, isLoading, error, isWalletReady }) {
  let buttonText = 'Connect Wallet';
  let isButtonDisabled = isLoading || !isWalletReady;

  if (isLoading) {
    buttonText = 'Connecting...';
  } else if (!isWalletReady) {
    buttonText = 'Detecting Wallet...';
  }
  
  return (
    <div className="h-screen w-full bg-gray-50 text-gray-900 flex flex-col items-center justify-center text-center p-8 overflow-hidden relative">
        <style>
            {`
                .animate-arc-one { animation: arc-animation 3s infinite; }
                .animate-arc-two { animation: arc-animation 2.5s infinite 0.5s; }
                .animate-arc-three { animation: arc-animation 3.5s infinite 1s; }
                @keyframes arc-animation { 0% { opacity: 0; } 50% { opacity: 1; } 100% { opacity: 0; } }
                @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
                .content-animation { animation: fade-in-up 1s ease-out forwards; }
                .animate-spin-slow { animation: spin 40s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}
        </style>

        <div className="absolute inset-0 opacity-40 animate-spin-slow">
            <Globe />
        </div>
        
        <div className="relative z-10 flex flex-col items-center max-w-lg content-animation">
            <img src={bridgboxLogo} alt="Bridgbox Logo" className="h-9 w-auto mb-8" />

            <h1 className="text-4xl lg:text-6xl font-bold mb-4 text-gray-900">
                Communication, Reimagined.
            </h1>
            <p className="text-lg text-gray-600 mb-10">
                Enter a new era of communication. Private and Permanent
            </p>
            
            <button 
              onClick={connectWallet} 
              disabled={isButtonDisabled} 
              className="w-full bg-[#FF3142] text-white font-bold px-10 py-4 rounded-lg text-lg hover:opacity-90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              {buttonText}
            </button>
            
            {error && <div className="text-red-500 mt-6">{error}</div>}
        </div>
    </div>
  );
}