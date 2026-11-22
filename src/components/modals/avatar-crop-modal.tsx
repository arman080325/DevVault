"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Icon } from "@/components/shared/icon";
import { avatarService, CropArea } from "@/services/avatar-service";

interface AvatarCropModalProps {
  isOpen: boolean;
  image: HTMLImageElement | null;
  file: File | null;
  onClose: () => void;
  onSave: (croppedBlob: Blob) => Promise<void>;
  isSaving: boolean;
  error?: string | null;
}

const PREVIEW_CONTAINER_SIZE = 280; // Size of the interactive square viewport in CSS px
const CROP_DIAMETER = 240; // Diameter of the circular target mask

export function AvatarCropModal({
  isOpen,
  image,
  file,
  onClose,
  onSave,
  isSaving,
  error: externalError,
}: AvatarCropModalProps) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [internalError, setInternalError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Reset zoom & pan when a new image is loaded
  useEffect(() => {
    if (isOpen && image) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setInternalError(null);
    }
  }, [isOpen, image]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSaving) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSaving, onClose]);

  // Compute maximum allowable pan offset based on current zoom and aspect ratio
  const computeClampOffset = useCallback(
    (newX: number, newY: number, currentZoom: number) => {
      if (!image) return { x: 0, y: 0 };

      // Base scaling to cover the CROP_DIAMETER
      const baseScale = Math.max(
        CROP_DIAMETER / image.naturalWidth,
        CROP_DIAMETER / image.naturalHeight
      );
      const totalScale = baseScale * currentZoom;

      const renderedW = image.naturalWidth * totalScale;
      const renderedH = image.naturalHeight * totalScale;

      const maxOffsetX = Math.max(0, (renderedW - CROP_DIAMETER) / 2);
      const maxOffsetY = Math.max(0, (renderedH - CROP_DIAMETER) / 2);

      return {
        x: Math.max(-maxOffsetX, Math.min(maxOffsetX, newX)),
        y: Math.max(-maxOffsetY, Math.min(maxOffsetY, newY)),
      };
    },
    [image]
  );

  // Mouse & Touch Pan Handlers
  const handlePointerDown = (clientX: number, clientY: number) => {
    if (isSaving) return;
    setIsDragging(true);
    setDragStart({ x: clientX - offset.x, y: clientY - offset.y });
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDragging || isSaving) return;
    const newX = clientX - dragStart.x;
    const newY = clientY - dragStart.y;
    setOffset(computeClampOffset(newX, newY, zoom));
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Zoom control
  const handleZoomChange = (newZoom: number) => {
    const clampedZoom = Math.max(1, Math.min(3, newZoom));
    setZoom(clampedZoom);
    setOffset((prev) => computeClampOffset(prev.x, prev.y, clampedZoom));
  };

  // Render preview onto canvas
  useEffect(() => {
    if (!canvasRef.current || !image) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = PREVIEW_CONTAINER_SIZE * dpr;
    canvas.height = PREVIEW_CONTAINER_SIZE * dpr;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, PREVIEW_CONTAINER_SIZE, PREVIEW_CONTAINER_SIZE);

    // Compute base scale to cover crop circle
    const baseScale = Math.max(
      CROP_DIAMETER / image.naturalWidth,
      CROP_DIAMETER / image.naturalHeight
    );
    const totalScale = baseScale * zoom;

    const renderedW = image.naturalWidth * totalScale;
    const renderedH = image.naturalHeight * totalScale;

    const centerX = PREVIEW_CONTAINER_SIZE / 2 + offset.x;
    const centerY = PREVIEW_CONTAINER_SIZE / 2 + offset.y;

    const drawX = centerX - renderedW / 2;
    const drawY = centerY - renderedH / 2;

    ctx.drawImage(image, drawX, drawY, renderedW, renderedH);
    ctx.restore();
  }, [image, zoom, offset]);

  // Confirm crop and execute save
  const handleApplyCrop = async () => {
    if (!image || isSaving) return;

    setInternalError(null);
    try {
      const baseScale = Math.max(
        CROP_DIAMETER / image.naturalWidth,
        CROP_DIAMETER / image.naturalHeight
      );
      const totalScale = baseScale * zoom;

      // Crop coordinates in rendered CSS space
      const centerX = PREVIEW_CONTAINER_SIZE / 2 + offset.x;
      const centerY = PREVIEW_CONTAINER_SIZE / 2 + offset.y;

      const renderedW = image.naturalWidth * totalScale;
      const renderedH = image.naturalHeight * totalScale;

      const drawX = centerX - renderedW / 2;
      const drawY = centerY - renderedH / 2;

      // Top-left of the crop circle in preview space
      const cropLeft = (PREVIEW_CONTAINER_SIZE - CROP_DIAMETER) / 2;
      const cropTop = (PREVIEW_CONTAINER_SIZE - CROP_DIAMETER) / 2;

      // Relative to the rendered image
      const sourceCropX = (cropLeft - drawX) / totalScale;
      const sourceCropY = (cropTop - drawY) / totalScale;
      const sourceCropSize = CROP_DIAMETER / totalScale;

      const cropArea: CropArea = {
        x: Math.max(0, sourceCropX),
        y: Math.max(0, sourceCropY),
        size: Math.min(
          sourceCropSize,
          image.naturalWidth - Math.max(0, sourceCropX),
          image.naturalHeight - Math.max(0, sourceCropY)
        ),
      };

      const croppedBlob = await avatarService.cropToWebpBlob(image, cropArea, 512);
      await onSave(croppedBlob);
    } catch (err: any) {
      setInternalError(err.message || "Failed to process and crop image.");
    }
  };

  if (!isOpen || !image) return null;

  const displayError = internalError || externalError;
  const fileSizeKb = file ? (file.size / 1024).toFixed(0) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/65 backdrop-blur-sm animate-fade-in overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-crop-modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0"
        onClick={isSaving ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Modal Surface */}
      <div className="relative w-full max-w-[440px] my-auto bg-[var(--surface,#fcfbf8)] dark:bg-[var(--surface,#151311)] border border-[var(--border,#e4dfd5)] dark:border-[var(--border,#2b2722)] rounded-2xl p-5 sm:p-7 shadow-2xl z-10 transition-all select-none">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="font-mono text-[11px] font-semibold text-[var(--accent,#b6503a)] uppercase tracking-wider block mb-1">
              PROFILE PICTURE
            </span>
            <h2
              id="avatar-crop-modal-title"
              className="font-serif text-2xl font-normal text-[var(--foreground,#211d18)] dark:text-[#f4f0e8] tracking-tight"
            >
              Adjust and Crop
            </h2>
            <p className="text-xs text-[var(--muted,#7c7468)] dark:text-[#a39a8c] mt-1">
              Drag to reposition. Use the slider below to zoom in or out.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="text-[var(--muted,#7c7468)] hover:text-[var(--foreground,#211d18)] dark:hover:text-[#eee8df] p-1.5 rounded-lg transition-colors disabled:opacity-40"
            aria-label="Cancel crop"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Error Message */}
        {displayError && (
          <div
            className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-600 dark:text-red-400 leading-relaxed flex items-center gap-2"
            role="alert"
          >
            <Icon name="info" size={14} className="shrink-0" />
            <span>{displayError}</span>
          </div>
        )}

        {/* Interactive Crop Viewport */}
        <div className="flex flex-col items-center justify-center my-3">
          <div
            ref={containerRef}
            className="relative overflow-hidden rounded-xl border border-[var(--border,#e4dfd5)] dark:border-[var(--border,#2b2722)] bg-neutral-900 shadow-inner cursor-grab active:cursor-grabbing"
            style={{ width: PREVIEW_CONTAINER_SIZE, height: PREVIEW_CONTAINER_SIZE }}
            onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
            onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={(e) => {
              if (e.touches[0]) handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
            }}
            onTouchMove={(e) => {
              if (e.touches[0]) handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
            }}
            onTouchEnd={handlePointerUp}
          >
            {/* Image Canvas */}
            <canvas
              ref={canvasRef}
              style={{ width: PREVIEW_CONTAINER_SIZE, height: PREVIEW_CONTAINER_SIZE }}
              className="block"
            />

            {/* Circular Mask Overlay */}
            <div
              className="absolute pointer-events-none rounded-full border-2 border-[var(--accent,#b6503a)]"
              style={{
                width: CROP_DIAMETER,
                height: CROP_DIAMETER,
                top: (PREVIEW_CONTAINER_SIZE - CROP_DIAMETER) / 2,
                left: (PREVIEW_CONTAINER_SIZE - CROP_DIAMETER) / 2,
                boxShadow: "0 0 0 9999px rgba(12, 10, 9, 0.65)",
              }}
            />

            {/* Subtle Crosshair indicator in center */}
            <div
              className="absolute pointer-events-none opacity-40"
              style={{
                width: 12,
                height: 12,
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }}
            >
              <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-white" />
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-white" />
            </div>
          </div>

          {/* Image Dimensions & File Metadata */}
          {file && (
            <div className="flex items-center gap-2 mt-2 text-[11px] font-mono text-[var(--muted,#7c7468)] dark:text-[#8e8578]">
              <span>{file.name}</span>
              <span>•</span>
              <span>{fileSizeKb} KB</span>
              <span>•</span>
              <span>
                {image.naturalWidth} × {image.naturalHeight}px
              </span>
            </div>
          )}
        </div>

        {/* Zoom Slider & Quick Adjust Controls */}
        <div className="mt-3 px-2">
          <div className="flex items-center justify-between text-xs font-medium text-[var(--muted,#7c7468)] mb-1.5">
            <span className="flex items-center gap-1.5">
              <Icon name="search" size={13} /> Zoom
            </span>
            <span className="font-mono text-[11px]">{Math.round(zoom * 100)}%</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleZoomChange(zoom - 0.2)}
              disabled={zoom <= 1 || isSaving}
              className="w-7 h-7 rounded-lg border border-[var(--border,#e4dfd5)] dark:border-[var(--border,#2b2722)] flex items-center justify-center text-sm font-semibold hover:bg-[var(--hover,#e9e3d9)] disabled:opacity-30 transition-colors"
              aria-label="Zoom out"
            >
              -
            </button>

            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              disabled={isSaving}
              onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
              className="flex-1 accent-[var(--accent,#b6503a)] cursor-pointer"
              aria-label="Zoom level"
            />

            <button
              type="button"
              onClick={() => handleZoomChange(zoom + 0.2)}
              disabled={zoom >= 3 || isSaving}
              className="w-7 h-7 rounded-lg border border-[var(--border,#e4dfd5)] dark:border-[var(--border,#2b2722)] flex items-center justify-center text-sm font-semibold hover:bg-[var(--hover,#e9e3d9)] disabled:opacity-30 transition-colors"
              aria-label="Zoom in"
            >
              +
            </button>

            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setOffset({ x: 0, y: 0 });
              }}
              disabled={isSaving || (zoom === 1 && offset.x === 0 && offset.y === 0)}
              className="px-2 py-1 text-[11px] font-mono rounded border border-[var(--border,#e4dfd5)] dark:border-[var(--border,#2b2722)] hover:bg-[var(--hover,#e9e3d9)] disabled:opacity-30 transition-colors"
              title="Reset position and zoom"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-[var(--border,#e4dfd5)] dark:border-[var(--border,#2b2722)]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="outline-button px-4 py-2 text-xs font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApplyCrop}
            disabled={isSaving}
            className="settings-primary-btn px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving Avatar...</span>
              </>
            ) : (
              <>
                <Icon name="check" size={14} />
                <span>Save Photo</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
