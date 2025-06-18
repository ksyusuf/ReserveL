import { Server, TransactionBuilder, Networks, Contract, Address, xdr } from 'soroban-client';
import nativeToScVal from 'soroban-client';

const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID!;
const server = new Server('https://soroban-testnet.stellar.org');
const networkPassphrase = Networks.TESTNET;

declare global {
  interface Window {
    freighter?: {
      isConnected: () => Promise<boolean>;
      connect: () => Promise<void>;
      getPublicKey: () => Promise<string>;
      signTransaction: (xdr: string, opts: { network: string; networkPassphrase: string }) => Promise<string>;
    };
  }
}

export async function connectFreighter(): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !window.freighter) {
      return false;
    }
    const isConnected = await window.freighter.isConnected();
    if (!isConnected) {
      await window.freighter.connect();
    }
    return true;
  } catch {
    return false;
  }
}

export async function getFreighterPublicKey(): Promise<string> {
  if (!window.freighter) throw new Error('Freighter bulunamadı');
  return window.freighter.getPublicKey();
}

export async function createReservation({
  businessId,
  reservationTime,
  partySize,
  paymentAmount,
  paymentAsset,
}: {
  businessId: string;
  reservationTime: number;
  partySize: number;
  paymentAmount: number;
  paymentAsset: string;
}) {
  try {
    await connectFreighter();
    const publicKey = await getFreighterPublicKey();
    const contract = new Contract(CONTRACT_ID);
    const account = await server.getAccount(publicKey);
    const transaction = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase,
    })
      .addOperation(
        contract.call(
          'create_reservation',
          nativeToScVal(businessId, { type: 'address' }),
          nativeToScVal(BigInt(reservationTime), { type: 'u64' }),
          nativeToScVal(partySize, { type: 'u32' }),
          nativeToScVal(BigInt(paymentAmount), { type: 'i128' }),
          nativeToScVal(paymentAsset, { type: 'address' })
        )
      )
      .setTimeout(30)
      .build();
    const signedXdr = await window.freighter!.signTransaction(transaction.toXDR(), {
      network: 'testnet',
      networkPassphrase,
    });
    const signedTx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase);
    const result = await server.sendTransaction(signedTx);
    return { success: true, reservationId: result.hash };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Bilinmeyen hata' };
  }
}

export async function confirmReservation(reservationId: number, customerId: string) {
  try {
    await connectFreighter();
    const publicKey = await getFreighterPublicKey();
    const contract = new Contract(CONTRACT_ID);
    const account = await server.getAccount(publicKey);
    const transaction = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase,
    })
      .addOperation(
        contract.call(
          'confirm_reservation',
          nativeToScVal(BigInt(reservationId), { type: 'u64' }),
          nativeToScVal(customerId, { type: 'address' })
        )
      )
      .setTimeout(30)
      .build();
    const signedXdr = await window.freighter!.signTransaction(transaction.toXDR(), {
      network: 'testnet',
      networkPassphrase,
    });
    const signedTx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase);
    const result = await server.sendTransaction(signedTx);
    return { success: true, transactionHash: result.hash };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Bilinmeyen hata' };
  }
}

export async function updateReservationStatus(reservationId: number, newStatus: number) {
  try {
    await connectFreighter();
    const publicKey = await getFreighterPublicKey();
    const contract = new Contract(CONTRACT_ID);
    const account = await server.getAccount(publicKey);
    const transaction = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase,
    })
      .addOperation(
        contract.call(
          'update_reservation_status',
          nativeToScVal(BigInt(reservationId), { type: 'u64' }),
          nativeToScVal(newStatus, { type: 'u32' })
        )
      )
      .setTimeout(30)
      .build();
    const signedXdr = await window.freighter!.signTransaction(transaction.toXDR(), {
      network: 'testnet',
      networkPassphrase,
    });
    const signedTx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase);
    const result = await server.sendTransaction(signedTx);
    return { success: true, transactionHash: result.hash };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Bilinmeyen hata' };
  }
}

export async function getReservation(reservationId: number) {
  try {
    const publicKey = await getFreighterPublicKey();
    const contract = new Contract(CONTRACT_ID);
    const account = await server.getAccount(publicKey);
    const transaction = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase,
    })
      .addOperation(
        contract.call(
          'get_reservation',
          nativeToScVal(BigInt(reservationId), { type: 'u64' })
        )
      )
      .setTimeout(30)
      .build();
    const signedXdr = await window.freighter!.signTransaction(transaction.toXDR(), {
      network: 'testnet',
      networkPassphrase,
    });
    const signedTx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase);
    const result = await server.sendTransaction(signedTx);
    return { success: true, details: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Bilinmeyen hata' };
  }
} 