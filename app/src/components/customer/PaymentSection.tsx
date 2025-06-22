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
  reservationStatus: {
    confirmationStatus: 'pending' | 'confirmed' | 'cancelled';
    attendanceStatus: 'not_arrived' | 'arrived' | 'no_show';
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  };
  onSuccess: () => void;    
}

export default function PaymentSection({ 
  reservationId, 
  businessId, 
  reservationStatus, 
  onSuccess 
}: PaymentSectionProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rezervasyon zaten onaylanmışsa işlemi engelle
  if (reservationStatus.confirmationStatus === 'confirmed') {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold text-green-900 mb-2">Rezervasyon Zaten Onaylandı</h2>
          <p className="text-green-700">
            Bu rezervasyon zaten onaylanmış ve ödeme tamamlanmıştır. 
            Herhangi bir işlem yapmanıza gerek yoktur.
          </p>
        </div>
      </div>
    );
  }

  // Rezervasyon iptal edilmişse bilgilendir
  if (reservationStatus.confirmationStatus === 'cancelled') {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold text-red-900 mb-2">Rezervasyon İptal Edildi</h2>
          <p className="text-red-700">
            Bu rezervasyon iptal edilmiştir. Onaylama işlemi yapılamaz.
          </p>
        </div>
      </div>
    );
  }

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

      // // 1. ÖDEME TRANSAKSIYONU
      // const paymentTx = new TransactionBuilder(account, {
      //   fee: BASE_FEE,
      //   networkPassphrase: Networks.TESTNET,
      //   memo: Memo.none(),
      // })
      //   .addOperation(
      //     Operation.payment({
      //       destination: businessId,
      //       asset: Asset.native(),
      //       amount: "1000", // 1 USD eşdeğeri gibi.
      //     })
      //   )
      //   .setTimeout(60)
      //   .build();

      // const { signedTxXdr: signedPaymentXdr } = await signTransaction(paymentTx.toXDR(), {
      //   networkPassphrase: Networks.TESTNET,
      // });
      // const signedPaymentTx = TransactionBuilder.fromXDR(signedPaymentXdr, Networks.TESTNET);

      // const paymentResult = await server.sendTransaction(signedPaymentTx);
      // console.log('DEBUG: paymentResult:', paymentResult);

      // 2. KONTRAT ÇAĞRISI TRANSAKSIYONU
      const contractTx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
        memo: Memo.none(),
      })
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

      console.log('DEBUG: contractTx built:', contractTx);

      // Simülasyon
      const simResult = await server.simulateTransaction(contractTx);
      console.log('DEBUG: simResult:', simResult);

      const assembledTx = rpc.assembleTransaction(contractTx, simResult);
      const xdr = assembledTx.build().toXDR();
      console.log('DEBUG: xdr:', xdr);

      // İmzalama
      const { signedTxXdr } = await signTransaction(xdr, {
        networkPassphrase: Networks.TESTNET,
      });
      const signedTx = TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET);
      console.log('DEBUG: signedTx:', signedTx);

      // Transaction gönder
      const sendResult = await server.sendTransaction(signedTx);
      console.log('DEBUG: sendResult:', sendResult);

      const dbUpdateResponse = await fetch('/api/reservations/confirm-reservation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reservationId: reservationId,
          customerAddress: address,
          transactionHash: sendResult.hash
        }),
      });

      console.log('DEBUG: API yanıt durumu:', dbUpdateResponse.status);
      console.log('DEBUG: API yanıt headers:', Object.fromEntries(dbUpdateResponse.headers.entries()));

      if (!dbUpdateResponse.ok) {
        const errorData = await dbUpdateResponse.json();
        console.error('DEBUG: API hata detayı:', errorData);
        throw new Error(`Veritabanı güncelleme hatası: ${errorData.error}`);
      }

      const dbUpdateResult = await dbUpdateResponse.json();
      console.log('DEBUG: Veritabanı güncelleme sonucu:', dbUpdateResult);

      onSuccess();
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
          Bu işlem rezervasyonunuzu onaylayacaktır.
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