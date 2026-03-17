import { useEffect } from 'react';
import { useFocusable, FocusContext, setFocus } from '@noriginmedia/norigin-spatial-navigation';
import { mapKeyEvent } from '../utils/keyMap';

interface ExitDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ExitDialog({ onConfirm, onCancel }: ExitDialogProps) {
  const { ref, focusKey } = useFocusable({
    focusKey: 'exit-dialog',
    isFocusBoundary: true,
    trackChildren: true,
  });

  useEffect(() => {
    setFocus('exit-no');
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (mapKeyEvent(e) === 'back') {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKey, { capture: true });
    return () => window.removeEventListener('keydown', handleKey, { capture: true });
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <FocusContext.Provider value={focusKey}>
        <div ref={ref} className="rounded-2xl bg-[#1e1028] px-12 py-10 text-center shadow-2xl">
          <h2 className="mb-8 text-2xl font-semibold text-white">Exit App?</h2>
          <div className="flex items-center justify-center gap-6">
            <DialogButton focusKey="exit-yes" label="Yes" onPress={onConfirm} />
            <DialogButton focusKey="exit-no" label="No" onPress={onCancel} />
          </div>
        </div>
      </FocusContext.Provider>
    </div>
  );
}

function DialogButton({
  focusKey: fk,
  label,
  onPress,
}: {
  focusKey: string;
  label: string;
  onPress: () => void;
}) {
  const { ref, focused } = useFocusable({
    focusKey: fk,
    onEnterPress: onPress,
  });

  return (
    <button
      ref={ref}
      onClick={onPress}
      className={`min-w-[120px] rounded-lg px-8 py-3 text-lg font-medium transition-all duration-200 ${
        focused
          ? 'scale-105 bg-white text-black shadow-lg shadow-white/20'
          : 'bg-white/15 text-white hover:bg-white/25'
      }`}
    >
      {label}
    </button>
  );
}
