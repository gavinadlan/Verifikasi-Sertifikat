'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Participant } from '@/types';
import { parseParticipantsCSV, downloadCSVTemplate } from '@/lib/csv';

interface CSVUploaderProps {
  onParsed: (participants: Participant[]) => void;
}

export const CSVUploader: React.FC<CSVUploaderProps> = ({ onParsed }) => {
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      const participants = await parseParticipantsCSV(file);
      onParsed(participants);
    } catch (err: any) {
      setError(err.message || 'Failed to parse CSV');
    }
  };

  return (
    <div className="border-2 border-dashed border-gray-300 p-8 text-center rounded-lg">
      <h3 className="text-lg font-medium mb-2">Unggah CSV Peserta</h3>
      <p className="text-gray-500 mb-4">Kolom wajib: recipient_name, role. Opsional: wallet_address, email.</p>
      
      <div className="space-x-4">
        <Button onClick={() => fileInputRef.current?.click()}>
          Pilih File
        </Button>
        <Button variant="secondary" onClick={downloadCSVTemplate}>
          Unduh Template
        </Button>
      </div>
      
      <input 
        type="file" 
        accept=".csv" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
      />
      
      {error && <p className="text-red-500 mt-4">{error}</p>}
    </div>
  );
};
