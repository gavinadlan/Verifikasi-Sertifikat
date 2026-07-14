export interface IssueFormData {
  recipientName: string;
  role: 'Peserta' | 'Pembicara' | 'Panitia';
  recipientWalletAddress: string;
  recipientEmail: string;
  eventName: string;
  issueDate: string;
  organizerName: string;
  eventTheme: string;
  certificateNumberMode: 'auto' | 'custom';
  customCertificateNumber: string;
}

interface IssueFormProps {
  form: IssueFormData;
  updateForm: (field: keyof IssueFormData, value: string) => void;
  batchMode?: boolean;
  batchCount?: number;
}

const inputCls =
  'w-full px-4 py-3 rounded-xl text-sm text-slate-700 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all placeholder:text-slate-300 bg-white';

export default function IssueForm({ form, updateForm, batchMode = false, batchCount = 0 }: IssueFormProps) {
  return (
    <div className="rounded-2xl p-6 bg-white shadow-sm border border-gray-100 space-y-5">
      {/* Data peserta — disembunyikan saat batch mode */}
      {batchMode ? (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 flex items-start gap-3">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center mt-0.5">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-indigo-800">
              Data peserta diambil dari CSV yang sudah diupload ({batchCount} peserta)
            </p>
            <p className="text-xs text-indigo-600/70 mt-1">
              Nama penerima, peran, wallet address, dan email akan diambil dari file CSV.
              Isi data event di bawah untuk melengkapi sertifikat.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                Nama Penerima
              </label>
              <input
                className={inputCls}
                placeholder="Masukkan nama penerima"
                value={form.recipientName}
                onChange={(e) => updateForm('recipientName', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                Peran
              </label>
              <select
                className={inputCls}
                value={form.role}
                onChange={(e) => updateForm('role', e.target.value as IssueFormData['role'])}
              >
                <option value="Peserta">Peserta</option>
                <option value="Pembicara">Pembicara</option>
                <option value="Panitia">Panitia</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                Wallet Address (Opsional)
              </label>
              <input
                className={inputCls}
                placeholder="0x..."
                value={form.recipientWalletAddress}
                onChange={(e) => updateForm('recipientWalletAddress', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                Email (Opsional)
              </label>
              <input
                className={inputCls}
                placeholder="email@contoh.com"
                value={form.recipientEmail}
                onChange={(e) => updateForm('recipientEmail', e.target.value)}
              />
            </div>
          </div>
        </>
      )}

      {/* Konfigurasi event — selalu tampil */}
      <div>
        <label className="text-xs font-semibold text-slate-600 block mb-1.5">
          Nama Event / Seminar
        </label>
        <input
          className={inputCls}
          placeholder="Masukkan nama event"
          value={form.eventName}
          onChange={(e) => updateForm('eventName', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1.5">
            Tanggal Penerbitan
          </label>
          <input
            type="date"
            className={inputCls}
            value={form.issueDate}
            onChange={(e) => updateForm('issueDate', e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1.5">
            Nama Penyelenggara
          </label>
          <input
            className={inputCls}
            placeholder="Masukkan nama penyelenggara"
            value={form.organizerName}
            onChange={(e) => updateForm('organizerName', e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-600 block mb-1.5">
          Tema Event (Opsional)
        </label>
        <input
          className={inputCls}
          placeholder='Contoh: "AI Challenges and Ethics For Gen Z"'
          value={form.eventTheme}
          onChange={(e) => updateForm('eventTheme', e.target.value)}
        />
      </div>

      {/* Nomor sertifikat */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-slate-600 block">
          Nomor Sertifikat
        </label>
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="radio"
              checked={form.certificateNumberMode === 'auto'}
              onChange={() => updateForm('certificateNumberMode', 'auto')}
            />
            Auto-generate
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="radio"
              checked={form.certificateNumberMode === 'custom'}
              onChange={() => updateForm('certificateNumberMode', 'custom')}
            />
            Custom
          </label>
        </div>
        {form.certificateNumberMode === 'custom' && (
          <input
            className={inputCls}
            placeholder="001/HMJ-SI-TI/SEMINAR HIMASTIKA X HUMANIS/X/2024"
            value={form.customCertificateNumber}
            onChange={(e) => updateForm('customCertificateNumber', e.target.value)}
          />
        )}
      </div>
    </div>
  );
}

