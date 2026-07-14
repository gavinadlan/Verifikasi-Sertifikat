import { useState } from 'react';
import { NFTMetadata } from '@/types';
import { uploadFileToPinata, uploadMetadataToPinata } from '@/lib/ipfs';
// KPI No.2: pengukur kecepatan upload IPFS (hasil di Console browser, F12)
import { ukurUploadIPFS } from '@/lib/ipfsUploadTiming';

export const useIPFS = () => {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (file: File): Promise<string> => {
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);
    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(p => Math.min(p + 10, 90));
      }, 500);

      const cid = await ukurUploadIPFS(
        () => uploadFileToPinata(file, file.name || 'certificate.pdf'),
        file.name || 'certificate.pdf',
        file.size,
        'template-pdf'
      );

      clearInterval(progressInterval);
      setUploadProgress(100);
      return cid;
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  const uploadMetadata = async (metadata: NFTMetadata): Promise<string> => {
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);
    try {
      setUploadProgress(50);
      const cid = await ukurUploadIPFS(
        () => uploadMetadataToPinata(metadata, metadata.name),
        `metadata_${metadata.name}.json`,
        JSON.stringify(metadata).length,
        'metadata-json'
      );
      setUploadProgress(100);
      return cid;
    } catch (err: any) {
      setError(err.message || 'Failed to upload metadata');
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadFile,
    uploadMetadata,
    isUploading,
    uploadProgress,
    error
  };
};
