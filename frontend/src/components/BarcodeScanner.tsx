import { useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

type Props = { onDetected: (value: string) => void; onClose: () => void };
export function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [manualValue, setManualValue] = useState('');
  const [message, setMessage] = useState('Starting camera...');

  useEffect(() => {
    let active = true;
    let controls: { stop: () => void } | undefined;
    const stop = () => {
      controls?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };

    const start = async () => {
      try {
        if (!videoRef.current) return;
        setMessage('Requesting camera access...');
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        const reader = new BrowserMultiFormatReader();
        controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
          const value = result?.getText()?.trim();
          if (value && active) { stop(); onDetected(value); }
        });
        if (!active) stop();
        setMessage('Point the camera at a product barcode.');
      } catch {
        setMessage('Camera access was unavailable or blocked. Enter the barcode below.');
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
