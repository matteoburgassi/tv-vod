import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  duration?: number;
  onDone: () => void;
}

export default function Toast({ message, duration = 3000, onDone }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onDone]);

  return (
    <div
      className="fixed top-6 left-1/2 z-50 -translate-x-1/2"
      style={{
        opacity: visible ? 1 : 0,
        transform: `translateX(-50%) translateY(${visible ? '0' : '-12px'})`,
        transition: 'opacity 300ms ease-out, transform 300ms ease-out',
        pointerEvents: 'none',
      }}
    >
      <div className="flex items-center gap-3 rounded-xl bg-[#1e1028] px-6 py-3 shadow-2xl ring-1 ring-white/10">
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 fill-green-400">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
        <span className="text-sm font-medium text-white">{message}</span>
      </div>
    </div>
  );
}
