import { useEffect, useRef, useState } from "react";
import { Btn, Icon } from "../components/ui";

export function CameraFairPlay({ onSignal }: { onSignal: (message: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  async function toggleCamera() {
    if (active) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setActive(false);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera checks require a secure browser connection.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setError(null);
      setActive(true);
      onSignal("Camera enabled. Face presence is checked locally; no video leaves this device.");
    } catch {
      setError("Camera permission was not granted.");
    }
  }

  useEffect(() => {
    if (!active) return;
    const detector = (window as unknown as { FaceDetector?: new () => { detect: (source: HTMLVideoElement) => Promise<unknown[]> } }).FaceDetector;
    if (!detector) return;
    const faceDetector = new detector();
    const timer = window.setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;
      try {
        const faces = await faceDetector.detect(video);
        if (!faces.length) onSignal("No face detected. Keep your face visible for fair play.");
      } catch {
        // FaceDetector is optional and experimental in some browsers.
      }
    }, 2500);
    return () => window.clearInterval(timer);
  }, [active, onSignal]);

  return (
    <div className="fixed bottom-4 right-4 z-40 w-44 rounded-2xl border border-white/10 bg-pitch-950/95 p-2 shadow-2xl">
      {active && <video ref={videoRef} muted playsInline className="mb-2 aspect-video w-full rounded-xl object-cover" />}
      <Btn variant="outline" size="sm" className="w-full" onClick={toggleCamera}>
        <Icon name="camera" size={14} />
        {active ? "Stop camera" : "Enable fair-play camera"}
      </Btn>
      <p className="mt-1 text-center text-[9px] leading-tight text-white/40">Optional · local only · no recording</p>
      {error && <p className="mt-1 text-center text-[10px] text-flame-400">{error}</p>}
    </div>
  );
}
