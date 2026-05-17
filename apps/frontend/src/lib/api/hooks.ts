'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuthStore } from '@/lib/store/auth';
import { loginUser, registerUser } from './auth';
import { getBrands, getBrand, createBrand, updateBrand, deleteBrand, getUploadUrl, confirmUpload, getBrandAssets, deleteBrandAsset } from './brands';
import { getContentItems, getContentItem, createCarousel, createReel, updateContent, approveScript, deleteContent } from './content';
import type { UpdateContentInput } from './content';
import { getScheduledPosts, approvePost, reschedulePost, cancelPost } from './schedule';
import type { AssetType } from '@app/types';

// --- Auth ---
export function useLogin() {
  return useMutation({ mutationFn: loginUser, onSuccess: (data) => useAuthStore.getState().setAuth(data.token, data.user) });
}
export function useRegister() {
  return useMutation({ mutationFn: registerUser, onSuccess: (data) => useAuthStore.getState().setAuth(data.token, data.user) });
}

// --- Brands ---
export function useBrands() { return useQuery({ queryKey: ['brands'], queryFn: getBrands }); }
export function useBrand(id: string) { return useQuery({ queryKey: ['brands', id], queryFn: () => getBrand(id), enabled: !!id }); }
export function useCreateBrand() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: createBrand, onSuccess: () => qc.invalidateQueries({ queryKey: ['brands'] }) });
}
export function useUpdateBrand() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: updateBrand, onSuccess: () => qc.invalidateQueries({ queryKey: ['brands'] }) });
}
export function useDeleteBrand() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: deleteBrand, onSuccess: () => qc.invalidateQueries({ queryKey: ['brands'] }) });
}

// --- Assets ---
export function useUploadAsset() {
  const [isUploading, setIsUploading] = useState(false);
  const qc = useQueryClient();
  const upload = async (brandId: string, file: File, type: AssetType) => {
    setIsUploading(true);
    try {
      const { presignedUrl, s3Key } = await getUploadUrl(brandId, type, file.name);
      await fetch(presignedUrl, { method: 'PUT', body: file });
      const asset = await confirmUpload(brandId, { s3Key, filename: file.name, type, mimeType: file.type, sizeBytes: file.size });
      qc.invalidateQueries({ queryKey: ['brand-assets', brandId] });
      return asset;
    } finally { setIsUploading(false); }
  };
  return { upload, isUploading };
}
export function useBrandAssets(brandId: string) { return useQuery({ queryKey: ['brand-assets', brandId], queryFn: () => getBrandAssets(brandId), enabled: !!brandId }); }
export function useDeleteBrandAsset() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ brandId, assetId }: { brandId: string; assetId: string }) => deleteBrandAsset(brandId, assetId), onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['brand-assets', vars.brandId] }) });
}

// --- Content ---
export function useContentItems() { return useQuery({ queryKey: ['content'], queryFn: getContentItems }); }
export function useContentItem(id: string) { return useQuery({ queryKey: ['content', id], queryFn: () => getContentItem(id), enabled: !!id }); }
export function useCreateCarousel() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: createCarousel, onSuccess: () => qc.invalidateQueries({ queryKey: ['content'] }) });
}
export function useCreateReel() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: createReel, onSuccess: () => qc.invalidateQueries({ queryKey: ['content'] }) });
}
export function useUpdateContent() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: updateContent, onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ['content', vars.id] }); qc.invalidateQueries({ queryKey: ['content'] }); } });
}
export function useApproveScript() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: approveScript, onSuccess: () => qc.invalidateQueries({ queryKey: ['content'] }) });
}
export function useDeleteContent() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: deleteContent, onSuccess: () => qc.invalidateQueries({ queryKey: ['content'] }) });
}
/** Persist edits then approve script — ensures backend renders the user's reviewed version */
export function useApproveEditedContent() {
  const updateMutation = useUpdateContent();
  const approveMutation = useApproveScript();
  const approve = async (id: string, edits: UpdateContentInput) => {
    await updateMutation.mutateAsync({ id, data: edits });
    await approveMutation.mutateAsync(id);
  };
  return { approve, isPending: updateMutation.isPending || approveMutation.isPending };
}

// --- Schedule ---
export function useScheduledPosts() { return useQuery({ queryKey: ['schedule'], queryFn: getScheduledPosts }); }
export function useApprovePost() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: approvePost, onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule'] }) });
}
export function useReschedulePost() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: reschedulePost, onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule'] }) });
}
export function useCancelPost() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: cancelPost, onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule'] }) });
}
