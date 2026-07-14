const STEPS = ['Unggah File', 'Isi Data', 'Tinjau', 'Terbitkan'];

export default function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center py-2">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const active = n === current;
        const done = n < current;

        const circleStyle = active
          ? {
            background: 'linear-gradient(135deg,#7C3AED,#C084FC)',
            color: 'white',
            boxShadow: '0 4px 14px rgba(124,58,237,.35)',
          }
          : done
            ? { background: '#10B981', color: 'white' }
            : { background: '#F3F4F6', color: '#9CA3AF' };

        const labelStyle = active
          ? { color: '#7C3AED', fontWeight: 600 }
          : done
            ? { color: '#10B981', fontWeight: 500 }
            : { color: '#9CA3AF', fontWeight: 400 };

        return (
          <div key={n} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                style={circleStyle}
              >
                {done ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  n
                )}
              </div>
              <span className="text-xs whitespace-nowrap" style={labelStyle}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="mx-2 mb-6"
                style={{
                  height: 1,
                  width: 72,
                  borderBottom: done ? '2px dashed #10B981' : '2px dashed #E5E7EB',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
