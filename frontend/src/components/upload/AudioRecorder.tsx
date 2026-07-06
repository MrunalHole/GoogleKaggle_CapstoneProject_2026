import { useState, useRef, useCallback } from "react";
import { Mic, Square, Play, Pause, Trash2 } from "lucide-react";
import Button from "../ui/Button";
import "./AudioRecorder.css";

interface AudioRecorderProps {
  onClipReady: (blob: Blob | null) => void;
}

export default function AudioRecorder({ onClipReady }: AudioRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    setPermissionError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioUrl(URL.createObjectURL(blob));
        onClipReady(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setSeconds(0);
      timerRef.current = window.setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } catch {
      setPermissionError(
        "Microphone access was blocked or unavailable. Check your browser's permission settings, or upload an audio file instead."
      );
    }
  }, [onClipReady]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) window.clearInterval(timerRef.current);
  }, []);

  const togglePlayback = useCallback(() => {
    if (!audioElRef.current) return;
    if (playing) {
      audioElRef.current.pause();
    } else {
      audioElRef.current.play();
    }
    setPlaying(!playing);
  }, [playing]);

  const discard = useCallback(() => {
    setAudioUrl(null);
    setSeconds(0);
    setPlaying(false);
    onClipReady(null);
  }, [onClipReady]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="recorder">
      {!audioUrl && (
        <div className="recorder__stage">
          <button
            className={`recorder__dial ${recording ? "recorder__dial--active" : ""}`}
            onClick={recording ? stopRecording : startRecording}
            aria-label={recording ? "Stop recording" : "Start recording"}
          >
            {recording ? <Square size={26} /> : <Mic size={28} />}
          </button>
          <p className="recorder__time">{formatTime(seconds)}</p>
          <p className="recorder__hint">
            {recording
              ? "Recording — say a steady 'aaah' for a few seconds"
              : "Tap to start recording your voice"}
          </p>
          {permissionError && (
            <p className="recorder__error">{permissionError}</p>
          )}
        </div>
      )}

      {audioUrl && (
        <div className="recorder__playback">
          <audio
            ref={audioElRef}
            src={audioUrl}
            onEnded={() => setPlaying(false)}
          />
          <button className="recorder__play-btn" onClick={togglePlayback}>
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <div className="recorder__waveform" aria-hidden="true">
            {Array.from({ length: 28 }).map((_, i) => (
              <span key={i} style={{ height: `${20 + Math.sin(i * 1.3) * 14 + (i % 3) * 6}px` }} />
            ))}
          </div>
          <Button variant="ghost" size="sm" icon={<Trash2 size={15} />} onClick={discard}>
            Delete audio
          </Button>
        </div>
      )}
    </div>
  );
}
