
import React from 'react';
import type { Status } from '../types';
import { Loader2, CheckCircle2, Mic, AlertCircle } from './icons';

interface StatusDisplayProps {
  status: Status;
  message: string;
  error?: string;
}

const StatusIcon: React.FC<{ status: Status }> = ({ status }) => {
  switch (status) {
    case 'loading':
      return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />;
    case 'ready':
      return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    case 'recording':
      return <Mic className="w-4 h-4 animate-pulse text-red-400" />;
    case 'processing':
      return <Loader2 className="w-4 h-4 animate-spin text-purple-400" />;
    case 'error':
      return <AlertCircle className="w-4 h-4 text-red-400" />;
    default:
      return null;
  }
};

const StatusDisplay: React.FC<StatusDisplayProps> = ({ status, message, error }) => {
  return (
    <div className="bg-white/5 rounded-xl p-3 w-full border border-white/10 mb-4 min-h-[52px] flex flex-col justify-center">
      <div className="flex items-center gap-2.5">
        <StatusIcon status={status} />
        <span className="text-xs font-medium text-slate-400">{message}</span>
      </div>
      {error && (
        <div className="mt-2 bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-xs text-red-300">
          {error}
        </div>
      )}
    </div>
  );
};

export default StatusDisplay;
