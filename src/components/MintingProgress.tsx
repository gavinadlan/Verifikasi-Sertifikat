'use client';

import React from 'react';
import { MintResult } from '@/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface MintingProgressProps {
  results: MintResult[];
  total: number;
}

export const MintingProgress: React.FC<MintingProgressProps> = ({ results, total }) => {
  const progress = total > 0 ? (results.length / total) * 100 : 0;

  return (
    <Card>
      <h3 className="font-bold mb-4">Minting Progress</h3>
      
      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
      </div>
      <p className="text-sm mb-4">{results.length} of {total} processed</p>

      <ul className="space-y-2 max-h-60 overflow-y-auto">
        {results.map((r, i) => (
          <li key={i} className="flex justify-between p-2 bg-gray-50 rounded">
            <span>{r.recipientName}</span>
            <Badge variant={r.status === 'success' ? 'success' : 'error'}>
              {r.status}
            </Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
};
