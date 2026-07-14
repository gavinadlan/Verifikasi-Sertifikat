'use client';

import React from 'react';
import { Certificate } from '@/types';
import { Badge } from '@/components/ui/Badge';

interface CertificateTableProps {
  certificates: Certificate[];
}

export const CertificateTable: React.FC<CertificateTableProps> = ({ certificates }) => {
  if (certificates.length === 0) {
    return <div className="p-4 text-center text-gray-500 border rounded">No certificates found</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="py-2 px-4 border-b text-left">No</th>
            <th className="py-2 px-4 border-b text-left">Nama</th>
            <th className="py-2 px-4 border-b text-left">Event</th>
            <th className="py-2 px-4 border-b text-left">Tanggal</th>
            <th className="py-2 px-4 border-b text-left">Token ID</th>
            <th className="py-2 px-4 border-b text-left">Status</th>
            <th className="py-2 px-4 border-b text-left">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {certificates.map((cert, idx) => (
            <tr key={cert.tokenId} className="hover:bg-gray-50">
              <td className="py-2 px-4 border-b">{idx + 1}</td>
              <td className="py-2 px-4 border-b">{cert.recipientName}</td>
              <td className="py-2 px-4 border-b">{cert.eventTitle}</td>
              <td className="py-2 px-4 border-b">{cert.issueDate}</td>
              <td className="py-2 px-4 border-b">{cert.tokenId}</td>
              <td className="py-2 px-4 border-b">
                <Badge variant="success">Minted</Badge>
              </td>
              <td className="py-2 px-4 border-b">
                <a href={`/verify/${cert.tokenId}`} className="text-blue-600 hover:underline">View</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
