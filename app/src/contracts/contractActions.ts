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
  scValToNative,
} from '@stellar/stellar-sdk';
import { signTransaction, requestAccess } from '@stellar/freighter-api';
import { ContractError, contractErrorMessages, getContractErrorMessage } from './contractErrorCodes';

const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID!;
const SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';
const axios = require('axios');

export async function updateReservationStatusOnContract(reservationId: number, newStatus: 'Completed' | 'NoShow') {
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

    
    const simResult: any = await server.simulateTransaction(tx); // any :(
    console.log('Simülasyon sonucu:', simResult);

    // Eğer hata varsa, ona göre dönüş sağla
    if (typeof simResult.error === 'string') {
      const errorCode = extractErrorCode(simResult.error);
      if (errorCode !== undefined) {
        const errorMsg = contractErrorMessages[errorCode as ContractError] ?? 'Bilinmeyen kontrat hatası';
        return { success: false, error: errorMsg, code: errorCode };
      }
    }

    const assembledTx = rpc.assembleTransaction(tx, simResult);

    const xdr = assembledTx.build().toXDR();

    const { signedTxXdr } = await signTransaction(xdr, {
      networkPassphrase: Networks.TESTNET,
    });
    const signedTx = TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET);

    console.log("singedTx: ", signedTx);
    
    console.log('🔍 Transaction gönderiliyor...');

    const txResponse = await server.sendTransaction(signedTx);

    // pollTransaction içerisinde "Bad union switch: 4" hatası alıyoruz...
    // const anyone = await server.pollTransaction(txResponse.hash);
    let finalResult = await CustomPollTransaction(txResponse.hash);

    if (finalResult && finalResult.data.result.status === 'SUCCESS') {
      console.log('🔍 Transaction başarılı:', finalResult);
      return { success: true, hash: txResponse.hash };
    }else{
      console.error('İşlem zaman aşımına uğradı veya başarıyla tamamlanamadı.');
      return { success: false, hash: txResponse.hash };
    }

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

export async function CustomPollTransaction(hash: any) {
  // çok mega garip bir şekilde pollTransaction çalışmadığı için bu yöntemi tercih ettik artık......
  try {
    console.log("transaction ladger işleme kontrol çağrısı için 6 saniye bekleniyor...")
    await new Promise(r => setTimeout(r, 6000));
    const response = await axios.post('https://soroban-testnet.stellar.org', {
      "jsonrpc": "2.0",
      "id": 8675309,
      "method": "getTransaction",
      "params":
        {
          "hash": hash,
          "xdrFormat": "base64",
        },
    });
    return response;
  } catch (error) {
    console.error("Hata:", error);
  }
}

// İşletme kayıt işlemi
export async function registerBusinessOnContract(businessName: string, walletAddress: string) {
  console.log('🔍 registerBusinessOnContract başladı:', { businessName, walletAddress });
  
  try {
    const { address } = await requestAccess();
    console.log(address);
    if (!address || !StrKey.isValidEd25519PublicKey(address)) {
      throw new Error('Freighter cüzdan adresi alınamadı veya geçersiz.');
    }

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
          function: 'register_business',
          args: [
            nativeToScVal(businessName, { type: 'symbol' }),
            new Address(address).toScVal(),
          ],
        })
      )
      .setTimeout(60)
      .build();

      const simResult: any  = await server.simulateTransaction(tx); // geçici olarak any
      // typescript'i bypass etmek zorundayım çünkü dönüş değeri ve sdk uyumsuz.
      console.log('Simülasyon sonucu:', simResult);


        // Doğrudan simResult'un ana error alanını kontrol et
        if (simResult.error) {
          // "HostError: Error(Contract, #1002)" gibi bir stringden '1002' değerini ayıklama
          const regexMatch = /Error\(Contract, #(\d+)\)/.exec(simResult.error);
          
          if (regexMatch && regexMatch[1]) {
              const errorCode = parseInt(regexMatch[1], 10);
              const message = getContractErrorMessage(errorCode);
              console.error('Kontrat tarafından döndürülen hata:', message);
              return {
                success: false,
                registrationHash: message,
              };
          } else {
              // Bilinmeyen bir hata tipi ise
              throw new Error(`Bilinmeyen bir kontrat hatası oluştu: ${simResult.error}`);
          }
      }

      const assembledTx = rpc.assembleTransaction(tx, simResult);

      console.log('assembleTransaction:', assembledTx);

      const xdr = assembledTx.build().toXDR();

      // 🔐 İmzalama
      const { signedTxXdr } = await signTransaction(xdr, {
        networkPassphrase: Networks.TESTNET,
      });

      const signedTx = TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET);

      const sendResult = await server.sendTransaction(signedTx);

      console.log('İşlem başarılı:', sendResult);

      // pollTransaction içerisinde "Bad union switch: 4" hatası alıyoruz...
      // const finalResult = await server.pollTransaction(sendResult.hash, {
      //   attempts: 100,
      //   sleepStrategy: rpc.LinearSleepStrategy
      // });
      // let finalResult: { status: 'SUCCESS' | 'FAILED' | 'NOT_FOUND' | string };
      let finalResult = await CustomPollTransaction(sendResult.hash);

      // console.log("finalResult: ", finalResult);
      // console.log("finalResult.data.result: ", finalResult?.data?.result);


      // Zincir işlemi başarılı olduktan sonra veritabanına kaydet
      if (finalResult && finalResult.data.result.status === 'SUCCESS') {
        console.log('Zincir işlemi başarılı, veritabanına kaydedilecek.');
        return {
          success: true,
          registrationHash: sendResult.hash,
        };
      }else{
        console.error('İşlem zaman aşımına uğradı veya başarıyla tamamlanamadı.');
        return {
          success: false,
          registrationHash: sendResult.hash,
        };
      }
  } catch (error: any) {
    console.error('❌ registerBusinessOnContract hatası:', error);
    throw new Error(`Kontrat kayıt hatası: ${error instanceof Error ? error.message : String(error)}`);
  }

}

// İşletme bilgilerini kontrattan alma
// Yardımcı: error string'den hata kodunu yakala
function extractErrorCode(errorStr: string): number | null {
  const match = errorStr.match(/Error\(Contract,\s*#(\d+)\)/);
  return match ? parseInt(match[1], 10) : null;
}

export async function getBusinessFromContract(businessName: string) {
  console.log('🔍 getBusinessFromContract başladı:', { businessName });
  
  try {
    const { address } = await requestAccess();
    console.log('🔍 Cüzdan adresi alındı:', address);
    
    if (!address) {
      throw new Error('Cüzdan bağlantısı gerekli');
    }
    
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
          function: 'get_business',
          args: [nativeToScVal(businessName, { type: 'symbol' })],
        })
      )
      .setTimeout(60)
      .build();
    
    console.log('🔍 Transaction simüle ediliyor...');
    const simResult: any = await server.simulateTransaction(tx);
    console.log('Simülasyon sonucu:', simResult);
    
    // 1️⃣ Başarılı retval varsa
    if ('result' in simResult && simResult.result && 'retval' in simResult.result) {
      const contractResult = simResult.result.retval;
      if (typeof contractResult === 'object' && contractResult !== null) {
        const businessObj = scValToNative(contractResult);
        return {
          success: true,
          businessName,
          walletAddress: businessObj.wallet_address,
          isValid: true,
          contractData: businessObj,
        };
      }
    }

    // 2️⃣ Eğer hata varsa, simResult.error içinden kodu parse et
    if (typeof simResult.error === 'string') {
      const errorCode = extractErrorCode(simResult.error);
      if (errorCode  != undefined) {
        const errorMsg = contractErrorMessages[errorCode as ContractError] ?? 'Bilinmeyen kontrat hatası';
        return { success: false, error: errorMsg, code: errorCode };
      }
    }

    // 3️⃣ Fallback
    return {
      success: false,
      error: 'İşletme bilgileri doğru şekilde alınamadı',
    };
    
  } catch (error) {
    console.error('❌ getBusinessFromContract hatası:', error);
    throw new Error(
      `Kontrat bilgi alma hatası: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
