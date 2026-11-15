import { useEffect } from "react";

export function Toast({ message, onClose, durationMs = 3000 }: { message: string; onClose: () => void; durationMs?: number }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, durationMs);
    return () => clearTimeout(timer);
  }, [message, onClose, durationMs]);

  if (!message) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-[float_3s_ease-in-out_infinite]">
      <div className="bg-charcoal text-white px-5 py-2.5 rounded-full shadow-clay-card border border-charcoal/50 flex items-center gap-2 font-bold text-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse-fast" />
        {message}
      </div>
    </div>
  );
}
