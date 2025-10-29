import React, { useState, useRef, useEffect } from "react";
import { pipeline } from "@huggingface/transformers";
import { KokoroTTS } from "kokoro-js";
import type { Status } from "./types";

import Header from "./components/Header";
import StatusDisplay from "./components/StatusDisplay";
import RecordButton from "./components/RecordButton";
import ResultCard from "./components/ResultCard";
import { Mic, Volume2 } from "./components/icons";

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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isRecordingRef = useRef(false);

  useEffect(() => {
    loadModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadModels = async () => {
    if (whisperPipeline && translationPipeline && ttsInstance) {
      setStatus("ready");
      setStatusMessage("Bereit - Halte den Button gedrückt");
      return;
    }

    setStatus("loading");
    setStatusMessage("Modelle werden geladen...");

    try {
      if (!whisperPipeline) {
        setStatusMessage("Lade Spracherkennung (Whisper)...");
        whisperPipeline = await pipeline(
          "automatic-speech-recognition",
          "Xenova/whisper-tiny"
        );
      }
      if (!translationPipeline) {
        setStatusMessage("Lade Übersetzer (Opus-MT)...");
        translationPipeline = await pipeline(
          "translation",
          "Xenova/opus-mt-de-en"
        );
      }
      if (!ttsInstance) {
        setStatusMessage("Lade Sprachausgabe (Kokoro)...");
        ttsInstance = await KokoroTTS.from_pretrained(
          "onnx-community/Kokoro-82M-ONNX",
          { dtype: "q8" }
        );
      }
      setStatus("ready");
      setStatusMessage("Bereit - Halte den Button gedrückt");
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

      setStatusMessage("Transkribiere...");
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

      setStatusMessage("Übersetze Text...");
      const translationResult = await translationPipeline(transcriptText);
      const translatedText = translationResult[0]?.translation_text || "";
      setTranslation(translatedText);

      if (translatedText && ttsInstance) {
        setStatusMessage("Generiere Sprachausgabe...");
        const audio = await ttsInstance.generate(translatedText, {
          voice: "af_sky",
        });
        const blob = new Blob([audio.toWav()], { type: "audio/wav" });
        const url = URL.createObjectURL(blob);
        new Audio(url).play();
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

  return (
    <div className="min-h-screen bg-[#131314] text-white flex flex-col items-center p-4">
      <main className="container mx-auto max-w-2xl w-full flex flex-col items-center justify-center flex-grow">
        <Header />

        <div className="w-full max-w-md flex flex-col items-center">
          <StatusDisplay
            status={status}
            message={statusMessage}
            error={error}
          />
          <RecordButton
            status={status}
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={stopRecording}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          />
        </div>

        {(transcription || translation) && (
          <div className="w-full max-w-md mt-4 space-y-4">
            {transcription && (
              <ResultCard
                icon={<Mic className="w-4 h-4 text-slate-400" />}
                title="Erkannter Text"
                text={transcription}
                variant="transcription"
              />
            )}
            {translation && (
              <ResultCard
                icon={<Volume2 className="w-4 h-4 text-purple-300" />}
                title="Übersetzung"
                text={translation}
                variant="translation"
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
