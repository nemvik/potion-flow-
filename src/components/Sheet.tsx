import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "./Visuals";
export function Sheet({
  title,
  onClose,
  children,
  className = "",
  closable = true,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  closable?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const el = ref.current!,
      prior = document.activeElement;
    el.showModal();
    el.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    return () => {
      el.close();
      if (prior instanceof HTMLElement && prior.isConnected)
        prior.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={"scrim " + className}
      aria-labelledby="sheet-title"
      aria-modal="true"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key !== "Tab") return;
        const items = Array.from(
          e.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]',
          ),
        );
        e.preventDefault();
        const index = items.indexOf(document.activeElement as HTMLElement);
        const next =
          (index + (e.shiftKey ? -1 : 1) + items.length) % items.length;
        items[next]?.focus();
      }}
      onCancel={(e) => {
        e.preventDefault();
        close.current();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && closable) close.current();
      }}
    >
      <div className="sheet">
        {closable && (
          <button
            type="button"
            className="icon-btn sheet-close"
            aria-label="Zavřít"
            onClick={onClose}
          >
            <Icon name="i-close" />
          </button>
        )}
        <h2 id="sheet-title">{title}</h2>
        {children}
      </div>
    </dialog>
  );
}
