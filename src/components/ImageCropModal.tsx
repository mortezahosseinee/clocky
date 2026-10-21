import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Check, X, Move, Sparkles } from 'lucide-react';

interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  isPersian?: boolean;
  onCropComplete: (croppedDataUrl: string) => void;
  onCancel: () => void;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  imageSrc,
  isPersian = true,
  onCropComplete,
  onCancel
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // in degrees: 0, 90, 180, 270
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgLoaded, setImgLoaded] = useState(false);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Reset parameters when a new image is loaded
  useEffect(() => {
    if (imageSrc && isOpen) {
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
      setImgLoaded(false);

      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        setImgLoaded(true);
      };
      img.src = imageSrc;
    }
  }, [imageSrc, isOpen]);

  // Handle Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - offset.x, y: touch.clientY - offset.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setOffset({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  // Perform Final Crop
  const handleApplyCrop = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;

    const outputSize = 256;
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outputSize, outputSize);

    ctx.save();
    // Center of canvas
    ctx.translate(outputSize / 2, outputSize / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    // Box size in crop view is 240px
    const scaleFactor = outputSize / 240;
    const renderedWidth = img.naturalWidth * zoom * scaleFactor * (240 / Math.max(img.naturalWidth, img.naturalHeight));
    const renderedHeight = img.naturalHeight * zoom * scaleFactor * (240 / Math.max(img.naturalWidth, img.naturalHeight));

    ctx.drawImage(
      img,
      -renderedWidth / 2 + offset.x * scaleFactor,
      -renderedHeight / 2 + offset.y * scaleFactor,
      renderedWidth,
      renderedHeight
    );
    ctx.restore();

    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    onCropComplete(croppedDataUrl);
  }, [offset, zoom, rotation, onCropComplete]);

  if (!isOpen) return null;

  return (
    <div
      onClick={e => {
        if (e.target === e.currentTarget) onCancel();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs cursor-pointer animate-in fade-in duration-150"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 text-slate-800 dark:text-slate-100 cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                {isPersian ? 'برش و تنظیم تصویر نمایه' : 'Crop & Adjust Profile Picture'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-b-nazanin mt-0.5">
                {isPersian
                  ? 'تصویر را با ماوس جابه‌جا کرده و بزرگ‌نمایی را تنظیم کنید.'
                  : 'Drag image to reposition and use zoom slider to adjust.'}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cropping Viewport */}
        <div className="relative w-full h-72 bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center select-none shadow-inner border border-slate-800">
          {/* Circular mask guide */}
          <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
            <div className="w-56 h-56 rounded-full border-2 border-white/80 shadow-[0_0_0_9999px_rgba(15,23,42,0.65)] ring-2 ring-blue-500/50"></div>
          </div>

          {/* Draggable & Zoomable Image */}
          {imageSrc && (
            <div
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="absolute cursor-move flex items-center justify-center touch-none"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${zoom})`,
                transition: isDragging ? 'none' : 'transform 0.1s ease-out'
              }}
            >
              <img
                src={imageSrc}
                alt="Source"
                draggable={false}
                className="max-w-none max-h-56 pointer-events-none object-contain"
              />
            </div>
          )}

          {/* Drag instruction overlay badge */}
          <div className="absolute bottom-3 left-3 z-20 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[11px] text-white/90 flex items-center gap-1.5 font-b-nazanin pointer-events-none">
            <Move className="w-3 h-3 text-blue-400" />
            <span>{isPersian ? 'جهت جابه‌جایی بکشید' : 'Drag to adjust'}</span>
          </div>
        </div>

        {/* Controls: Zoom & Rotate */}
        <div className="mt-5 space-y-4">
          <div className="flex items-center gap-3">
            <ZoomOut className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.05"
              value={zoom}
              onChange={e => setZoom(parseFloat(e.target.value))}
              className="w-full accent-blue-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
            />
            <ZoomIn className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs font-mono font-bold w-12 text-center text-slate-600 dark:text-slate-300">
              {Math.round(zoom * 100)}%
            </span>

            <button
              type="button"
              onClick={handleRotate}
              className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1 text-xs font-semibold cursor-pointer shrink-0 transition-colors"
              title={isPersian ? 'چرخش ۹۰ درجه' : 'Rotate 90 degrees'}
            >
              <RotateCw className="w-4 h-4" />
              <span>۹۰°</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-xs cursor-pointer transition-colors"
          >
            {isPersian ? 'انصراف' : 'Cancel'}
          </button>

          <button
            type="button"
            onClick={handleApplyCrop}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{isPersian ? 'برش و تایید آواتار' : 'Crop & Save Avatar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
