
import React from 'react';
import { ArrowRightLeft } from './icons';

interface LanguageSelectorProps {
  sourceLang: string;
  targetLang: string;
  setSourceLang: (lang: string) => void;
  setTargetLang: (lang: string) => void;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  sourceLang,
  targetLang,
  setSourceLang,
  setTargetLang,
}) => {
  const handleSwap = () => {
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 w-full border border-white/10 mb-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1">
          <label className="block text-xs text-slate-400 mb-1 font-medium">
            Von
          </label>
          <select
            value={sourceLang}
            onChange={(e) => setSourceLang(e.target.value)}
            className="w-full bg-slate-800/50 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="de">Deutsch</option>
            <option value="en">English</option>
          </select>
        </div>

        <button 
          onClick={handleSwap} 
          className="p-2 rounded-full bg-slate-700/50 hover:bg-slate-600/50 transition-colors mt-5 self-center"
          aria-label="Sprachen tauschen"
        >
          <ArrowRightLeft className="w-5 h-5 text-slate-300" />
        </button>

        <div className="flex-1">
          <label className="block text-xs text-slate-400 mb-1 font-medium text-right">
            Nach
          </label>
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="w-full bg-slate-800/50 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-right"
          >
            <option value="en">English</option>
            <option value="de">Deutsch</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default LanguageSelector;
