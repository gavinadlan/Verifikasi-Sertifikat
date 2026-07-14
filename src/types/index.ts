export interface Certificate {
  tokenId: string;
  ownerAddress: string;
  issuerAddress: string;
  tokenURI: string;
  transactionHash: string;
  blockNumber: number;
  recipientName: string;
  recipientRole: ParticipantRole;
  eventTitle: string;
  eventTheme?: string;
  issueDate: string;
  organizerName: string;
  certificateNumber: string;
  pdfCID: string;
  metadataCID: string;
  isRevoked?: boolean;
}

export type ParticipantRole = 'Peserta' | 'Pembicara' | 'Panitia';

export interface Participant {
  recipientName: string;
  role: ParticipantRole;
  sequenceNumber: number;
  walletAddress?: string;
  email?: string;
  certificateNumber?: string;
}

export interface MintResult {
  tokenId: string;
  recipientName: string;
  transactionHash: string;
  metadataCID: string;
  qrCodeUrl: string;
  status: 'success' | 'failed';
  error?: string;
}

export interface IssuanceSession {
  eventTitle: string;
  issueDate: string;
  organizerName: string;
  eventTheme?: string;
  templatePdfCID: string;
  templateFile?: File;
  participants: Participant[];
  mintingResults: MintResult[];
}

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  external_url: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
}

export interface VerificationResult {
  isValid: boolean;
  isRevoked?: boolean;
  certificate?: Certificate;
  error?: string;
  verifiedAt: string;
}
