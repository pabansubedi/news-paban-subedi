import { supabase } from './supabase';

export type UploadBucket = 'news-images' | 'branding' | 'notices';

const MAX_DIMENSION = 1600;

/**
 * Shrinks big photos in the browser (max 1600px, JPEG) before upload.
 * JPEG (not WebP) because Facebook / WhatsApp / Viber share previews do not always show WebP.
 * Logos/branding (transparent PNG, SVG, ICO) are uploaded untouched.
 */
async function prepare(file: File, bucket: UploadBucket): Promise<{ blob: Blob; ext: string }> {
  const fallbackExt = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (bucket !== 'news-images' || !/^image\/(jpeg|png|webp)$/.test(file.type)) {
    return { blob: file, ext: fallbackExt };
  }
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 700 * 1024) return { blob: file, ext: fallbackExt };

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return { blob: file, ext: fallbackExt };
    ctx.fillStyle = '#ffffff'; // transparent PNG areas would turn black in a JPEG
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (blob && blob.size < file.size) return { blob, ext: 'jpg' };
  } catch {
    /* fall through to the original file */
  }
  return { blob: file, ext: fallbackExt };
}

/** Uploads an image to Supabase Storage and returns its permanent public URL. */
export async function uploadImage(file: File, bucket: UploadBucket): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('कृपया तस्बिर (image) फाइल मात्र चयन गर्नुहोस्।');
  if (file.size > 15 * 1024 * 1024) throw new Error('तस्बिर १५ MB भन्दा सानो हुनुपर्छ।');

  const { blob, ext } = await prepare(file, bucket);
  const folder = new Date().toISOString().slice(0, 7); // 2026-10
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    cacheControl: '31536000',
    contentType: blob.type || file.type,
    upsert: false
  });
  if (error) throw new Error(error.message);

  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
