import React from 'react';
import { AlertTriangle, Wifi } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface OfflineMessageProps {
  isConnected: boolean;
  onRetry?: () => void;
}

export default function OfflineMessage({ isConnected, onRetry }: OfflineMessageProps) {
  if (isConnected) return null;

  return (
    <Alert className="mb-4 border-yellow-500/20 bg-yellow-500/5">
      <AlertTriangle className="h-4 w-4 text-yellow-500" />
      <AlertDescription className="flex items-center justify-between">
        <span className="text-yellow-200">
          Connection lost. Some features may not work properly.
        </span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center space-x-2 px-3 py-1 text-xs bg-yellow-600 hover:bg-yellow-700 rounded-md transition-colors"
            data-testid="button-retry-connection"
          >
            <Wifi className="h-3 w-3" />
            <span>Retry</span>
          </button>
        )}
      </AlertDescription>
    </Alert>
  );
}