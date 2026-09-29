import type { ReactNode } from 'react';

/** An iOS inset grouped section: optional header, rounded body, optional footer. */
export function Group({ header, footer, pad = false, children }: {
  header?: ReactNode;
  footer?: ReactNode;
  pad?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="group">
      {header && <h2 className="group-header">{header}</h2>}
      <div className={`group-body${pad ? ' group-pad' : ''}`}>{children}</div>
      {footer && <p className="group-footer">{footer}</p>}
    </section>
  );
}
