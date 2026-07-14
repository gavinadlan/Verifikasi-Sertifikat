import QRCode from 'qrcode';
import { APP_URL } from '@/constants';

export const getVerificationURL = (tokenId: string): string => {
  return `${APP_URL}/verify/${tokenId}`;
};

export const generateQRCodeDataURL = async (tokenId: string, appUrl: string = APP_URL): Promise<string> => {
  try {
    const url = `${appUrl}/verify/${tokenId}`;
    const dataUrl = await QRCode.toDataURL(url);
    return dataUrl;
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw error;
  }
};
