
import React from 'react';

interface ResultCardProps {
  icon: React.ReactNode;
  title: string;
  text: string;
  variant: 'transcription' | 'translation';
}

const ResultCard: React.FC<ResultCardProps> = ({ icon, title, text, variant }) => {
  const baseClasses = "backdrop-blur-xl rounded-2xl p-5 border w-full";
  const variantClasses = {
    transcription: "bg-white/5 border-white/10",
    translation: "bg-gradient-to-br from-purple-600/20 to-blue-500/20 border-purple-400/30"
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]}`}>
      <div className="flex items-center gap-2.5 mb-3">
        {icon}
        <h3 className="text-sm font-semibold text-slate-300 tracking-wide">
          {title}
        </h3>
      </div>
      <p className={`leading-relaxed ${variant === 'translation' ? 'text-lg text-white' : 'text-slate-200'}`}>
        {text}
      </p>
    </div>
  );
};

export default ResultCard;
