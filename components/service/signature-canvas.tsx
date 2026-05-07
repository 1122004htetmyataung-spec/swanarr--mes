'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface SignatureCanvasProps {
  onSignatureChange?: (dataUrl: string | null) => void;
  label?: string;
}

export function SignatureCanvas({ onSignatureChange, label = 'Customer Signature' }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const getContext = () => {
    if (!canvasRef.current) return null;
    return canvasRef.current.getContext('2d');
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const ctx = getContext();
    if (!ctx || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const ctx = getContext();
    if (!ctx || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000000';
    ctx.lineTo(x, y);
    ctx.stroke();

    if (!hasSignature) setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const ctx = getContext();
    if (!ctx || !canvasRef.current) return;

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasSignature(false);
    onSignatureChange?.(null);
  };

  const handleSave = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    onSignatureChange?.(dataUrl);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold">{label}</label>
      <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={400}
          height={150}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="w-full cursor-crosshair bg-white"
        />
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
          className="flex-1"
        >
          <Trash2 size={16} className="mr-1" />
          Clear
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={!hasSignature}
          size="sm"
          className="flex-1"
        >
          Save Signature
        </Button>
      </div>
    </div>
  );
}
