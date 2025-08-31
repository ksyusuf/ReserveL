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
        <div className="bg-green-500/10 border border-green-500/30 text-green-300 px-6 py-6 rounded-xl backdrop-blur-sm max-w-md w-full">
          <div className="flex items-start">
            <svg className="w-6 h-6 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h2 className="text-xl font-semibold mb-2">Rezervasyon Onaylandı</h2>
              <p className="text-sm text-green-300/80">
                Bu rezervasyon zaten <span className="font-semibold">onaylanmış</span> ve ödeme tamamlanmıştır.<br/>
                Herhangi bir işlem yapmanıza gerek yoktur.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Rezervasyon iptal edilmişse bilgilendir
  if (reservationStatus.confirmationStatus === 'cancelled') {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-6 py-6 rounded-xl backdrop-blur-sm max-w-md w-full">
          <div className="flex items-start">
            <svg className="w-6 h-6 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h2 className="text-xl font-semibold mb-2">Rezervasyon İptal Edildi</h2>
              <p className="text-sm text-red-300/80">
                Bu rezervasyon <span className="font-semibold">iptal edilmiştir</span>. Onaylama işlemi yapılamaz.
              </p>
            </div>
          </div>
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
    <div className="space-y-6">
      {/* Info Card */}
      <div className="bg-blue-500/10 border border-blue-500/20 text-blue-200 px-4 sm:px-6 py-4 rounded-xl backdrop-blur-sm">
        <div className="flex items-start">
          <svg className="w-6 h-6 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-medium mb-2">Rezervasyon Onayı</p>
            <p className="text-sm text-blue-300/80">
              Rezervasyonunuzu onaylamak için cüzdanınızla giriş yapın ve <span className="font-semibold">onayla</span> butonuna tıklayın.
              Bu işlem rezervasyonunuzu onaylayacak ve ödeme işlemini başlatacaktır.
            </p>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Önemli Bilgiler</h3>
        <ul className="space-y-3">
          <li className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
            <span className="text-sm text-gray-300">Cüzdanınızda yeterli bakiye olduğundan emin olun.</span>
          </li>
          <li className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
            <span className="text-sm text-gray-300">İşlem sırasında cüzdanınızdan onay vermeniz istenecektir.</span>
          </li>
          <li className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
            <span className="text-sm text-gray-300">Onaylama işlemi blockchain'e kaydedilecek ve geri alınamaz.</span>
          </li>
        </ul>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 sm:px-6 py-4 rounded-xl backdrop-blur-sm">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleConfirm}
        disabled={loading}
        className="w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-xl shadow-lg text-lg font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
      >
        {loading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            İşlem Yapılıyor...
          </>
        ) : (
          <>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Rezervasyonu Onayla
          </>
        )}
      </button>
    </div>
  );
} 