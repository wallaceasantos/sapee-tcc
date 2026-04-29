import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, Bug } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface FallbackProps {
  error: Error | null;
  onRetry: () => void;
}

function ErrorFallback({ error, onRetry }: FallbackProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-[50vh] flex items-center justify-center p-8"
    >
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800 p-8 text-center space-y-6">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
          <Bug className="w-10 h-10 text-red-600 dark:text-red-400" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-gray-900 dark:text-white">
            Oops! Algo deu errado
          </h2>
          <p className="text-gray-500 dark:text-slate-400">
            Encontramos um erro inesperado. Tente recarregar a página.
          </p>
        </div>

        {error && (
          <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 text-left">
            <p className="text-xs font-mono text-red-600 dark:text-red-400 break-all">
              {error.message}
            </p>
          </div>
        )}

        <button
          onClick={onRetry}
          className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-5 h-5" />
          Recarregar Página
        </button>
      </div>
    </motion.div>
  );
}

export function ErrorBoundary({ children, fallback }: Props) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const errorHandler = (errorEvent: ErrorEvent) => {
      console.error('❌ ErrorBoundary caught an error:', errorEvent.error);
      setHasError(true);
      setError(errorEvent.error);
    };

    window.addEventListener('error', errorHandler);
    
    return () => {
      window.removeEventListener('error', errorHandler);
    };
  }, []);

  const handleRetry = () => {
    setHasError(false);
    setError(null);
    window.location.reload();
  };

  if (hasError) {
    if (fallback) return <>{fallback}</>;
    return <ErrorFallback error={error} onRetry={handleRetry} />;
  }

  return <>{children}</>;
}
