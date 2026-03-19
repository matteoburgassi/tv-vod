import { useEffect } from 'react';
import { useFocusable, FocusContext, setFocus } from '@noriginmedia/norigin-spatial-navigation';
import { mapKeyEvent } from '../utils/keyMap';

interface LogoutDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function LogoutDialog({ onConfirm, onCancel }: LogoutDialogProps) {
  const { ref, focusKey } = useFocusable({
    focusKey: 'logout-dialog',
    isFocusBoundary: true,
    trackChildren: true,
  });

  useEffect(() => {
    setFocus('logout-no');
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      style={{ transform: 'translate3d(0,0,0)' }}
    >
      <FocusContext.Provider value={focusKey}>
        <div ref={ref} className="rounded-2xl bg-[#1e1028] px-12 py-10 text-center shadow-2xl">
          <h2 className="mb-3 text-2xl font-semibold text-white">Sign Out?</h2>
          <p className="mb-8 text-sm text-white/50">Are you sure you want to sign out?</p>
          <div className="flex items-center justify-center gap-6">
            <DialogButton focusKey="logout-yes" label="Sign Out" onPress={onConfirm} />
            <DialogButton focusKey="logout-no" label="Cancel" onPress={onCancel} />
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
      className="min-w-[6.25vw] rounded-lg px-8 py-3 text-lg font-medium"
      style={{
        backgroundColor: focused ? 'white' : 'rgba(255,255,255,0.15)',
        color: focused ? 'black' : 'white',
        transform: focused ? 'translate3d(0,0,0) scale(1.05)' : 'translate3d(0,0,0) scale(1)',
        boxShadow: focused ? '0 10px 15px -3px rgba(255,255,255,0.2)' : 'none',
        transition: 'transform 200ms ease-out, background-color 200ms ease-out, color 200ms ease-out, box-shadow 200ms ease-out',
      }}
    >
      {label}
    </button>
  );
}
