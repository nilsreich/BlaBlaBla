import React, { useState, useRef, useEffect } from "react";
import { pipeline } from "@huggingface/transformers";
import { KokoroTTS } from "kokoro-js";
import type { Status } from "./types";

import { 
  Mic, 
  Volume2, 
  Download, 
  ArrowRightLeft, 
  X, 
  Copy, 
  Share2, 
  Maximize2, 
  Camera, 
  MessageCircle 
} from "./components/icons";

// Singleton instances for models to avoid reloading
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let whisperPipeline: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let translationPipeline: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ttsInstance: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ocrPipeline: any = null;

// Supported languages
const SUPPORTED_LANGUAGES = [
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'en-GB', name: 'English (UK)', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'pt-BR', name: 'Português (BR)', flag: '🇧🇷' },
];

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  // Language selection states
  const [sourceLang, setSourceLang] = useState("de");
  const [targetLang, setTargetLang] = useState("en");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isRecordingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadModels();
    
    // Listen for the beforeinstallprompt event
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  }, []);

  const loadModels = async () => {
    if (whisperPipeline && translationPipeline && ttsInstance && ocrPipeline) {
      setStatus("ready");
      setStatusMessage("Bereit - Button gedrückt halten");
      setShowDownloadInfo(false);
      return;
    }

    setStatus("loading");
    setLoadingProgress(0);
    setDownloadedMB(0);
    setStatusMessage("Modelle werden geladen (ca. 330 MB)...");

    try {
      if (!whisperPipeline) {
        setStatusMessage("Lade Spracherkennung (Whisper)... 1/4");
        setDownloadedMB(25);
        setLoadingProgress(8);
        whisperPipeline = await pipeline(
          "automatic-speech-recognition",
          "Xenova/whisper-small"
        );
        setDownloadedMB(82);
        setLoadingProgress(25);
      }
      if (!translationPipeline) {
        setStatusMessage("Lade Übersetzer (Opus-MT)... 2/4");
        setDownloadedMB(99);
        setLoadingProgress(30);
        translationPipeline = await pipeline(
          "translation",
          "Xenova/opus-mt-de-en"
        );
        setDownloadedMB(163);
        setLoadingProgress(50);
      }
      if (!ocrPipeline) {
        setStatusMessage("Lade OCR (Granite Docling)... 3/4");
        setDownloadedMB(180);
        setLoadingProgress(55);
        ocrPipeline = await pipeline(
          "image-to-text",
          "onnx-community/granite-docling-258M-ONNX"
        );
        setDownloadedMB(247);
        setLoadingProgress(75);
      }
      if (!ttsInstance) {
        setStatusMessage("Lade Sprachausgabe (Kokoro)... 4/4");
        setDownloadedMB(257);
        setLoadingProgress(78);
        ttsInstance = await KokoroTTS.from_pretrained(
          "onnx-community/Kokoro-82M-ONNX",
          { dtype: "q8" }
        );
        setDownloadedMB(330);
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
      // Map language codes to Whisper language codes
      const whisperLangMap: { [key: string]: string } = {
        'de': 'german',
        'en': 'english',
        'en-GB': 'english',
        'es': 'spanish',
        'fr': 'french',
        'hi': 'hindi',
        'it': 'italian',
        'ja': 'japanese',
        'pt-BR': 'portuguese',
      };
      const whisperLang = whisperLangMap[sourceLang] || 'english';
      
      const transcriptResult = await whisperPipeline(audioUrl, {
        chunk_length_s: 30,
        language: whisperLang,
      });
      const transcriptText = transcriptResult.text?.trim() || "";
      setTranscription(transcriptText);

      if (!transcriptText) {
        setStatus("ready");
        setStatusMessage("⚠️ Keine Sprache erkannt - Bitte erneut versuchen");
        return;
      }

      // Check if translation is needed
      if (sourceLang === targetLang) {
        // Same language, no translation needed
        setTranslation(transcriptText);
      } else {
        setStatusMessage("🌐 Übersetze...");
        // Note: Current model only supports de->en
        // For other language pairs, we'll use the original text
        if (sourceLang === 'de' && targetLang === 'en') {
          const translationResult = await translationPipeline(transcriptText);
          const translatedText = translationResult[0]?.translation_text || "";
          setTranslation(translatedText);
        } else {
          // For other language combinations, copy the original text
          // TODO: Load appropriate translation models for other language pairs
          setTranslation(transcriptText);
          setStatusMessage("ℹ️ Übersetzung für diese Sprachkombination noch nicht verfügbar");
        }
      }

      const translatedText = translation || transcriptText;

      if (translatedText) {
        const ttsUrl = await generateTTS(translatedText, targetLang);
        if (ttsUrl) {
          setAudioUrl(ttsUrl);
          // Cleanup old audio reference
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
          }
          // Create new audio (don't auto-play)
          audioRef.current = new Audio(ttsUrl);
        }
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

  // Helper function to get Kokoro voice based on target language
  const getKokoroVoice = (lang: string): string | null => {
    const kokoroLanguages: { [key: string]: string } = {
      'en': 'af_sky',     // American English
      'en-US': 'af_sky',
      'en-GB': 'bf_emma', // British English
      'es': 'ef_bella',   // Spanish
      'fr': 'ff_marie',   // French
      'hi': 'hf_riya',    // Hindi
      'it': 'if_lucia',   // Italian
      'ja': 'jf_yuki',    // Japanese
      'pt': 'pf_lara',    // Brazilian Portuguese
      'pt-BR': 'pf_lara',
    };
    return kokoroLanguages[lang] || null;
  };

  // Generate TTS using Kokoro or Web Speech API
  const generateTTS = async (text: string, lang: string): Promise<string | null> => {
    const kokoroVoice = getKokoroVoice(lang);
    
    try {
      if (kokoroVoice && ttsInstance) {
        // Use Kokoro TTS
        setStatusMessage("🔊 Generiere Sprachausgabe (Kokoro)...");
        const audio = await ttsInstance.generate(text, {
          voice: kokoroVoice,
        });
        const blob = new Blob([audio.toWav()], { type: "audio/wav" });
        return URL.createObjectURL(blob);
      } else {
        // Use Web Speech API
        setStatusMessage("🔊 Generiere Sprachausgabe (Browser)...");
        return await generateWebSpeechTTS(text, lang);
      }
    } catch (err) {
      console.error("TTS-Fehler:", err);
      return null;
    }
  };

  // Generate TTS using Web Speech API
  const generateWebSpeechTTS = (text: string, lang: string): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        console.error('Web Speech API nicht unterstützt');
        resolve(null);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      
      // Try to find a voice that matches the language
      const voices = speechSynthesis.getVoices();
      const matchingVoice = voices.find(voice => voice.lang.startsWith(lang));
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }

      // Web Speech API doesn't provide direct audio file access
      // So we'll just trigger the speech and return null for audioUrl
      // The speech will play directly through the API
      speechSynthesis.speak(utterance);
      resolve(null);
    });
  };

  // Handle camera/image upload for OCR
  const handleCameraClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setStatus("processing");
    setError("");
    setTranscription("");
    setTranslation("");
    setAudioUrl(null);

    try {
      setStatusMessage("📷 Lese Bild...");
      const imageUrl = URL.createObjectURL(file);

      setStatusMessage("🔍 Erkenne Text im Bild...");
      const result = await ocrPipeline(imageUrl);
      const extractedText = result[0]?.generated_text?.trim() || "";
      
      URL.revokeObjectURL(imageUrl);

      if (!extractedText) {
        setStatus("ready");
        setStatusMessage("⚠️ Kein Text im Bild gefunden");
        return;
      }

      setTranscription(extractedText);

      setStatusMessage("🌐 Übersetze Text...");
      const translationResult = await translationPipeline(extractedText);
      const translatedText = translationResult[0]?.translation_text || "";
      setTranslation(translatedText);

      if (translatedText) {
        const audioUrl = await generateTTS(translatedText, targetLang);
        if (audioUrl) {
          setAudioUrl(audioUrl);
          // Cleanup old audio reference
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
          }
          // Create new audio (don't auto-play)
          audioRef.current = new Audio(audioUrl);
        }
      }

      setStatus("ready");
      setStatusMessage("✅ Fertig! Bereit für nächste Aufnahme");
    } catch (err) {
      console.error("OCR-Fehler:", err);
      setError("Fehler beim Lesen des Bildes.");
      setStatus("error");
      setStatusMessage("❌ OCR-Fehler");
    }

    // Reset file input
    if (event.target) {
      event.target.value = '';
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

        if (translatedText) {
          const ttsUrl = await generateTTS(translatedText, targetLang);
          if (ttsUrl) {
            setAudioUrl(ttsUrl);
            // Cleanup old audio reference
            if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current = null;
            }
            // Create new audio (don't auto-play on edit)
            audioRef.current = new Audio(ttsUrl);
          }
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
        const ttsUrl = await generateTTS(newTranslation, targetLang);
        if (ttsUrl) {
          setAudioUrl(ttsUrl);
          // Cleanup old audio reference
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
          }
          // Create new audio (don't auto-play on edit)
          audioRef.current = new Audio(ttsUrl);
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

  const handleClear = () => {
    setTranscription("");
    setTranslation("");
    setAudioUrl(null);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleShare = async () => {
    if (navigator.share && translation) {
      try {
        await navigator.share({
          title: 'Übersetzung',
          text: translation
        });
      } catch (err) {
        console.log('Share failed:', err);
      }
    }
  };

  const handleSwapLanguages = () => {
    // Tausche Sprachen
    const tempLang = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(tempLang);
    
    // Tausche auch die Texte
    const tempText = transcription;
    setTranscription(translation);
    setTranslation(tempText);
  };

  const playTranscriptionAudio = () => {
    // Spiele Original-Audio ab (wenn vorhanden)
    if (audioUrl && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    }
  };

  return (
    <div className="bg-gray-900 text-gray-200 flex flex-col h-screen">
      {/* Hidden file input for camera/image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* 1. Header (Sprachauswahl) */}
      <header className="flex justify-around items-center p-4 border-b border-gray-700 shadow-md gap-2">
        {/* Source Language Selector */}
        <select
          value={sourceLang}
          onChange={(e) => setSourceLang(e.target.value)}
          className="text-base font-semibold py-2 px-4 bg-gray-800 rounded-full text-white hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          {SUPPORTED_LANGUAGES.map(lang => (
            <option key={lang.code} value={lang.code}>
              {lang.flag} {lang.name}
            </option>
          ))}
        </select>
        
        {/* Pfeil-Tausch-Icon */}
        <button 
          onClick={handleSwapLanguages}
          className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
          aria-label="Sprachen tauschen"
        >
          <ArrowRightLeft className="w-6 h-6" />
        </button>
        
        {/* Target Language Selector */}
        <select
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
          className="text-base font-semibold py-2 px-4 bg-gray-800 rounded-full text-white hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          {SUPPORTED_LANGUAGES.map(lang => (
            <option key={lang.code} value={lang.code}>
              {lang.flag} {lang.name}
            </option>
          ))}
        </select>
      </header>

      {/* Loading Progress */}
      {showDownloadInfo && status === "loading" && (
        <div className="mx-4 mt-4 bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
          <h3 className="text-sm font-semibold text-blue-300 mb-2">
            Erstmaliger Download
          </h3>
          <p className="text-xs text-gray-400 mb-2">
            KI-Modelle werden heruntergeladen ({downloadedMB} / 330 MB)
          </p>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {statusMessage}
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mx-4 mt-4 bg-red-500/10 rounded-xl p-4 border border-red-500/20">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* 2. Hauptinhalt (Eingabe- und Ausgabefelder) */}
      <main className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
        {/* Eingabebereich */}
        <div className="relative flex-1 flex flex-col bg-gray-800 rounded-xl p-4 shadow-lg">
          {/* 'X' (Löschen) Icon oben rechts */}
          {transcription && (
            <button 
              onClick={handleClear}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors z-10"
              aria-label="Text löschen"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Textarea für die Eingabe */}
          <textarea 
            value={transcription}
            onChange={(e) => handleTranscriptionChange(e.target.value)}
            className="flex-1 bg-transparent text-white text-2xl w-full resize-none focus:outline-none placeholder-gray-500 pr-10" 
            placeholder="Text eingeben..."
          />
          
          {/* Icons unten (Lautsprecher, Kopieren) */}
          <div className="flex justify-between items-center pt-2">
            {/* Lautsprecher */}
            <button 
              onClick={playTranscriptionAudio}
              disabled={!transcription}
              className="text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Vorlesen"
            >
              <Volume2 className="w-6 h-6" />
            </button>
            {/* Kopieren */}
            <button 
              onClick={() => handleCopy(transcription)}
              disabled={!transcription}
              className="text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Kopieren"
            >
              <Copy className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Ausgabebereich */}
        <div className="relative flex-1 flex flex-col bg-gray-800 rounded-xl p-4 shadow-lg">
          {/* Ausgabe-Text als editierbares Textarea */}
          <textarea 
            value={translation}
            onChange={(e) => handleTranslationChange(e.target.value)}
            className="flex-1 bg-transparent text-white text-2xl w-full resize-none focus:outline-none placeholder-gray-500 overflow-y-auto scrollbar-thin" 
            placeholder={
              status === "loading" ? "Modelle werden geladen..." : 
              status === "recording" ? "Aufnahme läuft..." :
              status === "processing" ? "Verarbeite..." : 
              "Übersetzung..."
            }
          />
          
          {/* Icons unten (Lautsprecher, Kopieren, Teilen, Vollbild) */}
          <div className="flex justify-between items-center pt-2">
            <div className="flex gap-6">
              {/* Lautsprecher */}
              <button 
                onClick={playAudio}
                disabled={!audioUrl}
                className="text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Übersetzung vorlesen"
              >
                <Volume2 className="w-6 h-6" />
              </button>
              {/* Kopieren */}
              <button 
                onClick={() => handleCopy(translation)}
                disabled={!translation}
                className="text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Übersetzung kopieren"
              >
                <Copy className="w-6 h-6" />
              </button>
            </div>
            <div className="flex gap-6">
              {/* Teilen */}
              <button 
                onClick={handleShare}
                disabled={!translation}
                className="text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Teilen"
              >
                <Share2 className="w-6 h-6" />
              </button>
              {/* Vollbild */}
              {showInstallButton && (
                <button 
                  onClick={handleInstallClick}
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="Als App installieren"
                >
                  <Download className="w-6 h-6" />
                </button>
              )}
              <button 
                disabled
                className="text-gray-400 opacity-30 cursor-not-allowed"
                aria-label="Vollbild"
              >
                <Maximize2 className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* 3. Bottom Navigation (Aktionsleiste) */}
      <nav className="flex justify-around items-center p-4 border-t border-gray-700 bg-gray-900">
        {/* Kamera */}
        <button 
          onClick={handleCameraClick}
          disabled={status === "loading" || status === "processing"}
          className="flex flex-col items-center text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Camera className="w-7 h-7" />
          <span className="text-xs mt-1">Kamera</span>
        </button>
        
        {/* Mikrofon (Hauptaktion) */}
        <button 
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onMouseLeave={stopRecording}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          disabled={status !== "ready" && status !== "recording"}
          className={`flex flex-col items-center transition-all transform ${
            status === "recording" 
              ? "text-red-400 scale-110" 
              : "text-blue-400 hover:text-blue-300 scale-110"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <Mic className="w-8 h-8" />
          <span className="text-xs mt-1">
            {status === "recording" ? "Recording..." : "Mikrofon"}
          </span>
        </button>
        
        {/* Konversation */}
        <button 
          disabled
          className="flex flex-col items-center text-gray-500 cursor-not-allowed opacity-50"
        >
          <MessageCircle className="w-7 h-7" />
          <span className="text-xs mt-1">Konversation</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
