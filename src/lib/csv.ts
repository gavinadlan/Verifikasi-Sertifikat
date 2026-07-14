import Papa from 'papaparse';
import { Participant, ParticipantRole } from '@/types';

const ROLE_MAP: Record<string, ParticipantRole> = {
  peserta: 'Peserta',
  pembicara: 'Pembicara',
  panitia: 'Panitia',
};

const normalizeRole = (raw: unknown): ParticipantRole => {
  const key = String(raw || '').trim().toLowerCase();
  return ROLE_MAP[key] || 'Peserta';
};

export const parseParticipantsCSV = (file: File): Promise<Participant[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const validParticipants: Participant[] = results.data.map((row: any, index: number) => {
            if (!row.recipient_name) throw new Error(`Missing recipient_name at row ${index + 1}`);
            return {
              recipientName: String(row.recipient_name),
              role: normalizeRole(row.role),
              sequenceNumber: index + 1,
              walletAddress: row.wallet_address ? String(row.wallet_address) : undefined,
              email: row.email ? String(row.email) : undefined,
              certificateNumber: row.certificate_number ? String(row.certificate_number) : undefined,
            };
          });
          resolve(validParticipants);
        } catch (error) {
          reject(error);
        }
      },
      error: (error: Error) => {
        reject(error);
      }
    });
  });
};

export const downloadCSVTemplate = () => {
  if (typeof document !== "undefined") {
      const link = document.createElement("a");
      link.href = "/template-peserta.csv";
      link.download = "template-peserta.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  }
};
