import { isConnected, requestAccess, getAddress } from "@stellar/freighter-api";

export async function checkWalletConnection() {
  try {
    const connected = await isConnected();
    if (connected) {
      const address = await getAddress();
      if (address) {
        return { connected: true, address };
      }
    }
    return { connected: false, address: null };
  } catch (error) {
    return { connected: false, address: null, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function connectWallet(): Promise<{ address: string }> {
  try {
    const connected = await isConnected();
    if (!connected) {
      throw new Error("Lütfen Freighter cüzdanını yükleyin!");
    }
    
    const accessResult = await requestAccess();
    console.log("Access result:", accessResult);
    
    // requestAccess başarılı olduğunda { address: string } döndürür
    if (accessResult && typeof accessResult === 'object' && 'address' in accessResult) {
      console.log("Address from accessResult:", accessResult.address);
      return { address: accessResult.address };
    }
    
    // Eski format kontrolü (string olarak döndürüyorsa)
    if (typeof accessResult === 'string') {
      if (accessResult === "true") {
        const addressResult = await getAddress();
        if (!addressResult || typeof addressResult !== 'string') {
          throw new Error("Cüzdan adresi alınamadı.");
        }
        return { address: addressResult };
      } else if (/^G[A-Z2-7]{55}$/.test(accessResult)) {
        return { address: accessResult };
      }
    }
    
    console.log("Cüzdan bağlantısı iptal edildi veya onay verilmedi.", accessResult);
    throw new Error("Cüzdan bağlantısı iptal edildi veya onay verilmedi.");
  } catch (error) {
    throw error;
  }
} 