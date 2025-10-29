import React, { useState, useRef, useEffect } from "react";
import { pipeline } from "@huggingface/transformers";
import { KokoroTTS } from "kokoro-js";
import type { Status } from "./types";

import Header from "./components/Header";
import StatusDisplay from "./components/StatusDisplay";
import RecordButton from "./components/RecordButton";
import EditableResultCard from "./components/EditableResultCard";
import { Mic, Volume2, Download } from "./components/icons";

// Singleton instances for models to avoid reloading
let whisperPipeline: any = null;
let translationPipeline: any = null;
let ttsInstance: any = null;

function App() {
  const [status, setStatus] = useState<Status>("idle");
  const [statusMessage, setStatusMessage] = useState(
    "Modelle initialisieren..."
  );
  const [transcription, setTranscription] = useState("");
  const [translation, setTranslation] = useState("");
  const [error, setError] = useState("");
  const [showDownloadInfo, setShowDownloadInfo] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [downloadedMB, setDownloadedMB] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isRecordingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadModels();
    
    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the default install prompt
      e.preventDefault();
      // Store the event for later use
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadModels = async () => {
    if (whisperPipeline && translationPipeline && ttsInstance) {
      setStatus("ready");
      setStatusMessage("Bereit - Button gedrückt halten");
      setShowDownloadInfo(false);
      return;
    }

    setStatus("loading");
    setLoadingProgress(0);
    setDownloadedMB(0);
    setStatusMessage("Modelle werden geladen (ca. 247 MB)...");

    try {
      if (!whisperPipeline) {
        setStatusMessage("Lade Spracherkennung (Whisper)... 1/3");
        setDownloadedMB(25);
        setLoadingProgress(10);
        whisperPipeline = await pipeline(
          "automatic-speech-recognition",
          "Xenova/whisper-tiny"
        );
        setDownloadedMB(82);
        setLoadingProgress(33);
      }
      if (!translationPipeline) {
        setStatusMessage("Lade Übersetzer (Opus-MT)... 2/3");
        setDownloadedMB(99);
        setLoadingProgress(40);
        translationPipeline = await pipeline(
          "translation",
          "Xenova/opus-mt-de-en"
        );
        setDownloadedMB(163);
        setLoadingProgress(66);
      }
      if (!ttsInstance) {
        setStatusMessage("Lade Sprachausgabe (Kokoro)... 3/3");
        setDownloadedMB(173);
        setLoadingProgress(70);
        ttsInstance = await KokoroTTS.from_pretrained(
          "onnx-community/Kokoro-82M-ONNX",
          { dtype: "q8" }
        );
        setDownloadedMB(247);
        setLoadingProgress(100);
      }
      setStatus("ready");
      setStatusMessage("Bereit - Button gedrückt halten");
      setShowDownloadInfo(false);
      setError("");
    } catch (err) {
      console.error("Fehler beim Laden der Modelle:", err);
      setStatus("error");
      setError(
        "Ein Fehler ist beim Laden der KI-Modelle aufgetreten. Bitte lade die Seite neu."
      );
      setStatusMessage("Fehler beim Laden");
    }
  };

  const startRecording = async () => {
    if (status !== "ready" || isRecordingRef.current) return;
    setError("");
    setTranscription("");
    setTranslation("");
    setAudioUrl(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      isRecordingRef.current = true;

      recorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        processRecording();
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setStatus("recording");
      setStatusMessage("🎤 Aufnahme läuft - Taste loslassen zum Beenden");
    } catch (err) {
      console.error("Mikrofon-Fehler:", err);
      setError(
        "Mikrofon-Zugriff verweigert. Bitte erlaube den Zugriff in deinen Browser-Einstellungen."
      );
      setStatus("error");
      setStatusMessage("Mikrofon-Fehler");
    }
  };

  const stopRecording = () => {
    if (
      !isRecordingRef.current ||
      !mediaRecorderRef.current ||
      status !== "recording"
    )
      return;

    isRecordingRef.current = false;
    mediaRecorderRef.current.stop();
    setStatus("processing");
    setStatusMessage("⏳ Verarbeite Aufnahme...");
  };

  const processRecording = async () => {
    if (audioChunksRef.current.length === 0) {
      setStatus("ready");
      setStatusMessage("⚠️ Leere Aufnahme - Bitte erneut versuchen");
      return;
    }
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
      const audioUrl = URL.createObjectURL(audioBlob);

      setStatusMessage("🎯 Transkribiere Audio...");
      const transcriptResult = await whisperPipeline(audioUrl, {
        language: "de",
        chunk_length_s: 30,
      });
      const transcriptText = transcriptResult.text?.trim() || "";
      setTranscription(transcriptText);

      if (!transcriptText) {
        setStatus("ready");
        setStatusMessage("⚠️ Keine Sprache erkannt - Bitte erneut versuchen");
        return;
      }

      setStatusMessage("🌐 Übersetze ins Englische...");
      const translationResult = await translationPipeline(transcriptText);
      const translatedText = translationResult[0]?.translation_text || "";
      setTranslation(translatedText);

      if (translatedText && ttsInstance) {
        setStatusMessage("🔊 Generiere Sprachausgabe...");
        const audio = await ttsInstance.generate(translatedText, {
          voice: "af_sky",
        });
        const blob = new Blob([audio.toWav()], { type: "audio/wav" });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        // Cleanup old audio reference
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
        
        // Create and play audio
        audioRef.current = new Audio(url);
        audioRef.current.play();
      }

      setStatus("ready");
      setStatusMessage("✅ Fertig! Bereit für nächste Aufnahme");
    } catch (err) {
      console.error("Verarbeitungsfehler:", err);
      setError("Fehler bei der Verarbeitung der Aufnahme.");
      setStatus("error");
      setStatusMessage("❌ Verarbeitungsfehler");
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    startRecording();
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    stopRecording();
  };

  const playAudio = () => {
    if (audioUrl && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    }
  };

  const handleTranscriptionChange = async (newTranscription: string) => {
    setTranscription(newTranscription);
    
    // Clear any pending updates
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    if (!newTranscription.trim()) {
      setTranslation("");
      setAudioUrl(null);
      return;
    }

    // Debounce the update - wait for user to finish typing
    updateTimeoutRef.current = setTimeout(async () => {
      try {
        setStatusMessage("🌐 Aktualisiere Übersetzung...");
        
        const translationResult = await translationPipeline(newTranscription);
        const translatedText = translationResult[0]?.translation_text || "";
        setTranslation(translatedText);

        if (translatedText && ttsInstance) {
          setStatusMessage("🔊 Generiere Sprachausgabe...");
          const audio = await ttsInstance.generate(translatedText, {
            voice: "af_sky",
          });
          const blob = new Blob([audio.toWav()], { type: "audio/wav" });
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
          
          // Cleanup old audio reference
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
          }
          
          // Create new audio (don't auto-play on edit)
          audioRef.current = new Audio(url);
        }

        setStatusMessage("✅ Aktualisiert!");
        setTimeout(() => {
          setStatusMessage("Bereit - Button gedrückt halten");
        }, 2000);
      } catch (err) {
        console.error("Update-Fehler:", err);
        setError("Fehler beim Aktualisieren der Übersetzung.");
      }
    }, 1000); // Wait 1 second after user stops typing
  };

  const handleTranslationChange = async (newTranslation: string) => {
    setTranslation(newTranslation);
    
    // Clear any pending updates
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    if (!newTranslation.trim()) {
      setAudioUrl(null);
      return;
    }

    // Debounce the TTS update
    updateTimeoutRef.current = setTimeout(async () => {
      try {
        setStatusMessage("🔊 Generiere Sprachausgabe...");
        
        if (ttsInstance) {
          const audio = await ttsInstance.generate(newTranslation, {
            voice: "af_sky",
          });
          const blob = new Blob([audio.toWav()], { type: "audio/wav" });
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
          
          // Cleanup old audio reference
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
          }
          
          // Create new audio (don't auto-play on edit)
          audioRef.current = new Audio(url);
        }

        setStatusMessage("✅ Sprachausgabe aktualisiert!");
        setTimeout(() => {
          setStatusMessage("Bereit - Button gedrückt halten");
        }, 2000);
      } catch (err) {
        console.error("TTS-Update-Fehler:", err);
        setError("Fehler beim Aktualisieren der Sprachausgabe.");
      }
    }, 1000); // Wait 1 second after user stops typing
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }

    // Clear the deferred prompt
    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

  return (
    <div className="h-screen overflow-hidden bg-[#0a0a0b] text-white flex flex-col p-3">
      <main className="container mx-auto max-w-lg w-full h-full flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <Header />
          {showInstallButton && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded-lg text-xs font-medium transition-colors"
              aria-label="App installieren"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Installieren</span>
            </button>
          )}
        </div>

        {showDownloadInfo && status === "loading" && (
          <div className="mb-3 bg-blue-500/5 rounded-xl p-3 border border-blue-500/20 flex-shrink-0">
            <h3 className="text-sm font-semibold text-blue-300 mb-2">
              Erstmaliger Download
            </h3>
            <p className="text-xs text-slate-400 mb-2">
              KI-Modelle werden heruntergeladen und lokal gespeichert.
            </p>
            
            {/* Progress Bar */}
            <div className="w-full bg-slate-800/50 rounded-full h-2 mb-1">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            <div className="flex justify-between items-center">
              <p className="text-xs text-slate-500">
                {downloadedMB} / 247 MB
              </p>
              <p className="text-xs text-slate-400 font-medium">
                {loadingProgress}%
              </p>
            </div>
            
            <p className="text-xs text-slate-500 mt-2">
              Danach funktioniert die App komplett offline!
            </p>
          </div>
        )}

        <div className="flex-shrink-0">
          <StatusDisplay
            status={status}
            message={statusMessage}
            error={error}
          />
        </div>

        <div className="flex-shrink-0">
          <RecordButton
            status={status}
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={stopRecording}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          />
        </div>

        <div className="space-y-3 flex-shrink-0 mt-auto pb-2">
          <EditableResultCard
            icon={<Mic className="w-3.5 h-3.5 text-slate-500" />}
            title="Erkannter Text"
            text={transcription}
            variant="transcription"
            onTextChange={handleTranscriptionChange}
            placeholder="Warte auf Aufnahme..."
          />
          <EditableResultCard
            icon={<Volume2 className="w-3.5 h-3.5 text-purple-400" />}
            title="Übersetzung"
            text={translation}
            variant="translation"
            showPlayButton={!!audioUrl}
            onPlay={playAudio}
            onTextChange={handleTranslationChange}
            placeholder="Warte auf Übersetzung..."
          />
        </div>
      </main>
    </div>
  );
}

export default App;
