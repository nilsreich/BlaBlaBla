import React from 'react';

const GeminiStar = () => (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 sm:w-11 sm:h-11">
        <path d="M22 2.58398L24.4087 19.5913L41.416 22L24.4087 24.4087L22 41.416L19.5913 24.4087L2.58398 22L19.5913 19.5913L22 2.58398Z" fill="url(#gemini-gradient)" />
        <defs>
            <linearGradient id="gemini-gradient" x1="2.58398" y1="22" x2="41.416" y2="22" gradientUnits="userSpaceOnUse">
                <stop stopColor="#4285F4" />
                <stop offset="0.32" stopColor="#9B72CB" />
                <stop offset="0.67" stopColor="#D96570" />
                <stop offset="1" stopColor="#F2A600" />
            </linearGradient>
        </defs>
    </svg>
);


const Header: React.FC = () => {
  return (
    <header className="text-center mb-8">
      <div className="inline-flex flex-col items-center gap-3 mb-3">
        <GeminiStar />
        <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tighter">
          Voice Translator
        </h1>
      </div>
    </header>
  );
};

export default Header;
