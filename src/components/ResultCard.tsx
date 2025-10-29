
import React from 'react';

interface ResultCardProps {
  icon: React.ReactNode;
  title: string;
  text: string;
  variant: 'transcription' | 'translation';
}

const ResultCard: React.FC<ResultCardProps> = ({ icon, title, text, variant }) => {
  const baseClasses = "backdrop-blur-xl rounded-2xl p-4 border w-full h-28 flex flex-col";
  const variantClasses = {
    transcription: "bg-white/5 border-white/10",
    translation: "bg-gradient-to-br from-purple-600/20 to-blue-500/20 border-purple-400/30"
  };

  const isEmpty = text.startsWith("Warte auf");

  return (
    <div className={`${baseClasses} ${variantClasses[variant]}`}>
      <div className="flex items-center gap-2.5 mb-2 flex-shrink-0">
        {icon}
        <h3 className="text-xs font-semibold text-slate-300 tracking-wide">
          {title}
        </h3>
      </div>
      <div className="overflow-y-auto flex-1 pr-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
        <p className={`text-sm leading-relaxed ${
          isEmpty 
            ? 'text-slate-500 italic' 
            : variant === 'translation' 
              ? 'text-white' 
              : 'text-slate-200'
        }`}>
          {text}
        </p>
      </div>
    </div>
  );
};

export default ResultCard;
