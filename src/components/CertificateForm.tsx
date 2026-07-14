'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CSVUploader } from '@/components/CSVUploader';
import { IssuanceSession } from '@/types';

interface CertificateFormProps {
  onStartMint: (session: IssuanceSession) => void;
  disabled: boolean;
}

export const CertificateForm: React.FC<CertificateFormProps> = ({ onStartMint, disabled }) => {
  const [step, setStep] = useState(1);
  const [session, setSession] = useState<Partial<IssuanceSession>>({
    participants: [],
    eventTheme: ''
  });

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSession({ ...session, templateFile: e.target.files[0] });
    }
  };

  return (
    <Card>
      <div className="mb-4">
        <h2 className="text-xl font-bold">Terbitkan Sertifikat - Langkah {step} dari 4</h2>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <p>Unggah template PDF sertifikat Anda.</p>
          <div className="border border-dashed p-8 text-center">
             <input type="file" accept="application/pdf,image/*" onChange={handleFileChange} disabled={disabled}/>
             {session.templateFile && <p className="mt-2 text-green-600 border px-1 w-fit mx-auto">{session.templateFile.name}</p>}
          </div>
          <Button onClick={nextStep} disabled={!session.templateFile || disabled}>Lanjut</Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <CSVUploader onParsed={(participants) => setSession({ ...session, participants })} />
          {session.participants && session.participants.length > 0 && (
            <p className="text-green-600">{session.participants.length} peserta berhasil dimuat.</p>
          )}
          <div className="flex space-x-2">
            <Button variant="secondary" onClick={prevStep} disabled={disabled}>Kembali</Button>
            <Button onClick={nextStep} disabled={!session.participants?.length || disabled}>Lanjut</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <label className="block mb-1">Nama Event</label>
            <input 
               type="text" 
               className="border w-full p-2 rounded"
               onChange={e => setSession({...session, eventTitle: e.target.value})}
               value={session.eventTitle || ""}
               disabled={disabled}
            />
          </div>
          <div>
            <label className="block mb-1">Nama Penyelenggara</label>
            <input 
               type="text" 
               className="border w-full p-2 rounded"
               onChange={e => setSession({...session, organizerName: e.target.value})}
               value={session.organizerName || ""}
               disabled={disabled}
            />
          </div>
          <div>
            <label className="block mb-1">Tanggal Penerbitan</label>
            <input 
               type="date" 
               className="border w-full p-2 rounded"
               onChange={e => setSession({...session, issueDate: e.target.value})}
               value={session.issueDate || ""}
               disabled={disabled}
            />
          </div>
          <div>
            <label className="block mb-1">Tema Event (Opsional)</label>
            <input
               type="text"
               className="border w-full p-2 rounded"
               onChange={e => setSession({...session, eventTheme: e.target.value})}
               value={session.eventTheme || ""}
               disabled={disabled}
            />
          </div>
          <div className="flex space-x-2">
            <Button variant="secondary" onClick={prevStep} disabled={disabled}>Kembali</Button>
            <Button onClick={nextStep} disabled={disabled || !session.eventTitle || !session.organizerName || !session.issueDate}>Tinjau</Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h3 className="font-bold">Ringkasan</h3>
          <p>Event: {session.eventTitle}</p>
          <p>Penyelenggara: {session.organizerName}</p>
          <p>Tanggal: {session.issueDate}</p>
          <p>Jumlah Peserta: {session.participants?.length}</p>
          <p>File: {session.templateFile?.name}</p>
          
          <div className="flex space-x-2 mt-4">
            <Button variant="secondary" onClick={prevStep} disabled={disabled}>Kembali</Button>
            <Button 
               onClick={() => onStartMint(session as IssuanceSession)}
               disabled={disabled}
               className={disabled ? "opacity-50" : ""}
            >
               Terbitkan Sertifikat
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
