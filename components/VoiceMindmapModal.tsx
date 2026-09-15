'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionResultList {
  isFinal: boolean;
  [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultList;
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface ISpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface IWindow extends Window {
  webkitSpeechRecognition?: new () => ISpeechRecognition;
  SpeechRecognition?: new () => ISpeechRecognition;
}

interface VoiceMindmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNodeLabel?: string | null;
  onGenerateMap: (transcript: string, mode: 'merge' | 'replace') => Promise<void>;
  isGenerating: boolean;
  error: string | null;
}

export function VoiceMindmapModal({
  isOpen,
  onClose,
  selectedNodeLabel,
  onGenerateMap,
  isGenerating,
  error,
}: VoiceMindmapModalProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [duration, setDuration] = useState(0);
  const [speechSupported, setSpeechSupported] = useState(true);

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Check SpeechRecognition browser support on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const win = window as unknown as IWindow;
      const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setSpeechSupported(false);
      }
    }
  }, []);

  // Timer handling
  useEffect(() => {
    if (isListening) {
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isListening]);

  // Start Speech Recognition
  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;

    const win = window as unknown as IWindow;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalChunk = '';
        let interimChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalChunk += event.results[i][0].transcript + ' ';
          } else {
            interimChunk += event.results[i][0].transcript;
          }
        }

        if (finalChunk) {
          setTranscript((prev) => (prev ? `${prev.trim()} ${finalChunk.trim()}` : finalChunk.trim()));
        }
        setInterimText(interimChunk);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimText('');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to initialize speech recognition:', err);
      setIsListening(false);
    }
  }, []);

  // Stop Speech Recognition
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error(err);
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimText('');
  }, []);

  // Auto-start listening on open if speech supported and empty
  useEffect(() => {
    if (isOpen && speechSupported && !transcript) {
      setDuration(0);
      startListening();
    }
    if (!isOpen) {
      stopListening();
    }
  }, [isOpen, speechSupported, startListening, stopListening, transcript]);

  if (!isOpen) return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleGenerate = () => {
    const fullText = `${transcript} ${interimText}`.trim();
    if (!fullText) return;
    onGenerateMap(fullText, mode);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎙️</span>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Voice-to-Mindmap</h3>
              <p className="text-[11px] text-slate-400">Speak your thoughts out loud to generate a structured map</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopListening();
              onClose();
            }}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-medium"
          >
            ✕
          </button>
        </div>

        {/* Audio Visualizer & Controls */}
        <div className="flex flex-col items-center justify-center py-4 px-6 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 relative overflow-hidden">
          {/* Animated Waveform Bars */}
          <div className="flex items-center justify-center gap-1.5 h-12 mb-3">
            {[40, 70, 30, 90, 50, 100, 60, 80, 45, 95, 35, 75].map((h, i) => (
              <div
                key={i}
                style={{
                  height: isListening ? `${h}%` : '15%',
                  transition: 'height 0.15s ease-in-out',
                  animationDelay: `${i * 0.05}s`,
                }}
                className={`w-1.5 rounded-full ${
                  isListening
                    ? 'bg-gradient-to-t from-blue-600 to-indigo-400 animate-pulse'
                    : 'bg-slate-300 dark:bg-slate-600'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 px-2.5 py-1 rounded-full shadow-sm">
              ⏱️ {formatTime(duration)}
            </span>

            {isListening ? (
              <button
                onClick={stopListening}
                className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs px-4 py-1.5 rounded-full shadow-md transition flex items-center gap-1.5 animate-pulse"
              >
                <span>⏹️</span> Pause Recording
              </button>
            ) : (
              <button
                onClick={startListening}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-1.5 rounded-full shadow-md transition flex items-center gap-1.5"
              >
                <span>🎙️</span> Resume Recording
              </button>
            )}

            {transcript && (
              <button
                onClick={() => {
                  setTranscript('');
                  setInterimText('');
                  setDuration(0);
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 px-2 py-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Live Transcript / Editable Textarea */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Speech Transcript (Editable)
          </label>
          <textarea
            value={transcript + (interimText ? ` ${interimText}` : '')}
            onChange={(e) => {
              setTranscript(e.target.value);
              setInterimText('');
            }}
            placeholder={
              speechSupported
                ? "Start speaking... E.g., 'I want a cybersecurity roadmap covering network security with Wireshark and Nmap, web exploitation with SQL injection, and cloud security...'"
                : "Speech recognition is not supported in this browser. You can type or paste your brainstorm notes here directly!"
            }
            rows={4}
            className="w-full text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed"
          />
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="voiceMode"
              value="merge"
              checked={mode === 'merge'}
              onChange={() => setMode('merge')}
              className="text-blue-600"
            />
            {selectedNodeLabel ? `Attach to "${selectedNodeLabel}"` : 'Merge into Current Map'}
          </label>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="voiceMode"
              value="replace"
              checked={mode === 'replace'}
              onChange={() => setMode('replace')}
              className="text-blue-600"
            />
            Replace Entire Map
          </label>
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-300 p-2.5 rounded-xl border border-red-200 dark:border-red-900">
            {error}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => {
              stopListening();
              onClose();
            }}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || (!transcript.trim() && !interimText.trim())}
            className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 rounded-xl transition shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <span className="animate-spin">🌀</span> Generating Roadmap...
              </>
            ) : (
              <>
                <span>✨</span> Generate Mind Map from Voice
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
