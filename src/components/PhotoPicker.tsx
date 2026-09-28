import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { Photo } from './Photo';

/**
 * Two buttons so both flows work on iOS and Android:
 * "Take photo" opens the camera directly; "Choose photo" opens the library.
 */
export function PhotoPicker({ currentPath, file, removed, onPick, onRemove }: {
  currentPath: string | null;
  file: File | null;
  removed: boolean;
  onPick: (f: File) => void;
  onRemove: () => void;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const hasPhoto = Boolean(preview || (currentPath && !removed));

  function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (picked) onPick(picked);
    e.target.value = ''; // allow picking the same file again
  }

  return (
    <div className="picker">
      <div className="picker-frame">
        {preview ? (
          <div className="photo photo-contain">
            <img src={preview} alt="New photo preview" />
          </div>
        ) : (
          <Photo path={removed ? null : currentPath} alt="Current photo" fit="contain" eager />
        )}
      </div>
      <div className="picker-actions">
        <button type="button" className="button button-secondary" onClick={() => cameraRef.current?.click()}>
          <Icon name="camera" size={20} /> Take photo
        </button>
        <button type="button" className="button button-secondary" onClick={() => libraryRef.current?.click()}>
          <Icon name="image" size={20} /> Choose photo
        </button>
        {hasPhoto && (
          <button type="button" className="button button-quiet" onClick={onRemove}>
            Remove photo
          </button>
        )}
      </div>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={handle} />
      <input ref={libraryRef} type="file" accept="image/*" hidden onChange={handle} />
    </div>
  );
}
