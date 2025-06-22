import {
  rpc,
  Networks,
  nativeToScVal,
  Operation,
  TransactionBuilder,
  BASE_FEE,
  Memo,
} from '@stellar/stellar-sdk';
import { signTransaction, requestAccess } from '@stellar/freighter-api';

const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID!;
const SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';

export async function updateReservationStatusOnContract(reservationId: string, newStatus: 'Completed' | 'NoShow') {
  console.log('🔍 updateReservationStatusOnContract başladı:', { reservationId, newStatus });
  try {
    const { address } = await requestAccess();
    console.log('🔍 Cüzdan adresi alındı:', address);
    if (!address) throw new Error('Cüzdan bağlantısı gerekli');
    
    const server = new rpc.Server(SOROBAN_RPC_URL);
    const account = await server.getAccount(address);
    console.log('🔍 Hesap bilgileri alındı:', account.accountId());
    
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
      memo: Memo.none(),
    })
      .addOperation(
        Operation.invokeContractFunction({
          contract: CONTRACT_ID,
          function: 'update_reservation_status',
          args: [
            nativeToScVal(reservationId, { type: 'u64' }),
            nativeToScVal(newStatus, { type: 'symbol' })
          ],
        })
      )
      .setTimeout(60)
      .build();
    
    console.log('🔍 Transaction oluşturuldu, imzalanıyor...');
    const { signedTxXdr } = await signTransaction(tx.toXDR(), {
      networkPassphrase: Networks.TESTNET,
    });
    const signedTx = TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET);
    
    console.log('🔍 Transaction gönderiliyor...');
    const txResponse = await server.sendTransaction(signedTx);
    console.log('🔍 Transaction başarılı:', txResponse.hash);
    
    return { success: true, hash: txResponse.hash };
  } catch (error) {
    console.error('❌ updateReservationStatusOnContract hatası:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Bilinmeyen hata' };
  }
}

export async function getLoyaltyTokenId() {
  try {
    const { address } = await requestAccess();
    if (!address) throw new Error('Cüzdan bağlantısı gerekli');
    const server = new rpc.Server(SOROBAN_RPC_URL);
    const account = await server.getAccount(address);
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
      memo: Memo.none(),
    })
      .addOperation(
        Operation.invokeContractFunction({
          contract: CONTRACT_ID,
          function: 'get_loyalty_token_id',
          args: [],
        })
      )
      .setTimeout(60)
      .build();
    const simResult = await server.simulateTransaction(tx);
    if ('result' in simResult && simResult.result && 'retval' in simResult.result) {
      return { success: true, tokenId: simResult.result.retval };
    }
    return { success: false, error: 'Token ID alınamadı' };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Bilinmeyen hata' };
  }
}

export async function initializeContract(loyaltyTokenId?: string) {
  console.log('🔍 initializeContract başladı');
  try {
    const { address } = await requestAccess();
    console.log('🔍 Cüzdan adresi alındı:', address);
    if (!address) throw new Error('Cüzdan bağlantısı gerekli');
    
    const server = new rpc.Server(SOROBAN_RPC_URL);
    const account = await server.getAccount(address);
    console.log('🔍 Hesap bilgileri alındı:', account.accountId());
    
    // Loyalty token ID'sini al
    // Testnet'te oluşturulmuş örnek sadakat token'ı
    // Bu token müşterilere verilecek sadakat puanlarını temsil eder
    let finalLoyaltyTokenId = loyaltyTokenId || 'CBYVYXTW3RZ27VD5E6ZVD4Z5USKNIDTCY26ZBF4TDDG5LVDUYKGTGBBX';
    if (!finalLoyaltyTokenId) {
      console.log('⚠️ Loyalty Token ID bulunamadı');
      throw new Error('Loyalty Token ID gerekli. Lütfen loyalty token ID\'sini parametre olarak verin veya NEXT_PUBLIC_LOYALTY_TOKEN_ID environment variable\'ını ayarlayın.');
    }
    
    console.log('🔍 Loyalty Token ID:', finalLoyaltyTokenId);
    console.log('🔍 Owner Address:', address);
    
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
      memo: Memo.none(),
    })
      .addOperation(
        Operation.invokeContractFunction({
          contract: CONTRACT_ID,
          function: 'initialize',
          args: [
            nativeToScVal(address, { type: 'address' }),
            nativeToScVal(finalLoyaltyTokenId, { type: 'address' })
          ],
        })
      )
      .setTimeout(60)
      .build();
    
    console.log('🔍 Initialize transaction oluşturuldu, imzalanıyor...');
    const { signedTxXdr } = await signTransaction(tx.toXDR(), {
      networkPassphrase: Networks.TESTNET,
    });
    const signedTx = TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET);
    
    console.log('🔍 Initialize transaction gönderiliyor...');
    const txResponse = await server.sendTransaction(signedTx);
    console.log('🔍 Initialize transaction başarılı:', txResponse.hash);
    
    return { success: true, hash: txResponse.hash };
  } catch (error) {
    console.error('❌ initializeContract hatası:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Bilinmeyen hata' };
  }
} 