'use client';

import { useState } from 'react';
import {
  BASE_FEE,
  Networks,
  TransactionBuilder,
  Memo,
  xdr,
  StrKey,
  Operation,
  nativeToScVal,
} from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';
import { Server } from '@stellar/stellar-sdk/rpc';

interface ReservationFormData {
  customerName: string;
  customerPhone: string;
  date: string;
  time: string;
  notes: string;
  customerId: string;
  partySize: number;
  paymentAmount: number;
  paymentAsset: string;
}

const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID!;
const SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';

export default function ReservationForm() {
  const [formData, setFormData] = useState<ReservationFormData>({
    customerName: '',
    customerPhone: '',
    date: '',
    time: '',
    notes: '',
    customerId: '',
    partySize: 1,
    paymentAmount: 0,
    paymentAsset: '',
  });
  const [loading, setLoading] = useState(false);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string>('');

  function getReservationTimestamp(date: string, time: string) {
    if (!date || !time) return 0;
    return Math.floor(new Date(`${date}T${time}:00Z`).getTime() / 1000);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setReservationId(null);

    try {
      if (!businessId || !StrKey.isValidEd25519PublicKey(businessId)) {
        throw new Error('Geçerli bir işletme cüzdan adresi giriniz!');
      }

      if (!formData.paymentAsset || !StrKey.isValidEd25519PublicKey(formData.paymentAsset)) {
        throw new Error('Geçerli bir ödeme varlığı adresi (public key) giriniz!');
      }

      const reservation_time = getReservationTimestamp(formData.date, formData.time);
      if (!reservation_time) throw new Error('Tarih ve saat geçersiz!');

      const userPublicKey = businessId;
      const server = new Server('https://soroban-testnet.stellar.org');
      const account = await server.getAccount(userPublicKey);

      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
        memo: Memo.none(),
      })
        .addOperation(
          Operation.invokeContractFunction({
            contract: CONTRACT_ID,
            function: 'create_reservation',
            args: [
              nativeToScVal(businessId, { type: 'address' }),
              nativeToScVal(reservation_time, { type: 'u64' }),
              nativeToScVal(formData.partySize, { type: 'u32' }),
              nativeToScVal(formData.paymentAmount, { type: 'i128' }),
              nativeToScVal(formData.paymentAsset, { type: 'address' }),
            ],
          })
        )
        .setTimeout(60)
        .build();

      const signedXDR = await signTransaction(tx.toXDR(), { networkPassphrase: Networks.TESTNET });

      const txPostRes = await fetch(`${SOROBAN_RPC_URL}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction: signedXDR }),
      });

      const sendRes = await txPostRes.json();
      if (sendRes.status !== 'PENDING' && sendRes.status !== 'SUCCESS') {
        throw new Error(`İşlem gönderilemedi: ${sendRes.errorResult || sendRes.status}`);
      }

      let txResult = null;
      for (let i = 0; i < 10; i++) {
        await new Promise((res) => setTimeout(res, 2000));
        const txStatusRes = await fetch(`${SOROBAN_RPC_URL}/transaction/${sendRes.hash}`);
        const txStatus = await txStatusRes.json();
        if (txStatus.status === 'SUCCESS') {
          txResult = txStatus;
          break;
        } else if (txStatus.status === 'FAILED') {
          throw new Error('İşlem başarısız.');
        }
      }

      if (!txResult) throw new Error('İşlem zaman aşımına uğradı.');
      setReservationId(sendRes.hash);
    } catch (err: any) {
      setError(err.message || 'Bilinmeyen hata!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-900 text-white p-4 rounded-md">
          <p>{error}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300">Müşteri Adı</label>
        <input
          type="text"
          value={formData.customerName}
          onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
          className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300">Müşteri Telefonu</label>
        <input
          type="tel"
          value={formData.customerPhone}
          onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
          className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300">Tarih</label>
        <input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300">Saat</label>
        <input
          type="time"
          value={formData.time}
          onChange={(e) => setFormData({ ...formData, time: e.target.value })}
          className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300">Kişi Sayısı</label>
        <input
          type="number"
          min={1}
          value={formData.partySize}
          onChange={(e) => setFormData({ ...formData, partySize: Number(e.target.value) })}
          className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Rezervasyon Oluşturuluyor...' : 'Rezervasyon Oluştur'}
      </button>

      {reservationId && (
        <div className="mt-4 p-4 bg-green-900 rounded-md">
          <p className="text-white font-medium">Rezervasyon başarıyla oluşturuldu!</p>
          <p className="text-white mt-2">Rezervasyon ID:</p>
          <p className="text-white break-all mt-1">{reservationId}</p>
        </div>
      )}
    </form>
  );
}
