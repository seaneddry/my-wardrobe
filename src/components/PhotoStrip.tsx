import { useEffect, useRef, useState } from 'react';
import type { PhotoDraft } from '../data/repository';
import { newId } from '../lib/id';
import { Icon } from './Icon';
import { Photo } from './Photo';
import { ActionSheet, type SheetAction } from './Sheet';

export const MAX_PHOTOS = 10;

function NewThumb({ blob }: { blob: Blob }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url ? <img className="strip-preview" src={url} alt="" /> : null;
}

/** Photo manager for the item form: a scrollable strip plus Camera, Library and Find online. */
export function PhotoStrip({ photos, onChange, onFindOnline }: {
  photos: PhotoDraft[];
  onChange: (next: PhotoDraft[]) => void;
  onFindOnline: () => void;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const full = photos.length >= MAX_PHOTOS;

  function addFiles(files: FileList | null, source: 'camera' | 'library') {
    if (!files?.length) return;
    const room = MAX_PHOTOS - photos.length;
    const added: PhotoDraft[] = Array.from(files)
      .slice(0, room)
      .map((blob) => ({ kind: 'new', key: newId(), blob, source }));
    onChange([...photos, ...added]);
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= photos.length) return;
    const next = [...photos];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  const actions: SheetAction[] =
    selected === null
      ? []
      : [
          ...(selected > 0 ? [{ label: 'Make cover photo', icon: 'star' as const, onSelect: () => move(selected, 0) }] : []),
          ...(selected > 0 ? [{ label: 'Move left', icon: 'left' as const, onSelect: () => move(selected, selected - 1) }] : []),
          ...(selected < photos.length - 1 ? [{ label: 'Move right', icon: 'right' as const, onSelect: () => move(selected, selected + 1) }] : []),
          { label: 'Remove photo', icon: 'trash' as const, danger: true, onSelect: () => onChange(photos.filter((_, i) => i !== selected)) },
        ];

  return (
    <>
      {photos.length > 0 && (
        <div className="photo-strip">
          {photos.map((p, i) => (
            <button
              key={p.key}
              type="button"
              className="strip-item pressable"
              onClick={() => setSelected(i)}
              aria-label={`Photo ${i + 1}${i === 0 ? ', cover' : ''}. Options`}
            >
              {p.kind === 'stored' ? <Photo path={p.photo.thumb} alt="" /> : <NewThumb blob={p.blob} />}
              {i === 0 && <span className="strip-cover">Cover</span>}
              {((p.kind === 'new' && p.source === 'web') || (p.kind === 'stored' && p.photo.source === 'web')) && (
                <span className="strip-web" title="Found online">
                  <Icon name="globe" size={13} weight={2} />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      <div className="photo-actions" style={photos.length === 0 ? { paddingTop: 14 } : undefined}>
        <button type="button" className="button button-secondary" disabled={full} onClick={() => cameraRef.current?.click()}>
          <Icon name="camera" size={20} /> Camera
        </button>
        <button type="button" className="button button-secondary" disabled={full} onClick={() => libraryRef.current?.click()}>
          <Icon name="image" size={20} /> Library
        </button>
        <button type="button" className="button button-secondary button-wide" disabled={full} onClick={onFindOnline}>
          <Icon name="globe" size={20} /> Find photos online
        </button>
      </div>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          addFiles(e.target.files, 'camera');
          e.target.value = '';
        }}
      />
      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          addFiles(e.target.files, 'library');
          e.target.value = '';
        }}
      />
      <ActionSheet open={selected !== null} onClose={() => setSelected(null)} title={selected === 0 ? 'Cover photo' : `Photo ${(selected ?? 0) + 1}`} actions={actions} />
    </>
  );
}
