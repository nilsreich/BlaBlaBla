import React, { useState, useRef, useEffect } from "react";
import { pipeline } from "@huggingface/transformers";
import { KokoroTTS } from "kokoro-js";
import type { Status } from "./types";

import Header from "./components/Header";
import StatusDisplay from "./components/StatusDisplay";
import RecordButton from "./components/RecordButton";
import ResultCard from "./components/ResultCard";
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
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isRecordingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
      setStatusMessage("Bereit - Halte den Button gedrückt");
      setShowDownloadInfo(false);
      return;
    }

    setStatus("loading");
    setLoadingProgress(0);
    setStatusMessage("Modelle werden geladen (ca. 486 MB)...");

    try {
      if (!whisperPipeline) {
        setStatusMessage("Lade Spracherkennung (Whisper)... 1/3");
        setLoadingProgress(10);
        whisperPipeline = await pipeline(
          "automatic-speech-recognition",
          "Xenova/whisper-tiny"
        );
        setLoadingProgress(33);
      }
      if (!translationPipeline) {
        setStatusMessage("Lade Übersetzer (Opus-MT)... 2/3");
        setLoadingProgress(40);
        translationPipeline = await pipeline(
          "translation",
          "Xenova/opus-mt-de-en"
        );
        setLoadingProgress(66);
      }
      if (!ttsInstance) {
        setStatusMessage("Lade Sprachausgabe (Kokoro)... 3/3");
        setLoadingProgress(70);
        ttsInstance = await KokoroTTS.from_pretrained(
          "onnx-community/Kokoro-82M-ONNX",
          { dtype: "q8" }
        );
        setLoadingProgress(100);
      }
      setStatus("ready");
      setStatusMessage("Bereit - Halte den Button gedrückt");
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
      setStatusMessage("Aufnahme läuft...");
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
    setStatusMessage("Verarbeite Aufnahme...");
  };

  const processRecording = async () => {
    if (audioChunksRef.current.length === 0) {
      setStatus("ready");
      setStatusMessage("Leere Aufnahme. Versuche es erneut.");
      return;
    }
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
      const audioUrl = URL.createObjectURL(audioBlob);

      setStatusMessage("Transkribiere (dauert ein paar Sekunden)...");
      const transcriptResult = await whisperPipeline(audioUrl, {
        language: "de",
        chunk_length_s: 30,
      });
      const transcriptText = transcriptResult.text?.trim() || "";
      setTranscription(transcriptText);

      if (!transcriptText) {
        setStatus("ready");
        setStatusMessage("Keine Sprache erkannt. Versuche es erneut.");
        return;
      }

      setStatusMessage("Übersetze Text (dauert ein paar Sekunden)...");
      const translationResult = await translationPipeline(transcriptText);
      const translatedText = translationResult[0]?.translation_text || "";
      setTranslation(translatedText);

      if (translatedText && ttsInstance) {
        setStatusMessage("Generiere Sprachausgabe (dauert ein paar Sekunden)...");
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
      setStatusMessage("Fertig! Bereit für die nächste Aufnahme.");
    } catch (err) {
      console.error("Verarbeitungsfehler:", err);
      setError("Fehler bei der Verarbeitung der Aufnahme.");
      setStatus("error");
      setStatusMessage("Verarbeitungsfehler");
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
              KI-Modelle (ca. 486 MB) werden heruntergeladen und lokal gespeichert.
            </p>
            
            {/* Progress Bar */}
            <div className="w-full bg-slate-800/50 rounded-full h-2 mb-1">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 text-right mb-2">
              {loadingProgress}%
            </p>
            
            <p className="text-xs text-slate-500">
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
          <ResultCard
            icon={<Mic className="w-3.5 h-3.5 text-slate-500" />}
            title="Erkannter Text"
            text={transcription || "Warte auf Aufnahme..."}
            variant="transcription"
          />
          <ResultCard
            icon={<Volume2 className="w-3.5 h-3.5 text-purple-400" />}
            title="Übersetzung"
            text={translation || "Warte auf Übersetzung..."}
            variant="translation"
            showPlayButton={!!audioUrl}
            onPlay={playAudio}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
