"use client";
import { isConnected, requestAccess, getAddress } from "@stellar/freighter-api";
import { useAppStore } from '@/store/useAppStore';

export type WalletStatus = {
  connected: boolean;
  address: string | null;
  error?: string;
};

export async function checkWalletConnection(): Promise<WalletStatus> {
  try {
    const connected = await isConnected();
    if (connected) {
      const addressResult = await getAddress();
      let walletAddress: string | null = null;
      if (typeof addressResult === 'string') {
        walletAddress = addressResult;
      } else if (addressResult && typeof addressResult === 'object' && 'address' in addressResult && typeof (addressResult as any).address === 'string') {
        walletAddress = (addressResult as any).address as string;
      }
      if (walletAddress) {
        // Update store (non-hook usage via state setter function inside a microtask)
        queueMicrotask(() => {
          const { setWalletConnected, setWalletAddress, setWalletError } = useAppStore.getState() as any;
          setWalletConnected(true);
          setWalletAddress(walletAddress);
          setWalletError(null);
        });
        return { connected: true, address: walletAddress };
      }
    }
    queueMicrotask(() => {
      const { setWalletConnected, setWalletAddress } = useAppStore.getState() as any;
      setWalletConnected(false);
      setWalletAddress(null);
    });
    return { connected: false, address: null };
  } catch (error) {
    queueMicrotask(() => {
      const { setWalletConnected, setWalletAddress, setWalletError } = useAppStore.getState() as any;
      setWalletConnected(false);
      setWalletAddress(null);
      setWalletError(error instanceof Error ? error.message : String(error));
    });
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
      queueMicrotask(() => {
        const { setWalletConnected, setWalletAddress, setWalletError } = useAppStore.getState() as any;
        setWalletConnected(true);
        setWalletAddress(accessResult.address as string);
        setWalletError(null);
      });
      return { address: accessResult.address as string };
    }
    
    // Eski format kontrolü (string olarak döndürüyorsa)
    if (typeof accessResult === 'string') {
      if (accessResult === "true") {
        const addressResult = await getAddress();
        if (!addressResult || typeof addressResult !== 'string') {
          throw new Error("Cüzdan adresi alınamadı.");
        }
        queueMicrotask(() => {
          const { setWalletConnected, setWalletAddress, setWalletError } = useAppStore.getState() as any;
          setWalletConnected(true);
          setWalletAddress(addressResult);
          setWalletError(null);
        });
        return { address: addressResult };
      } else if (/^G[A-Z2-7]{55}$/.test(accessResult)) {
        const addressString = accessResult as string;
        queueMicrotask(() => {
          const { setWalletConnected, setWalletAddress, setWalletError } = useAppStore.getState() as any;
          setWalletConnected(true);
          setWalletAddress(addressString);
          setWalletError(null);
        });
        return { address: addressString };
      }
    }
    
    console.log("Cüzdan bağlantısı iptal edildi veya onay verilmedi.", accessResult);
    throw new Error("Cüzdan bağlantısı iptal edildi veya onay verilmedi.");
  } catch (error) {
    queueMicrotask(() => {
      const { setWalletConnected, setWalletAddress, setWalletError } = useAppStore.getState() as any;
      setWalletConnected(false);
      setWalletAddress(null);
      setWalletError(error instanceof Error ? error.message : String(error));
    });
    throw error;
  }
} 