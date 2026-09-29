import { useEffect, useState, type CSSProperties } from 'react';
import { photoUrl } from '../data/photos';
import { Icon } from './Icon';

/** Shows a stored photo with a shimmer while it loads, or a quiet placeholder when there is none. */
export function Photo({ path, alt, fit = 'cover', eager = false, style }: {
  path: string | null;
  alt: string;
  fit?: 'cover' | 'contain';
  eager?: boolean;
  style?: CSSProperties;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    setUrl(null);
    setFailed(false);
    setLoaded(false);
    if (path) photoUrl(path).then((u) => active && (u ? setUrl(u) : setFailed(true)));
    return () => {
      active = false;
    };
  }, [path]);

  const loading = Boolean(path) && !failed && !loaded;
  return (
    <div className={`photo photo-${fit}${loading ? ' photo-loading' : ''}`} style={style}>
      {url && !failed ? (
        <img
          src={url}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      ) : (
        !loading && (
          <div className="photo-empty" aria-hidden="true">
            <Icon name="hanger" size={34} weight={1.4} />
          </div>
        )
      )}
    </div>
  );
}
