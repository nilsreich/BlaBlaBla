import React from "react";
import type { Status } from "../types";
import { Mic, Loader2 } from "./icons";

interface RecordButtonProps {
  status: Status;
  onMouseDown: () => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

const RecordButton: React.FC<RecordButtonProps> = (props) => {
  const { status, ...handlers } = props;
  const isDisabled = status === "loading" || status === "processing";
  const isRecording = status === "recording";

  return (
    <div className="flex flex-col items-center my-4">
      <button
        {...handlers}
        disabled={isDisabled}
        aria-label={isRecording ? "Aufnahme stoppen" : "Aufnahme starten"}
        className={`
          relative w-24 h-24 rounded-full transition-all duration-200
          flex items-center justify-center text-white
          focus:outline-none focus:ring-2 focus:ring-purple-500/50
          disabled:opacity-50 disabled:cursor-not-allowed
          ${
            isRecording
              ? "bg-red-500 scale-110 shadow-[0_0_25px_5px] shadow-red-500/50"
              : "bg-purple-600 hover:scale-105 active:scale-95 shadow-lg shadow-purple-500/20"
          }
        `}
      >
        {isRecording && (
          <div className="absolute inset-0 rounded-full bg-red-500 animate-ping-slow opacity-50" />
        )}

        <div className="relative z-10">
          {isDisabled ? (
            <Loader2 className="w-10 h-10 animate-spin" />
          ) : (
            <Mic className="w-10 h-10" />
          )}
        </div>
      </button>
      {!isDisabled && !isRecording && (
        <p className="text-xs text-slate-500 mt-2 text-center">
          Gedrückt halten zum Aufnehmen
        </p>
      )}
      <style>{`
        @keyframes ping-slow {
          75%, 100% {
            transform: scale(1.4);
            opacity: 0;
          }
        }
        .animate-ping-slow {
          animation: ping-slow 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
};

export default RecordButton;
