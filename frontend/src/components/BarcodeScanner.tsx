import { useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

type Props = { onDetected: (value: string) => void; onClose: () => void };
type Detector = { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>> };
type DetectorConstructor = new () => Detector;

export function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [manualValue, setManualValue] = useState('');
  const [message, setMessage] = useState('Starting camera...');

  useEffect(() => {
    let active = true;
    let timer: number | undefined;
    const stop = () => {
      if (timer) window.clearInterval(timer);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };

    const start = async () => {
      const DetectorClass = (window as typeof window & { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
      if (!DetectorClass || !navigator.mediaDevices?.getUserMedia) {
        setMessage('Camera scanning is unavailable on this device. Enter the barcode below.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (!active || !videoRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const detector = new DetectorClass();
        timer = window.setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          const codes = await detector.detect(videoRef.current).catch(() => []);
          const value = codes.find((code) => code.rawValue?.trim())?.rawValue?.trim();
          if (value) { stop(); onDetected(value); }
        }, 350);
        setMessage('Point the camera at a product barcode.');
      } catch {
        setMessage('Camera access was unavailable. Enter the barcode below.');
      }
    };
    void start();
    return () => { active = false; stop(); };
  }, [onDetected]);

  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
    <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl dark:bg-slate-900">
      <div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold">Scan product barcode</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{message}</p></div><Button variant="ghost" size="sm" className="h-9 w-9 rounded-xl px-0" onClick={onClose} aria-label="Close barcode scanner"><X className="h-4 w-4" /></Button></div>
      <div className="mt-4 overflow-hidden rounded-2xl bg-slate-950"><video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline /></div>
      <div className="mt-4 flex gap-2"><Input value={manualValue} onChange={(event) => setManualValue(event.target.value)} placeholder="Enter barcode manually" inputMode="numeric" /><Button onClick={() => { if (manualValue.trim()) onDetected(manualValue.trim()); }} disabled={!manualValue.trim()}><Camera className="h-4 w-4" />Use</Button></div>
    </div>
  </div>;
}
