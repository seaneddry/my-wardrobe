import { useEffect, useState } from 'react';
import { photoUrl } from '../data/photos';
import { Icon } from './Icon';

/** Shows a stored photo, or a quiet placeholder while loading or when there is none. */
export function Photo({ path, alt, fit = 'cover', eager = false }: {
  path: string | null;
  alt: string;
  fit?: 'cover' | 'contain';
  eager?: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setUrl(null);
    setFailed(false);
    if (path) photoUrl(path).then((u) => active && (u ? setUrl(u) : setFailed(true)));
    return () => {
      active = false;
    };
  }, [path]);

  return (
    <div className={`photo photo-${fit}`}>
      {url && !failed ? (
        <img src={url} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)} />
      ) : (
        <div className="photo-empty" aria-hidden={!!path && !failed}>
          {(!path || failed) && <Icon name="hanger" size={34} />}
        </div>
      )}
    </div>
  );
}
