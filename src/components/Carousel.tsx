import { useEffect, useRef, useState } from 'react';
import type { StoredPhoto } from '../data/types';
import { Icon } from './Icon';
import { Photo } from './Photo';

/** Swipeable photo carousel with page dots (and arrows on desktop). */
export function Carousel({ photos, alt, heroName }: { photos: StoredPhoto[]; alt: string; heroName?: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const go = (i: number) => {
    const el = track.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  if (photos.length === 0) {
    return (
      <div className="carousel" style={heroName ? { viewTransitionName: heroName } : undefined}>
        <div className="carousel-slide">
          <Photo path={null} alt={alt} />
        </div>
      </div>
    );
  }

  return (
    <div className="carousel" role="region" aria-roledescription="carousel" aria-label={`${alt}, ${photos.length} photos`}>
      <div className="carousel-track" ref={track}>
        {photos.map((p, i) => (
          <div
            key={p.path}
            className="carousel-slide"
            aria-label={`Photo ${i + 1} of ${photos.length}`}
            style={i === 0 && heroName ? { viewTransitionName: heroName } : undefined}
          >
            <Photo path={p.path} alt={`${alt}, photo ${i + 1}`} fit="contain" eager={i < 2} />
          </div>
        ))}
      </div>
      {photos.length > 1 && (
        <>
          <button type="button" className="carousel-arrow carousel-arrow-prev" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous photo">
            <Icon name="left" size={20} weight={2.2} />
          </button>
          <button type="button" className="carousel-arrow carousel-arrow-next" onClick={() => go(index + 1)} disabled={index >= photos.length - 1} aria-label="Next photo">
            <Icon name="right" size={20} weight={2.2} />
          </button>
          <div className="carousel-dots">
            {photos.map((p, i) => (
              <button
                key={p.path}
                type="button"
                className={`carousel-dot${i === index ? ' is-on' : ''}`}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index}
                onClick={() => go(i)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
