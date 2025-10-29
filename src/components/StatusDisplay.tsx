
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
      return <Loader2 className="w-5 h-5 animate-spin text-blue-400" />;
    case 'ready':
      return <CheckCircle2 className="w-5 h-5 text-green-400" />;
    case 'recording':
      return <Mic className="w-5 h-5 animate-pulse text-red-400" />;
    case 'processing':
      return <Loader2 className="w-5 h-5 animate-spin text-purple-400" />;
    case 'error':
      return <AlertCircle className="w-5 h-5 text-red-400" />;
    default:
      return null;
  }
};

const StatusDisplay: React.FC<StatusDisplayProps> = ({ status, message, error }) => {
  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 w-full border border-white/10 mb-6 min-h-[60px] flex flex-col justify-center">
      <div className="flex items-center gap-3">
        <StatusIcon status={status} />
        <span className="text-sm font-medium text-slate-300">{message}</span>
      </div>
      {error && (
        <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-300">
          {error}
        </div>
      )}
    </div>
  );
};

export default StatusDisplay;
