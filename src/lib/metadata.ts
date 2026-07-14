import { NFTMetadata } from "@/types";

export interface BuildMetadataParams {
  recipientName: string;
  role: 'Peserta' | 'Pembicara' | 'Panitia';
  eventTitle: string;
  eventTheme?: string;
  issueDate: string;
  organizerName: string;
  pdfCID: string;
  issuerAddress: string;
  recipientWalletAddress: string;
  certificateNumber?: string;
  sequenceNumber: number;
  tokenId: string;
  appUrl: string;
}

export const generateCertificateNumber = (issueDate: string, sequenceNumber: number): string => {
  const year = (issueDate || '').slice(0, 4) || new Date().getFullYear().toString();
  return `CERT-${year}-${String(sequenceNumber).padStart(3, '0')}`;
};

export const buildNFTMetadata = (params: BuildMetadataParams): NFTMetadata => {
  const certificateNumber =
    params.certificateNumber?.trim() || generateCertificateNumber(params.issueDate, params.sequenceNumber);

  const attributes: NFTMetadata["attributes"] = [
    { trait_type: "Nomor Sertifikat", value: certificateNumber },
    { trait_type: "Nama Penerima", value: params.recipientName },
    { trait_type: "Peran", value: params.role },
    { trait_type: "Nama Event", value: params.eventTitle },
  ];

  if (params.eventTheme?.trim()) {
    attributes.push({ trait_type: "Tema Event", value: params.eventTheme.trim() });
  }

  attributes.push(
    { trait_type: "Tanggal Penerbitan", value: params.issueDate },
    { trait_type: "Penyelenggara", value: params.organizerName },
    { trait_type: "Issuer Wallet", value: params.issuerAddress },
    { trait_type: "Recipient Wallet", value: params.recipientWalletAddress }
  );

  return {
    name: `Sertifikat ${params.role} — ${params.recipientName}`,
    description: `Sertifikat ${params.role} untuk ${params.recipientName} pada event ${params.eventTitle}.`,
    image: `ipfs://${params.pdfCID}`,
    external_url: `${params.appUrl}/verify/${params.tokenId}`,
    attributes
  };
};
