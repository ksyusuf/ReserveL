import { Networks, TransactionBuilder, Operation, Keypair, Asset, xdr } from '@stellar/stellar-sdk';
import { Server as SorobanServer, Contract } from 'soroban-client';

// Kontrat ID'si
const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID;
if (!CONTRACT_ID) {
  throw new Error('NEXT_PUBLIC_CONTRACT_ID environment değişkeni tanımlanmamış');
}

// Stellar sunucusu
const server = new SorobanServer('https://soroban-testnet.stellar.org');
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

// Freighter cüzdanı bağlantısı için yardımcı fonksiyonlar
export async function connectFreighter(): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !window.freighter) {
      console.error('Freighter bulunamadı');
      return false;
    }

    const isConnected = await window.freighter.isConnected();
    if (isConnected) {
      console.log('Freighter zaten bağlı');
      return true;
    }

    await window.freighter.connect();
    console.log('Freighter bağlantısı başarılı');
    return true;
  } catch (error) {
    console.error('Freighter bağlantı hatası:', error);
    return false;
  }
}

export async function getFreighterPublicKey(): Promise<string> {
  try {
    // @ts-ignore
    if (!window.freighter) {
      throw new Error('Freighter bulunamadı');
    }

    // @ts-ignore
    const publicKey = await window.freighter.getPublicKey();
    if (!publicKey) {
      throw new Error('Freighter public key alınamadı');
    }

    return publicKey;
  } catch (error) {
    console.error('Freighter public key hatası:', error);
    throw error;
  }
}

// Rezervasyon oluşturma parametreleri
interface CreateReservationParams {
  businessId: string;
  customerId: string;
  reservationTime: number;
  partySize: number;
  paymentAmount: number;
  paymentAsset: string;
}

// Rezervasyon oluşturma fonksiyonu
export async function createReservation(params: CreateReservationParams) {
  try {
    console.log('Rezervasyon oluşturma başlatılıyor...');
    console.log('Parametreler:', params);
    console.log('Kontrat ID:', CONTRACT_ID);

    // Freighter bağlantısını kontrol et
    const isConnected = await connectFreighter();
    if (!isConnected) {
      throw new Error('Freighter cüzdanına bağlanılamadı');
    }

    // Public key'i al
    const publicKey = await getFreighterPublicKey();
    console.log('Public Key:', publicKey);

    // Kontrat parametrelerini hazırla
    const contractParams = [
      xdr.ScVal.scvString(params.businessId),
      xdr.ScVal.scvString(params.customerId),
      xdr.ScVal.scvU64(new xdr.Uint64(params.reservationTime.toString())),
      xdr.ScVal.scvU32(new xdr.Uint32(params.partySize.toString())),
      xdr.ScVal.scvI128(new xdr.Int128(params.paymentAmount.toString())),
      xdr.ScVal.scvString(params.paymentAsset)
    ];

    // İşlemi oluştur
    const account = await server.getAccount(publicKey);
    const transaction = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase
    })
      .addOperation(Operation.invokeHostFunction({
        func: xdr.HostFunction.hostFunctionTypeInvokeContract(
          new xdr.InvokeContractArgs({
            contractAddress: xdr.ScAddress.scAddressTypeContract(
              xdr.ContractId.fromString(CONTRACT_ID)
            ),
            functionName: 'create_reservation',
            args: contractParams
          })
        ),
        auth: []
      }))
      .setTimeout(30)
      .build();

    // İşlemi imzala ve gönder
    const signedTransaction = await window.freighter!.signTransaction(transaction.toXDR(), {
      network: 'testnet',
      networkPassphrase
    });

    const result = await server.sendTransaction(signedTransaction);
    console.log('İşlem sonucu:', result);

    return {
      success: true,
      reservationId: result.hash
    };
  } catch (error) {
    console.error('Rezervasyon oluşturma hatası:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'
    };
  }
}

export async function confirmReservation(reservationId: string) {
  try {
    console.log('Rezervasyon onaylama başlatılıyor...');
    console.log('Rezervasyon ID:', reservationId);

    // Freighter bağlantısını kontrol et
    const isConnected = await connectFreighter();
    if (!isConnected) {
      throw new Error('Freighter cüzdanına bağlanılamadı');
    }

    // Public key'i al
    const publicKey = await getFreighterPublicKey();
    console.log('Public Key:', publicKey);

    // Kontrat parametrelerini hazırla
    const contractParams = [
      new xdr.ScVal.scvString(reservationId)
    ];

    console.log('Kontrat parametreleri hazırlandı:', contractParams);

    // İşlemi oluştur
    const account = await server.loadAccount(publicKey);
    const transaction = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase
    })
      .addOperation(Operation.invokeHostFunction({
        func: xdr.HostFunction.hostFunctionTypeInvokeContract(
          new xdr.InvokeContractArgs({
            contractAddress: xdr.ScAddress.scAddressTypeContract(
              xdr.ContractId.fromString(CONTRACT_ID, networkPassphrase)
            ),
            functionName: 'confirm_reservation',
            args: contractParams
          })
        ),
        auth: []
      }))
      .setTimeout(30)
      .build();

    console.log('İşlem oluşturuldu:', transaction);

    // İşlemi imzala ve gönder
    // @ts-ignore
    const signedTransaction = await window.freighter.signTransaction(transaction.toXDR(), {
      network: 'testnet',
      networkPassphrase
    });

    console.log('İşlem imzalandı');

    const result = await server.submitTransaction(signedTransaction);
    console.log('İşlem sonucu:', result);

    return {
      success: true,
      transactionHash: result.hash
    };
  } catch (error) {
    console.error('Rezervasyon onaylama hatası:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'
    };
  }
}

export async function getReservationDetails(reservationId: string) {
  try {
    console.log('Rezervasyon detayları alınıyor...');
    console.log('Rezervasyon ID:', reservationId);

    // Kontrat parametrelerini hazırla
    const contractParams = [
      new xdr.ScVal.scvString(reservationId)
    ];

    // İşlemi oluştur
    const transaction = new TransactionBuilder(await server.loadAccount(process.env.NEXT_PUBLIC_BUSINESS_ID!), {
      fee: '100',
      networkPassphrase
    })
      .addOperation(Operation.invokeHostFunction({
        func: xdr.HostFunction.hostFunctionTypeInvokeContract(
          new xdr.InvokeContractArgs({
            contractAddress: xdr.ScAddress.scAddressTypeContract(
              xdr.ContractId.fromString(CONTRACT_ID, networkPassphrase)
            ),
            functionName: 'get_reservation_details',
            args: contractParams
          })
        ),
        auth: []
      }))
      .setTimeout(30)
      .build();

    const result = await server.submitTransaction(transaction);
    console.log('İşlem sonucu:', result);

    return {
      success: true,
      details: result.result
    };
  } catch (error) {
    console.error('Rezervasyon detayları alma hatası:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'
    };
  }
}

export async function updateReservationStatus(reservationId: number, newStatus: string) {
  try {
    const result = await contract.call(
      'update_reservation_status',
      xdr.ScVal.scvU64(xdr.Uint64.fromString(reservationId.toString())),
      xdr.ScVal.scvString(xdr.String.fromString(newStatus))
    );
    return {
      success: true,
      result: result.toString()
    };
  } catch (error) {
    console.error('Rezervasyon durumu güncellenemedi:', error);
    return {
      success: false,
      error: 'Rezervasyon durumu güncellenirken bir hata oluştu'
    };
  }
} 