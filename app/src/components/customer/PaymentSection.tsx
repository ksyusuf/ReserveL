'use client';

import { useState } from 'react';
import {
  TransactionBuilder,
  BASE_FEE,
  Networks,
  Address,
  nativeToScVal,
  Operation,
  Memo,
  rpc,
  Asset,
} from '@stellar/stellar-sdk';
import { signTransaction, requestAccess } from '@stellar/freighter-api';
import Button from '../ui/Button';

const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID!;
const SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';

interface PaymentSectionProps {
  reservationId: string;
  businessId: string;
  onSuccess: () => void;    
}

export default function PaymentSection({ reservationId, businessId, onSuccess }: PaymentSectionProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Cüzdan adresini al
      const { address } = await requestAccess();
      if (!address) throw new Error('Cüzdan adresi alınamadı!');

      // reservationId'nin geçerli olduğundan emin ol
      console.log('DEBUG: reservationId:', reservationId, 'idNum:', reservationId);

      // 2. Soroban hesabını al
      const server = new rpc.Server(SOROBAN_RPC_URL);
      const account = await server.getAccount(address);
      console.log('DEBUG: account:', account);

      // 3. Transaction oluştur
      console.log('DEBUG: nativeToScVal input:', reservationId);
      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
        memo: Memo.none(),
        })
          // XLM transferi (native asset)
          .addOperation(
            Operation.payment({
              destination: businessId, // rezervasyon yapan işletme hesabı
              asset: Asset.native(),
              amount: "1.0000000", // 1 XLM (stroop değil!)
            })
            // aynı transaction içerisinde rezervasyon için ödeme yapıyoruz,
            // zincir tarafında da takasın gerçekleşmiş gibi kayıt ediyoruz.
          )
          // Kontrat çağrısı
        .addOperation(
          Operation.invokeContractFunction({
            contract: CONTRACT_ID,
            function: 'confirm_reservation',
            args: [
              nativeToScVal(parseInt(reservationId), { type: 'u64' }),
              new Address(address).toScVal(),
            ],
          })
        )
        .setTimeout(60)
        .build();
      console.log('DEBUG: tx built:', tx);

      // 4. Simülasyon
      const simResult = await server.simulateTransaction(tx);
      console.log('DEBUG: simResult:', simResult);
      const assembledTx = rpc.assembleTransaction(tx, simResult);
      const xdr = assembledTx.build().toXDR();
      console.log('DEBUG: xdr:', xdr);

      // 5. İmzalama
      const { signedTxXdr } = await signTransaction(xdr, {
        networkPassphrase: Networks.TESTNET,
      });
      const signedTx = TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET);
      console.log('DEBUG: signedTx:', signedTx);

      // 6. Transaction gönder
      const sendResult = await server.sendTransaction(signedTx);
      console.log('DEBUG: sendResult:', sendResult);

      onSuccess();
      alert('Rezervasyon başarıyla onaylandı! İşlem hash: ' + sendResult.hash);
    } catch (err: any) {
      console.error('DEBUG: Hata oluştu:', err);
      setError(err.message || 'Onaylama sırasında bir hata oluştu!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Rezervasyon Onayı</h2>
        <p className="text-gray-600">
          Rezervasyonunuzu onaylamak için cüzdanınızla giriş yapın ve onaylayın.
          Bu işlem otomatik olarak ödeme transferini de gerçekleştirecektir.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      )}

      <Button
        onClick={handleConfirm}
        disabled={loading}
        className="w-full"
      >
        {loading ? 'İşlem Yapılıyor...' : 'Rezervasyonu Onayla'}
      </Button>
    </div>
  );
} 