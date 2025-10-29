
import React, { useState, useEffect } from 'react';
import { Play } from './icons';

interface EditableResultCardProps {
  icon: React.ReactNode;
  title: string;
  text: string;
  variant: 'transcription' | 'translation';
  onPlay?: () => void;
  showPlayButton?: boolean;
  onTextChange?: (text: string) => void;
  placeholder?: string;
}

const EditableResultCard: React.FC<EditableResultCardProps> = ({ 
  icon, 
  title, 
  text, 
  variant, 
  onPlay, 
  showPlayButton,
  onTextChange,
  placeholder = "Warte auf Aufnahme..."
}) => {
  const baseClasses = "rounded-xl p-3 border w-full h-24 flex flex-col";
  const variantClasses = {
    transcription: "bg-white/5 border-white/10",
    translation: "bg-gradient-to-br from-purple-600/15 to-blue-500/15 border-purple-400/20"
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(text);

  useEffect(() => {
    setEditValue(text);
  }, [text]);

  const isEmpty = !text || text === "";

  const handleBlur = () => {
    setIsEditing(false);
    if (onTextChange && editValue !== text) {
      onTextChange(editValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleBlur();
    }
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${isEditing ? 'ring-2 ring-purple-500/50' : ''}`}>
      <div className="flex items-center justify-between mb-1.5 flex-shrink-0">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-xs font-semibold text-slate-400">
            {title}
            {isEditing && <span className="ml-1.5 text-purple-400">✏️</span>}
          </h3>
        </div>
        {showPlayButton && onPlay && !isEmpty && !isEditing && (
          <button
            onClick={onPlay}
            className="p-1 rounded-lg bg-purple-600 hover:bg-purple-500 transition-colors"
            aria-label="Sprachausgabe abspielen"
          >
            <Play className="w-3 h-3 text-white" fill="white" />
          </button>
        )}
      </div>
      <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
        {isEditing ? (
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            autoFocus
            className={`w-full h-full bg-transparent border-none outline-none resize-none text-xs leading-relaxed ${
              variant === 'translation' 
                ? 'text-white font-medium' 
                : 'text-slate-300'
            }`}
            placeholder={placeholder}
          />
        ) : (
          <p 
            onClick={() => !isEmpty && setIsEditing(true)}
            className={`text-xs leading-relaxed ${
              isEmpty 
                ? 'text-slate-600 italic' 
                : variant === 'translation' 
                  ? 'text-white font-medium cursor-text' 
                  : 'text-slate-300 cursor-text'
            }`}
          >
            {text || placeholder}
          </p>
        )}
      </div>
    </div>
  );
};

export default EditableResultCard;
