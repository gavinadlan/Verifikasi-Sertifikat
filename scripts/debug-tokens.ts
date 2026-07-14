import { ethers } from "hardhat";

async function main() {
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!contractAddress) return;
  
  const contract = await ethers.getContractAt("CertificateNFT", contractAddress);
  
  const totalSupply = await contract.totalSupply();
  console.log("Total Supply:", totalSupply.toString());
  
  for (let i = 1; i <= Number(totalSupply); i++) {
    try {
      const tokenURI = await contract.tokenURI(i);
      const owner = await contract.ownerOf(i);
      const issuer = await contract.getCertificateIssuer(i);
      console.log(`\nToken #${i}:`);
      console.log("  Owner:", owner);
      console.log("  Issuer:", issuer);
      console.log("  TokenURI:", tokenURI);
      
      // Try fetching metadata from IPFS
      const cleanCID = tokenURI.replace('ipfs://', '');
      const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs/";
      const url = `${gateway}${cleanCID}`;
      console.log("  IPFS URL:", url);
      
      try {
        const res = await fetch(url);
        if (res.ok) {
          const meta = await res.json();
          const issuerWallet = meta.attributes?.find((a: any) => a.trait_type === 'Issuer Wallet')?.value || '';
          console.log("  Metadata Issuer Wallet:", issuerWallet);
          console.log("  Match deployer?", issuerWallet.toLowerCase() === (await ethers.provider.getSigner()).address.toLowerCase());
        } else {
          console.log("  IPFS fetch failed:", res.status, res.statusText);
        }
      } catch (fetchErr: any) {
        console.log("  IPFS fetch error:", fetchErr.message);
      }
    } catch (err: any) {
      console.log(`Token #${i}: ERROR -`, err.message?.slice(0, 100));
    }
  }
}

main().catch(console.error);
