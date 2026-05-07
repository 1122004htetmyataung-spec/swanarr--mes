'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * useScanner Hook
 * 
 * Listens for barcode scanner input (typically emulates rapid keyboard entry ending with Enter).
 * Debounces scanner input to avoid duplicate triggers and provides the scanned value.
 * 
 * Usage:
 * const { scannedValue, isScanning, resetScanner } = useScanner({
 *   onScan: async (value) => {
 *     // Handle scan - typically lookup by IMEI/serial
 *   },
 *   debounceMs: 300,
 * });
 */

interface UseScannerOptions {
  onScan?: (value: string) => void | Promise<void>;
  debounceMs?: number;
  enabled?: boolean;
}

export function useScanner(options: UseScannerOptions = {}) {
  const { onScan, debounceMs = 300, enabled = true } = options;
  
  const [scannedValue, setScannedValue] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const scanBufferRef = useRef<string>('');
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const isProcessingRef = useRef(false);

  const resetScanner = () => {
    setScannedValue('');
    scanBufferRef.current = '';
    setIsScanning(false);
  };

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = async (event: KeyboardEvent) => {
      // Only capture printable characters and Enter
      if (event.key === 'Enter') {
        event.preventDefault();
        
        const value = scanBufferRef.current.trim();
        if (value.length > 0 && !isProcessingRef.current) {
          isProcessingRef.current = true;
          setIsScanning(false);
          setScannedValue(value);
          
          try {
            if (onScan) {
              await onScan(value);
            }
          } catch (error) {
            console.error('Error processing scan:', error);
          } finally {
            isProcessingRef.current = false;
            scanBufferRef.current = '';
          }
        }
        return;
      }

      // Allow scanner to input printable characters
      if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
        event.preventDefault();
        scanBufferRef.current += event.key;
        setIsScanning(true);

        // Reset debounce timer
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        // Auto-submit if buffer looks complete (e.g., 15+ chars for IMEI, or after debounce)
        debounceTimerRef.current = setTimeout(() => {
          const value = scanBufferRef.current.trim();
          if (value.length >= 10) {
            // Likely a barcode/IMEI, auto-submit
            const submitEvent = new KeyboardEvent('keydown', {
              key: 'Enter',
              code: 'Enter',
            });
            document.dispatchEvent(submitEvent);
          }
        }, debounceMs);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [onScan, debounceMs, enabled]);

  return {
    scannedValue,
    isScanning,
    scanBuffer: scanBufferRef.current,
    resetScanner,
  };
}
