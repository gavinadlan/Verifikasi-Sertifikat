import { useRef, useState, useCallback } from 'react';

export default function DropZone({ file, onFile }: { file: File | null; onFile: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MAX_SIZE = 10 * 1024 * 1024;
  const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];

  const isAllowed = (f: File) => ALLOWED_TYPES.includes(f.type);

  const getTypeLabel = (f: File) => {
    if (f.type === 'application/pdf') return 'PDF';
    if (f.type === 'image/png') return 'PNG';
    if (f.type === 'image/jpeg') {
      const lower = f.name.toLowerCase();
      return lower.endsWith('.jpg') ? 'JPG' : 'JPEG';
    }
    return 'Unknown';
  };

  const handleFile = useCallback((f?: File) => {
    if (!f) return;
    if (!isAllowed(f)) {
      setError('Format tidak didukung. Gunakan PDF, JPG, JPEG, atau PNG.');
      return;
    }
    if (f.size > MAX_SIZE) {
      setError('Ukuran file melebihi 10MB.');
      return;
    }
    setError(null);
    onFile(f);
  }, [onFile]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDrag(false);
      handleFile(e.dataTransfer.files[0]);
    },
    [handleFile]
  );

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      onClick={() => !file && ref.current?.click()}
      className="rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center py-14 gap-4"
      style={{
        border: drag ? '2px dashed #A78BFA' : file ? '2px solid #10B981' : '2px dashed #D8B4FE',
        background: drag ? 'rgba(167,139,250,.06)' : file ? 'rgba(16,185,129,.04)' : '#FAF5FF',
        minHeight: 260,
      }}
    >
      <input
        ref={ref}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {file ? (
        <>
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#ECFDF5,#D1FAE5)' }}
          >
            <svg className="w-8 h-8" fill="none" stroke="#10B981" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700">{file.name}</p>
            <p className="text-xs text-slate-400 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB · {getTypeLabel(file)}</p>
          </div>
          <div className="flex gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ background: '#ECFDF5', color: '#059669' }}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              File siap diupload
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); ref.current?.click(); }}
              className="px-3 py-1.5 rounded-full text-xs font-medium border border-gray-200 text-slate-500 hover:bg-gray-50 transition-all"
            >
              Ganti File
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="text-5xl">☁️</div>
          <div className="text-center">
            <p className="text-base font-semibold text-slate-700">Seret file PDF/JPG/JPEG/PNG ke sini</p>
            <p className="text-sm text-slate-400 mt-0.5">atau</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); ref.current?.click(); }}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold hover:shadow-md transition-all"
            style={{ border: '1.5px solid #7C3AED', color: '#7C3AED', background: 'white' }}
          >
            Pilih File dari Komputer
          </button>
          <p className="text-xs text-slate-400">Format: PDF, JPG, JPEG, PNG | Maks: 10MB</p>
        </>
      )}
      {error && <p className="text-xs font-medium text-red-500 mt-1">{error}</p>}
    </div>
  );
}
