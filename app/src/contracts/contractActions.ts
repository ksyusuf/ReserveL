import {
  rpc,
  Networks,
  nativeToScVal,
  Operation,
  TransactionBuilder,
  BASE_FEE,
  Memo,
  Address,
  StrKey,
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

    console.log('tx.toxdr ', tx.toXDR());

    
    const simResult = await server.simulateTransaction(tx); // geçici olarak any
    console.log('Simülasyon sonucu:', simResult);

    

    const assembledTx = rpc.assembleTransaction(tx, simResult);

    const xdr = assembledTx.build().toXDR();

    const { signedTxXdr } = await signTransaction(xdr, {
      networkPassphrase: Networks.TESTNET,
    });
    const signedTx = TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET);

    console.log("singedTx: ", signedTx);
    
    console.log('🔍 Transaction gönderiliyor...');

    const txResponse = await server.sendTransaction(signedTx);

    const anyone = await server.pollTransaction(txResponse.hash);

    console.log('🔍 Transaction başarılı:', anyone);
    
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
  console.log('🔍 CONTRACT_ID:', CONTRACT_ID);
  
  try {
    const { address } = await requestAccess();
    console.log('🔍 Cüzdan adresi alındı:', address);
    if (!address) throw new Error('Cüzdan bağlantısı gerekli');
    
    const server = new rpc.Server(SOROBAN_RPC_URL);
    const account = await server.getAccount(address);
    
    let finalLoyaltyTokenId = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
    
    console.log('🔍 Loyalty Token ID:', finalLoyaltyTokenId, 'Uzunluk:', finalLoyaltyTokenId.length);
    if (!finalLoyaltyTokenId.startsWith('C') || finalLoyaltyTokenId.length !== 56) {
      const errMsg = `Geçersiz Contract ID: ${finalLoyaltyTokenId} (Uzunluk: ${finalLoyaltyTokenId.length})`;
      console.error(errMsg);
      return { success: false, error: errMsg };
    }
    const contractIdBytes = StrKey.decodeContract(finalLoyaltyTokenId.trim());
    
    console.log('🔍 Owner Address (wallet_id):', address);
    console.log('🔍 Contract ID:', CONTRACT_ID);
    
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
            nativeToScVal(address, { type: 'address' }), // owner
            Address.contract(contractIdBytes).toScVal() // loyalty_token_id
          ],
        })
      )
      .setTimeout(60)
      .build();
    
    console.log('🔍 Initialize transaction oluşturuldu, simülasyon yapılıyor...');
    
    // Simülasyon yap
    const simResult = await server.simulateTransaction(tx);
    console.log('Simülasyon sonucu:', simResult);
    
    // Transaction'ı assemble et
    const assembledTx = rpc.assembleTransaction(tx, simResult);
    const xdr = assembledTx.build().toXDR();
    
    console.log('🔍 Initialize transaction imzalanıyor...');
    const { signedTxXdr } = await signTransaction(xdr, {
      networkPassphrase: Networks.TESTNET,
    });
    const signedTx = TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET);
    
    console.log('🔍 Initialize transaction gönderiliyor...');
    const txResponse = await server.sendTransaction(signedTx);
    
    // Transaction'ın tamamlanmasını bekle
    const result = await server.pollTransaction(txResponse.hash);
    console.log('🔍 Initialize transaction başarılı:', result);
    
    return { success: true, hash: txResponse.hash };
  } catch (error) {
    console.error('initializeContract hatası:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Bilinmeyen hata' };
  }
} 