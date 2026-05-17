'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUploadAsset } from '@/lib/api/hooks';
import type { BrandProfile, UpdateBrandInput } from '@/lib/api/brands';
import type { Tone } from '@app/types';
import { Upload } from 'lucide-react';

interface BrandFormProps {
  brand?: BrandProfile;
  onSubmit: (data: UpdateBrandInput) => void;
  isLoading: boolean;
  brandId?: string;
}

const tones: Tone[] = ['professional', 'casual', 'humorous', 'inspirational'];

export function BrandForm({ brand, onSubmit, isLoading, brandId }: BrandFormProps) {
  const [name, setName] = useState(brand?.name ?? '');
  const [tone, setTone] = useState<Tone>(brand?.tone ?? 'professional');
  const [primaryColor, setPrimaryColor] = useState(brand?.primaryColor ?? '#3cffd0');
  const [secondaryColor, setSecondaryColor] = useState(brand?.secondaryColor ?? '#5200ff');
  const [fontFamily, setFontFamily] = useState(brand?.fontFamily ?? '');
  const [logoS3Key, setLogoS3Key] = useState<string | null>(brand?.logoS3Key ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload, isUploading } = useUploadAsset();

  useEffect(() => {
    if (brand) {
      setName(brand.name);
      setTone(brand.tone);
      setPrimaryColor(brand.primaryColor);
      setSecondaryColor(brand.secondaryColor);
      setFontFamily(brand.fontFamily);
      setLogoS3Key(brand.logoS3Key);
    }
  }, [brand]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: UpdateBrandInput = {
      name,
      tone,
      primaryColor,
      secondaryColor,
      fontFamily,
    };
    if (brandId) {
      data.logoS3Key = logoS3Key;
    }
    onSubmit(data);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !brandId) return;
    const asset = await upload(brandId, file, 'image');
    if (asset) {
      setLogoS3Key(asset.s3Key);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm text-muted-text">
          Name
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Brand name"
          required
          className="bg-canvas-black border-white/20 rounded-sm focus:border-jelly-mint"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tone" className="text-sm text-muted-text">
          Tone
        </Label>
        <Select value={tone} onValueChange={(v) => setTone(v as Tone)}>
          <SelectTrigger className="bg-canvas-black border-white/20 rounded-sm focus:border-jelly-mint">
            <SelectValue placeholder="Select tone" />
          </SelectTrigger>
          <SelectContent className="bg-surface-slate border-white/10">
            {tones.map((t) => (
              <SelectItem key={t} value={t} className="capitalize">
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="primaryColor" className="text-sm text-muted-text">
            Primary Color
          </Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              id="primaryColor"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-10 w-10 rounded cursor-pointer border-0 bg-transparent"
            />
            <Input
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="bg-canvas-black border-white/20 rounded-sm focus:border-jelly-mint"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="secondaryColor" className="text-sm text-muted-text">
            Secondary Color
          </Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              id="secondaryColor"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              className="h-10 w-10 rounded cursor-pointer border-0 bg-transparent"
            />
            <Input
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              className="bg-canvas-black border-white/20 rounded-sm focus:border-jelly-mint"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fontFamily" className="text-sm text-muted-text">
          Font Family
        </Label>
        <Input
          id="fontFamily"
          value={fontFamily}
          onChange={(e) => setFontFamily(e.target.value)}
          placeholder="e.g. Inter, Roboto"
          className="bg-canvas-black border-white/20 rounded-sm focus:border-jelly-mint"
        />
      </div>

      {/* Logo upload — only when editing an existing brand */}
      {brandId && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-text">Logo</Label>
          {logoS3Key && (
            <div className="mb-2">
              <img
                src={logoS3Key}
                alt="Brand logo"
                className="h-16 w-auto object-contain rounded border border-white/10 p-1"
              />
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="border-white/20 text-muted-text rounded-lg hover:border-jelly-mint hover:text-white"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? 'Uploading...' : 'Upload Logo'}
          </Button>
        </div>
      )}

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full bg-jelly-mint text-black rounded-xl font-semibold hover:bg-jelly-mint/90"
      >
        {isLoading ? 'Saving...' : 'Save Brand'}
      </Button>
    </form>
  );
}
