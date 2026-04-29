import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';

interface Step {
  title: string;
  text: string;
}

interface OnboardingTourProps {
  steps: Step[];
  isRunning: boolean;
  onFinish: () => void;
  onClose: () => void;
}

export default function OnboardingTour({ steps, isRunning, onFinish, onClose }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!isRunning) setCurrentStep(0);
  }, [isRunning]);

  if (!isRunning || steps.length === 0) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden"
        >
          <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }} />
          
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full">
                Passo {currentStep + 1}/{steps.length}
              </span>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{step.title}</h2>
            <p className="text-gray-600 dark:text-slate-300 mb-8 text-lg leading-relaxed whitespace-pre-line">{step.text}</p>
            
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentStep(prev => prev - 1)}
                disabled={currentStep === 0}
                className="p-2 text-gray-500 disabled:opacity-30 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              
              <button
                onClick={() => isLast ? onFinish() : setCurrentStep(prev => prev + 1)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg ${
                  isLast 
                    ? 'bg-green-600 hover:bg-green-700 text-white hover:shadow-green-500/20' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-blue-500/20'
                }`}
              >
                {isLast ? (
                  <>Começar a usar <Check className="w-5 h-5" /></>
                ) : (
                  <>Próximo passo <ChevronRight className="w-5 h-5" /></>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}