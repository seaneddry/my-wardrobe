import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon, type IconName } from './Icon';

function useModalEffects(open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
    };
  }, [open, close]);
}

/** Bottom sheet with a grabber you can drag down to dismiss. */
export function Sheet({ open, onClose, title, headerRight, footer, full = false, children }: {
  open: boolean;
  onClose: () => void;
  title: string;
  headerRight?: ReactNode;
  footer?: ReactNode;
  full?: boolean;
  children: ReactNode;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startY: number; dy: number } | null>(null);
  const [closing, setClosing] = useState(false);

  const close = useCallback(() => {
    if (closing) return;
    setClosing(true);
    const sheet = sheetRef.current;
    const backdrop = backdropRef.current;
    if (sheet) {
      sheet.style.transition = 'transform 260ms cubic-bezier(0.32, 0.72, 0, 1)';
      sheet.style.transform = 'translateY(110%)';
    }
    if (backdrop) {
      backdrop.style.transition = 'opacity 260ms ease';
      backdrop.style.opacity = '0';
    }
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 240);
  }, [closing, onClose]);

  useModalEffects(open, close);

  if (!open) return null;

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, input, a')) return;
    drag.current = { startY: e.clientY, dy: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || !sheetRef.current) return;
    const dy = Math.max(0, e.clientY - drag.current.startY);
    drag.current.dy = dy;
    sheetRef.current.style.transition = 'none';
    sheetRef.current.style.transform = `translateY(${dy}px)`;
  };
  const onPointerUp = () => {
    if (!drag.current || !sheetRef.current) return;
    const { dy } = drag.current;
    drag.current = null;
    if (dy > 110) {
      close();
    } else {
      sheetRef.current.style.transition = 'transform 260ms cubic-bezier(0.32, 0.72, 0, 1)';
      sheetRef.current.style.transform = '';
    }
  };
  const dragProps = { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp };

  return createPortal(
    <div className="sheet-backdrop" ref={backdropRef} onClick={close}>
      <div
        ref={sheetRef}
        className={`sheet${full ? ' sheet-full' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-grabber" {...dragProps} />
        <div className="sheet-head" {...dragProps}>
          <h2>{title}</h2>
          <div className="navbar-side navbar-side-end">
            {headerRight}
            <button type="button" className="icon-button" onClick={close} aria-label="Close">
              <Icon name="close" size={20} weight={2.2} />
            </button>
          </div>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export interface SheetAction {
  label: string;
  icon?: IconName;
  danger?: boolean;
  onSelect: () => void;
}

/** iOS-style action sheet: a stack of choices plus Cancel. */
export function ActionSheet({ open, onClose, title, actions }: {
  open: boolean;
  onClose: () => void;
  title?: string;
  actions: SheetAction[];
}) {
  useModalEffects(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="action-sheet" role="dialog" aria-modal="true" aria-label={title ?? 'Options'} onClick={(e) => e.stopPropagation()}>
        <div className="action-group">
          {title && <div className="action-title">{title}</div>}
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              className={`action${a.danger ? ' action-danger' : ''}`}
              onClick={() => {
                onClose();
                a.onSelect();
              }}
            >
              {a.icon && <Icon name={a.icon} size={22} />}
              {a.label}
            </button>
          ))}
        </div>
        <button type="button" className="action action-cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>,
    document.body,
  );
}
