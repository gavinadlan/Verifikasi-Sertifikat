import { NFTMetadata } from "@/types";
import { IPFS_GATEWAY } from "@/constants";

export const uploadFileToPinata = async (file: File, name: string): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);

    const res = await fetch("/api/pinata/file", {
      method: "POST",
      body: formData,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Failed to upload to Pinata");
    return data.cid;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
};

export const uploadMetadataToPinata = async (metadata: NFTMetadata, name: string): Promise<string> => {
  try {
    const res = await fetch("/api/pinata/metadata", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        metadata,
        name,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Failed to upload metadata");
    return data.cid;
  } catch (error) {
    console.error("Error uploading metadata:", error);
    throw error;
  }
};

export const getCIDUrl = (cid: string): string => {
  if (!cid) return "";
  const cleanCid = cid.replace("ipfs://", "");
  return `${IPFS_GATEWAY}${cleanCid}`;
};
