import type { ReactNode } from 'react';

/** The denim-blue top band with its selvedge edge, used on every screen. */
export function Header({ left, right, title, subtitle, children }: {
  left?: ReactNode;
  right?: ReactNode;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <header className="header">
      <div className="header-inner">
        {(left || right) && (
          <div className="header-bar">
            <div className="header-slot">{left}</div>
            <div className="header-slot header-slot-end">{right}</div>
          </div>
        )}
        <h1 className="header-title">{title}</h1>
        {subtitle && <p className="header-subtitle">{subtitle}</p>}
        {children}
      </div>
      <div className="selvedge" aria-hidden="true" />
    </header>
  );
}
