'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { CarouselSlide } from '@app/types';
import { cn, assetUrl } from '@/lib/utils';

interface CarouselCanvasProps {
  slide: CarouselSlide;
  onChange: (updated: CarouselSlide) => void;
  isActive: boolean;
}

export default function CarouselCanvas({ slide, onChange, isActive }: CarouselCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);
  const slideRef = useRef(slide);
  slideRef.current = slide;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const syncSlideFromCanvas = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const objects = canvas.getObjects();
    let headline = slideRef.current.headline;
    let body = slideRef.current.body;

    for (const obj of objects) {
      if (obj._customType === 'headline') {
        headline = obj.text || '';
      } else if (obj._customType === 'body') {
        body = obj.text || '';
      }
    }

    onChangeRef.current({
      ...slideRef.current,
      headline,
      body,
    });
  }, []);

  // IMPORTANT: This effect intentionally uses an empty dependency array.
  // The canvas is initialised once per mount and reads `slide` from the
  // initial props. When the parent needs to display a different slide it
  // must remount this component by changing its `key` (e.g.
  // `<CarouselCanvas key={activeIndex} ... />`). Do NOT add slide props
  // to the dependency array — that would dispose & recreate the canvas on
  // every keystroke inside the Fabric IText objects.
  useEffect(() => {
    if (!canvasRef.current) return;

    // Dynamic require for fabric (CJS module, only runs in browser)
    const fabricModule = require('fabric'); // eslint-disable-line
    const fabric = fabricModule.fabric || fabricModule;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 540,
      height: 540,
      backgroundColor: slide.bgColor,
    });

    fabricCanvasRef.current = canvas;

    // Load background image if bgImageS3Key is provided
    if (slide.bgImageS3Key) {
      fabric.Image.fromURL(
        assetUrl(slide.bgImageS3Key),
        (img: any) => {
          if (!img) return;
          // Scale to fill canvas
          const scaleX = 540 / (img.width || 1);
          const scaleY = 540 / (img.height || 1);
          const scale = Math.max(scaleX, scaleY);
          img.set({
            scaleX: scale,
            scaleY: scale,
            originX: 'center',
            originY: 'center',
            left: 270,
            top: 270,
            selectable: false,
            evented: false,
          });
          canvas.add(img);
          canvas.sendToBack(img);
          canvas.renderAll();
        },
        { crossOrigin: 'anonymous' }
      );
    }

    // Add headline text
    const headlineText = new fabric.IText(slide.headline, {
      left: 40,
      top: 60,
      fontSize: 32,
      fontFamily: 'Space Grotesk',
      fontWeight: 'bold',
      fill: slide.textColor,
      editable: true,
      _customType: 'headline',
    });
    canvas.add(headlineText);

    // Add body text
    const bodyText = new fabric.IText(slide.body, {
      left: 40,
      top: 140,
      fontSize: 18,
      fontFamily: 'Space Grotesk',
      fill: slide.textColor,
      editable: true,
      _customType: 'body',
    });
    canvas.add(bodyText);

    // Load overlay image if overlayImageS3Key is provided
    if (slide.overlayImageS3Key) {
      fabric.Image.fromURL(
        assetUrl(slide.overlayImageS3Key),
        (img: any) => {
          if (!img) return;
          // Scale overlay to reasonable size
          const maxDim = 200;
          const scale = Math.min(maxDim / (img.width || 1), maxDim / (img.height || 1), 1);
          img.set({
            scaleX: scale,
            scaleY: scale,
            originX: 'center',
            originY: 'center',
            left: 270,
            top: 370,
            selectable: true,
            _customType: 'overlay',
          });
          canvas.add(img);
          canvas.renderAll();
        },
        { crossOrigin: 'anonymous' }
      );
    }

    // Listen for changes
    canvas.on('object:modified', syncSlideFromCanvas);
    canvas.on('text:changed', syncSlideFromCanvas);

    // Cleanup
    return () => {
      canvas.off('object:modified', syncSlideFromCanvas);
      canvas.off('text:changed', syncSlideFromCanvas);
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={cn(
        'inline-block rounded-lg overflow-hidden',
        isActive ? 'border-2 border-jelly-mint' : 'border border-surface-slate'
      )}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
