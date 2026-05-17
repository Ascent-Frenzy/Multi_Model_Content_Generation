'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { useUploadAsset } from '@/lib/api/hooks';
import type { AssetType } from '@app/types';

export function AssetUpload({ brandId }: { brandId: string }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload, isUploading } = useUploadAsset();

  const getAssetType = (mimeType: string): AssetType => {
    if (mimeType.startsWith('video/')) return 'clip';
    return 'image';
  };

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      for (const file of fileArray) {
        const type = getAssetType(file.type);
        await upload(brandId, file, type);
      }
    },
    [brandId, upload]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleClick();
      }}
      className="flex flex-col items-center justify-center rounded-lg p-10 text-center cursor-pointer transition-colors duration-150"
      style={{
        border: `1px dashed ${isDragOver ? '#3cffd0' : '#949494'}`,
      }}
    >
      {isUploading ? (
        <>
          <Loader2 className="h-10 w-10 text-jelly-mint animate-spin mb-3" />
          <p className="text-muted-text text-sm">Uploading...</p>
        </>
      ) : (
        <>
          <Upload className="h-10 w-10 text-secondary-text mb-3" />
          <p className="text-muted-text text-sm">Drag &amp; drop files here</p>
          <p className="text-secondary-text text-xs mt-1">or click to browse</p>
        </>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,image/*"
        multiple
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
