
import React from 'react';
import { Play } from './icons';

interface ResultCardProps {
  icon: React.ReactNode;
  title: string;
  text: string;
  variant: 'transcription' | 'translation';
  onPlay?: () => void;
  showPlayButton?: boolean;
}

const ResultCard: React.FC<ResultCardProps> = ({ icon, title, text, variant, onPlay, showPlayButton }) => {
  const baseClasses = "rounded-xl p-3 border w-full h-24 flex flex-col";
  const variantClasses = {
    transcription: "bg-white/5 border-white/10",
    translation: "bg-gradient-to-br from-purple-600/15 to-blue-500/15 border-purple-400/20"
  };

  const isEmpty = text.startsWith("Warte auf");

  return (
    <div className={`${baseClasses} ${variantClasses[variant]}`}>
      <div className="flex items-center justify-between mb-1.5 flex-shrink-0">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-xs font-semibold text-slate-400">
            {title}
          </h3>
        </div>
        {showPlayButton && onPlay && !isEmpty && (
          <button
            onClick={onPlay}
            className="p-1 rounded-lg bg-purple-600 hover:bg-purple-500 transition-colors"
            aria-label="Sprachausgabe abspielen"
          >
            <Play className="w-3 h-3 text-white" fill="white" />
          </button>
        )}
      </div>
      <div className="overflow-y-auto flex-1 pr-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
        <p className={`text-xs leading-relaxed ${
          isEmpty 
            ? 'text-slate-600 italic' 
            : variant === 'translation' 
              ? 'text-white font-medium' 
              : 'text-slate-300'
        }`}>
          {text}
        </p>
      </div>
    </div>
  );
};

export default ResultCard;
