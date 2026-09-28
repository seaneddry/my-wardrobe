function loadImage(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This photo couldn't be read. Try a JPEG or PNG, or take a new photo."));
    };
    img.src = url;
  });
}

/**
 * Resize and re-encode a photo as JPEG on the device before upload.
 * Keeps storage and bandwidth well inside Supabase's free tier.
 * Browsers apply the photo's EXIF rotation when decoding, so portraits stay upright.
 */
export async function compressImage(file: Blob, maxEdge: number, quality: number): Promise<Blob> {
  const img = await loadImage(file);
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Photo processing is not available on this device.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("The photo couldn't be processed. Try another one."))),
      'image/jpeg',
      quality,
    );
  });
}
