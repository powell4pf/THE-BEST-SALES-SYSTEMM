import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

type Props = { onDetected: (value: string) => void; onClose: () => void };

function cameraErrorMessage(error: unknown) {
  const name = error instanceof DOMException ? error.name : '';
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) return 'Camera access requires the secure HTTPS Railway address. Open the site in Chrome or Safari using https://.';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Camera permission was denied. Allow camera access for this site in your browser settings, then tap Enable camera.';
  if (name === 'NotReadableError') return 'The camera is busy in another app. Close other camera apps and tap Enable camera again.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No usable camera was found. Check the browser permissions and try again.';
  return 'Camera could not start. Check browser permissions and HTTPS, then tap Enable camera again.';
}

export function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const onDetectedRef = useRef(onDetected);
  const startingRef = useRef(false);
  const [manualValue, setManualValue] = useState('');
  const [message, setMessage] = useState('Starting camera...');
  const [starting, setStarting] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => { onDetectedRef.current = onDetected; }, [onDetected]);

  const stopCamera = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (!videoRef.current || startingRef.current) return;
    startingRef.current = true;
    stopCamera();
    setStarting(true);
    setMessage('Requesting camera access...');
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error('secure-context-required');
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      } catch (error) {
        const name = error instanceof DOMException ? error.name : '';
        if (name !== 'NotFoundError' && name !== 'OverconstrainedError') throw error;
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      await video.play();
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const reader = new BrowserMultiFormatReader();
      controlsRef.current = await reader.decodeFromStream(stream, video, (result) => {
        const value = result?.getText()?.trim();
        if (value) { stopCamera(); onDetectedRef.current(value); }
      });
      setCameraReady(true);
      setMessage('Point the camera at a product barcode.');
    } catch (error) {
      stopCamera();
      setMessage(cameraErrorMessage(error));
    } finally {
      startingRef.current = false;
      setStarting(false);
    }
  }, [stopCamera]);

  useEffect(() => { void startCamera(); return stopCamera; }, [startCamera, stopCamera]);

  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
    <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl dark:bg-slate-900">
      <div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold">Scan product barcode</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{message}</p></div><Button variant="ghost" size="sm" className="h-9 w-9 rounded-xl px-0" onClick={onClose} aria-label="Close barcode scanner"><X className="h-4 w-4" /></Button></div>
      <div className="mt-4 overflow-hidden rounded-2xl bg-slate-950"><video ref={videoRef} className="aspect-video w-full object-cover" autoPlay muted playsInline /></div>
      {!cameraReady && <Button type="button" className="mt-3 w-full" onClick={() => void startCamera()} disabled={starting}>{starting ? 'Requesting camera…' : 'Enable camera'}</Button>}
      <div className="mt-4 flex gap-2"><Input value={manualValue} onChange={(event) => setManualValue(event.target.value)} placeholder="Enter barcode manually" inputMode="numeric" /><Button onClick={() => { if (manualValue.trim()) onDetectedRef.current(manualValue.trim()); }} disabled={!manualValue.trim()}><Camera className="h-4 w-4" />Use</Button></div>
    </div>
  </div>;
}
