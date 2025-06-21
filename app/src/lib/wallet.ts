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

export async function connectWallet() {
  try {
    const connected = await isConnected();
    if (!connected) {
      throw new Error("Lütfen Freighter cüzdanını yükleyin!");
    }
    const accessResult = await requestAccess();
    const hasPermission = String(accessResult) === "true" ||
      (typeof accessResult === "string" && /^G[A-Z2-7]{55}$/.test(accessResult));
    if (!hasPermission) {
      throw new Error("Cüzdan bağlantısı iptal edildi veya onay verilmedi.");
    }
    const address = await getAddress();
    if (!address) {
      throw new Error("Cüzdan adresi alınamadı.");
    }
    return { address };
  } catch (error) {
    throw error;
  }
} 