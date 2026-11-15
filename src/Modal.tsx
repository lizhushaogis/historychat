import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export default function Modal({
  open,
  close,
  title,
  children,
  className = "",
}: {
  open: boolean;
  close: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    const el = ref.current;
    if (open && el && !el.open) el.showModal();
    if (!open && el?.open) el.close();
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={`modal ${className}`}
      aria-label={title}
      onCancel={() => closeRef.current()}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeRef.current();
      }}
    >
      <div className="modal-inner">
        <button
          className="icon-button modal-close"
          aria-label={`关闭${title}`}
          onClick={close}
        >
          <X size={20} />
        </button>
        <div className="modal-scroll">{open && children}</div>
      </div>
    </dialog>
  );
}
