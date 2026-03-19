import { useState, useCallback, useEffect, useRef } from 'react';
import {
  useFocusable,
  FocusContext,
  setFocus,
} from '@noriginmedia/norigin-spatial-navigation';

type Layout = 'lower' | 'upper' | 'symbols';

const LAYOUTS: Record<Layout, string[][]> = {
  lower: [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', '@'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', '.', '-', '_'],
  ],
  upper: [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', '@'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '.', '-', '_'],
  ],
  symbols: [
    ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'],
    ['+', '=', '{', '}', '[', ']', '|', '\\', ':', ';'],
    ['"', "'", '<', '>', ',', '.', '?', '/', '~', '`'],
    ['€', '£', '¥', '©', '®', '™', '…', '—', '–', '°'],
  ],
};


interface TVKeyboardProps {
  value: string;
  label?: string;
  masked?: boolean;
  onChanged: (value: string) => void;
  onSubmit: (value: string) => void;
  onNext?: (value: string) => void;
  onCancel: () => void;
}

export default function TVKeyboard({
  value,
  label,
  masked = false,
  onChanged,
  onSubmit,
  onNext,
  onCancel,
}: TVKeyboardProps) {
  const [layout, setLayout] = useState<Layout>('lower');
  const cursorPos = useRef(value.length);

  useEffect(() => {
    cursorPos.current = value.length;
  }, [value]);

  const { ref: containerRef, focusKey } = useFocusable({
    focusKey: 'tv-keyboard',
    isFocusBoundary: true,
    trackChildren: true,
  });

  useEffect(() => {
    setFocus('tv-key-0-0');
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Backspace') {
        if (e.key === 'Backspace') {
          const el = document.activeElement;
          if (el?.getAttribute('data-tvkey')) {
            return;
          }
        }
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [onCancel]);

  const handleKey = useCallback(
    (key: string) => {
      let next = value;
      switch (key) {
        case '⌫':
          next = value.slice(0, -1);
          break;
        case '␣':
          next = value + ' ';
          break;
        case '⇧':
          setLayout((l) => (l === 'upper' ? 'lower' : 'upper'));
          return;
        case '#+=':
          setLayout('symbols');
          return;
        case 'abc':
          setLayout('lower');
          return;
        case '→':
          onNext?.(value);
          return;
        case '✓':
          onSubmit(value);
          return;
        default:
          next = value + key;
          if (layout === 'upper') setLayout('lower');
          break;
      }
      onChanged(next);
    },
    [value, layout, onChanged, onSubmit],
  );

  const rows = LAYOUTS[layout];
  const baseActions =
    layout === 'symbols'
      ? ['abc', '⌫', '␣']
      : ['⇧', '#+=', '⌫', '␣'];
  const actionRow = onNext
    ? [...baseActions, '→', '✓']
    : [...baseActions, '✓'];

  const displayValue = masked ? '•'.repeat(value.length) : value;

  return (
    <FocusContext.Provider value={focusKey}>
      <div
        ref={containerRef}
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm"
      >
        <div className="w-full max-w-[60vw] pb-[3vw]">
          {/* Input preview */}
          <div className="mb-[1.5vw] rounded-xl bg-white/10 px-[1.5vw] py-[1vw]">
            {label && (
              <div className="mb-[0.3vw] text-[0.9vw] font-medium text-white/50">
                {label}
              </div>
            )}
            <div className="flex items-center text-[1.4vw] text-white">
              <span>{displayValue}</span>
              <span className="ml-px inline-block h-[1.6vw] w-[0.15vw] animate-pulse bg-white" />
            </div>
          </div>

          {/* Character grid */}
          <div className="space-y-[0.5vw]">
            {rows.map((row, ri) => (
              <div key={ri} className="flex justify-center gap-[0.4vw]">
                {row.map((ch, ci) => (
                  <KeyButton
                    key={`${layout}-${ri}-${ci}`}
                    focusKey={`tv-key-${ri}-${ci}`}
                    label={ch}
                    onPress={() => handleKey(ch)}
                  />
                ))}
              </div>
            ))}

            {/* Action row */}
            <div className="flex justify-center gap-[0.4vw] pt-[0.3vw]">
              {actionRow.map((key, i) => (
                <KeyButton
                  key={`action-${key}`}
                  focusKey={`tv-key-action-${i}`}
                  label={key === '→' ? 'Next' : key === '✓' ? 'Done' : key}
                  wide={key === '␣'}
                  accent={key === '→' ? 'blue' : key === '✓' ? 'green' : undefined}
                  onPress={() => handleKey(key)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </FocusContext.Provider>
  );
}

function KeyButton({
  focusKey,
  label,
  onPress,
  wide = false,
  accent,
}: {
  focusKey: string;
  label: string;
  onPress: () => void;
  wide?: boolean;
  accent?: 'green' | 'blue';
}) {
  const { ref, focused } = useFocusable({
    focusKey,
    onEnterPress: onPress,
  });

  const widthClass = wide ? 'min-w-[12vw]' : label === 'Next' || label === 'Done' ? 'min-w-[6vw]' : 'min-w-[4vw]';

  let colorClass: string;
  if (focused) {
    if (accent === 'blue') colorClass = 'bg-blue-500 text-white scale-110 shadow-lg shadow-blue-500/30';
    else if (accent === 'green') colorClass = 'bg-green-500 text-black scale-110 shadow-lg shadow-green-500/30';
    else colorClass = 'bg-white text-black scale-110 shadow-lg';
  } else {
    if (accent === 'blue') colorClass = 'bg-blue-500/30 text-blue-300';
    else if (accent === 'green') colorClass = 'bg-green-500/30 text-green-300';
    else colorClass = 'bg-white/10 text-white/80';
  }

  return (
    <div
      ref={ref}
      data-tvkey="true"
      onClick={onPress}
      className={[
        'flex items-center justify-center rounded-lg px-[0.8vw] py-[0.7vw] text-[1.1vw] font-medium transition-all select-none',
        widthClass,
        colorClass,
      ].join(' ')}
    >
      {label}
    </div>
  );
}
