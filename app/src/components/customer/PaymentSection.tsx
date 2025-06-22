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
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="bg-green-50 border border-green-400 shadow-sm p-6 rounded-xl max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-green-900 mb-2">Rezervasyon Onaylandı</h2>
          <p className="text-green-800 text-base">
            Bu rezervasyon zaten <span className="font-semibold">onaylanmış</span> ve ödeme tamamlanmıştır.<br/>
            Herhangi bir işlem yapmanıza gerek yoktur.
          </p>
        </div>
      </div>
    );
  }

  // Rezervasyon iptal edilmişse bilgilendir
  if (reservationStatus.confirmationStatus === 'cancelled') {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="bg-red-50 border border-red-400 shadow-sm p-6 rounded-xl max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-red-900 mb-2">Rezervasyon İptal Edildi</h2>
          <p className="text-red-800 text-base">
            Bu rezervasyon <span className="font-semibold">iptal edilmiştir</span>. Onaylama işlemi yapılamaz.
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
    <div className="flex justify-center items-center min-h-[320px]">
      <div className="bg-gray-800 rounded-xl p-6 shadow-lg max-w-md w-full flex flex-col gap-5">
        <h2 className="text-2xl font-bold text-white mb-1 text-center">Rezervasyon Onayı</h2>
        <p className="text-gray-200 text-base mb-2 text-center">
          Rezervasyonunuzu onaylamak için cüzdanınızla giriş yapın ve <span className="font-semibold text-white">onayla</span> butonuna tıklayın.<br/>
          <span className="text-white font-medium">Bu işlem rezervasyonunuzu onaylayacak ve ödeme işlemini başlatacaktır.</span>
        </p>
        <ul className="list-disc pl-5 text-gray-300 text-sm mb-2 mx-auto text-left max-w-xs">
          <li>Cüzdanınızda yeterli bakiye olduğundan emin olun.</li>
          <li>İşlem sırasında cüzdanınızdan onay vermeniz istenecektir.</li>
        </ul>
        {error && (
          <div className="bg-red-900 border border-red-500 text-white font-semibold p-4 rounded-md shadow flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}
        <Button
          onClick={handleConfirm}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-md text-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'İşlem Yapılıyor...' : 'Rezervasyonu Onayla'}
        </Button>
      </div>
    </div>
  );
} 