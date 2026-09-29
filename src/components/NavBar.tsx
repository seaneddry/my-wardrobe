import { useEffect, useState, type ReactNode } from 'react';

/**
 * iOS-style navigation bar.
 * - large: a big title that scrolls away, after which the bar turns frosted and shows a small title.
 * - overlay: floats over a full-bleed photo with round frosted buttons, turning solid after `overlayThreshold` px.
 */
export function NavBar({
  title,
  subtitle,
  left,
  right,
  large = false,
  overlay = false,
  overlayThreshold = 280,
  children,
}: {
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
  large?: boolean;
  overlay?: boolean;
  overlayThreshold?: number;
  children?: ReactNode;
}) {
  const threshold = overlay ? overlayThreshold : large ? 40 : 0;
  const [solid, setSolid] = useState(threshold === 0);

  useEffect(() => {
    if (threshold === 0) return;
    let frame = 0;
    const check = () => {
      frame = 0;
      setSolid(window.scrollY > threshold);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [threshold]);

  const showSmallTitle = solid || (!large && !overlay);

  return (
    <>
      <header className={`navbar${overlay ? ' navbar-overlay' : ''}${solid ? ' is-solid' : ''}`}>
        <div className="navbar-row">
          <div className="navbar-side">{left}</div>
          <div className={`navbar-title${showSmallTitle ? '' : ' is-hidden'}`} aria-hidden={large || !showSmallTitle}>
            {title}
          </div>
          <div className="navbar-side navbar-side-end">{right}</div>
        </div>
      </header>
      {large && (
        <div className="large-title">
          <h1>{title}</h1>
          {subtitle && <p className="large-title-sub">{subtitle}</p>}
        </div>
      )}
      {children}
    </>
  );
}
