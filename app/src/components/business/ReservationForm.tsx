'use client';

import { useState } from 'react';
import {
  TransactionBuilder,
  BASE_FEE,
  Networks,
  Address,
  nativeToScVal,
  StrKey,
  Operation,
  Memo,
  rpc,
} from '@stellar/stellar-sdk';

import { signTransaction, getAddress } from '@stellar/freighter-api';
import { requestAccess } from '@stellar/freighter-api';
import { Transaction } from '@stellar/stellar-sdk';


interface ReservationFormData {
  customerName: string;
  customerPhone: string;
  date: string;
  time: string;
  notes: string;
  customerId: string;
  partySize: number;
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
  });
  const [loading, setLoading] = useState(false);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function getReservationTimestamp(date: string, time: string) {
    if (!date || !time) return 0;
    return Math.floor(new Date(`${date}T${time}:00Z`).getTime() / 1000);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setReservationId(null);

    console.log('submit tetiklendi'); // en başa koy

    try {
      const { address } = await requestAccess();
      console.log(address);
      if (!address || !StrKey.isValidEd25519PublicKey(address)) {
        throw new Error('Freighter cüzdan adresi alınamadı veya geçersiz.');
      }

      const reservation_time = getReservationTimestamp(formData.date, formData.time);
      if (!reservation_time) throw new Error('Tarih ve saat geçersiz!');

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
            function: 'create_reservation',
            args: [
              new Address(address).toScVal(),               // business_id
              nativeToScVal(reservation_time, { type: 'u64' }),
              nativeToScVal(formData.partySize, { type: 'u32' }),
              nativeToScVal("10000000", { type: 'i128' }),  // 1 USD
              new Address(address).toScVal(),               // payment_asset = aynı adres
            ],
          })
        )
        .setTimeout(60)
        .build();

        const simResult = await server.simulateTransaction(tx);
        console.log('Simülasyon sonucu:', simResult);

        const assembledTx = rpc.assembleTransaction(tx, simResult);

        const xdr = assembledTx.build().toXDR();

        // 🔐 İmzalama — BURAYA EKLE
        const { signedTxXdr } = await signTransaction(xdr, {
          networkPassphrase: Networks.TESTNET,
        });

        const signedTx = TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET);

        const sendResult = await server.sendTransaction(signedTx);

        console.log('İşlem başarılı:', sendResult);
        setReservationId(sendResult.hash);
        


      //   // 🔧 Simülasyon auth'ları üretir:
      //   const sim = await server.simulateTransaction(tx);
      //   tx.setSorobanData(sim); // 🔐 Auth'lar buraya eklenir

      //   // 🖊️ İmzalama
      //   const { signedTxXdr } = await signTransaction(tx.toXDR(), {
      //     networkPassphrase: Networks.TESTNET,
      //   });
      //   const signedTx = TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET);

      //   // 🚀 Gönderim
      //   const result = await server.sendTransaction(signedTx);

      //   console.log("XDR:", tx.toXDR());

      //   // Freighter ile imzalama
      //   const { signedTxXdr }  = await signTransaction(tx.toXDR(), {
      //     networkPassphrase: Networks.TESTNET,
      //   });
      //   if (!signedTxXdr) {
      //     throw new Error("İmzalanmış işlem alınamadı.");
      //   }

      //   // XDR'den Transaction nesnesine çevir
      // const signedTx = TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET);

      // // İşlemi submit et
      // const result = await server.sendTransaction(signedTx);

      // if (!result.hash) {
      //   throw new Error('İşlem ağına gönderilemedi.');
      // }

      // console.log('İşlem başarılı:', result);
      // setReservationId(result.hash);


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
          <p className="text-white mt-2">İşlem Hash:</p>
          <p className="text-white break-all mt-1">{reservationId}</p>
        </div>
      )}
    </form>
  );
}
