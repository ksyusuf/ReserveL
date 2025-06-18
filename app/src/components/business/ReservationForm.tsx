'use client';

import { useState, useEffect } from 'react';
import { createReservation } from '@/lib/soroban';
import { getAddress, isConnected as freighterIsConnected } from '@stellar/freighter-api';

interface ReservationFormData {
  customerName: string;
  customerPhone: string;
  date: string;
  time: string;
  notes: string;
  businessId: string;
  customerId: string;
  partySize: number;
  paymentAmount: number;
  paymentAsset: string;
}

export default function ReservationForm() {
  const [formData, setFormData] = useState<ReservationFormData>({
    customerName: '',
    customerPhone: '',
    date: '',
    time: '',
    notes: '',
    businessId: '',
    customerId: '',
    partySize: 1,
    paymentAmount: 0,
    paymentAsset: ''
  });
  const [loading, setLoading] = useState(false);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Freighter bağlantısı @stellar/freighter-api ile doğrudan adres alınıyor
      let businessId = '';
      try {
        const { address } = await getAddress();
        businessId = address;
      } catch (err) {
        console.error('[Freighter] getAddress çağrısında hata:', err);
        throw new Error('Freighter cüzdanına bağlanılamadı veya adres alınamadı. Lütfen Freighter eklentisini açın ve bağlanın.');
      }
      if (!businessId) {
        throw new Error('Freighter cüzdan adresi alınamadı.');
      }

      // Varsayılan değerleri ayarla
      const defaultCustomerId = '';
      const defaultPaymentAsset = 'GDRWXGQZJ3F3V5WJ6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z';

      // Rezervasyon zamanını Unix timestamp'e çevir
      const reservationTime = new Date(`${formData.date}T${formData.time}`).getTime();
      
      // First, save to database
      const dbResponse = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerName: formData.customerName,
          customerPhone: formData.customerPhone,
          date: formData.date,
          time: formData.time,
          numberOfPeople: formData.partySize,
          businessId: businessId,
          customerId: defaultCustomerId,
          notes: formData.notes || '',
          paymentAmount: formData.paymentAmount,
          paymentAsset: defaultPaymentAsset
        }),
      });

      if (!dbResponse.ok) {
        const errorData = await dbResponse.json();
        throw new Error(errorData.error || 'Veritabanına kayıt sırasında bir hata oluştu');
      }

      const dbResult = await dbResponse.json();
      console.log('Veritabanı kaydı başarılı:', dbResult);

      // Then, save to smart contract
      const contractResult = await createReservation({
        businessId: businessId,
        reservationTime,
        partySize: formData.partySize,
        paymentAmount: formData.paymentAmount * 10000000, // 7 decimal places for Stellar
        paymentAsset: defaultPaymentAsset
      });

      console.log('Kontrat sonucu:', contractResult);

      if (!contractResult.success) {
        throw new Error(contractResult.error || 'Akıllı kontrata kayıt sırasında bir hata oluştu');
      }

      // Update the reservation in database with contract ID
      await fetch(`/api/reservations?id=${dbResult.reservationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractReservationId: contractResult.reservationId,
        }),
      });

      console.log('Rezervasyon güncellendi, kontrat ID:', contractResult.reservationId);
      setReservationId(dbResult.reservationId);
      setFormData({
        customerName: '',
        customerPhone: '',
        date: '',
        time: '',
        notes: '',
        businessId: '',
        customerId: '',
        partySize: 1,
        paymentAmount: 0,
        paymentAsset: ''
      });
    } catch (error) {
      console.error('[Freighter] Rezervasyon oluşturma hatası:', error);
      console.error('Rezervasyon oluşturma hatası:', error);
      setError(error instanceof Error ? error.message : 'Rezervasyon oluşturulurken bir hata oluştu');
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
        <label htmlFor="customerName" className="block text-sm font-medium text-gray-300">
          Müşteri Adı
        </label>
        <input
          type="text"
          id="customerName"
          value={formData.customerName}
          onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
          className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white"
          required
        />
      </div>

      <div>
        <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-300">
          Müşteri Telefonu
        </label>
        <input
          type="tel"
          id="customerPhone"
          value={formData.customerPhone}
          onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
          className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white"
          required
        />
      </div>

      <div>
        <label htmlFor="date" className="block text-sm font-medium text-gray-300">
          Tarih
        </label>
        <input
          type="date"
          id="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white"
          required
        />
      </div>

      <div>
        <label htmlFor="time" className="block text-sm font-medium text-gray-300">
          Saat
        </label>
        <input
          type="time"
          id="time"
          value={formData.time}
          onChange={(e) => setFormData({ ...formData, time: e.target.value })}
          className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white"
          required
        />
      </div>

      <div>
        <label htmlFor="partySize" className="block text-sm font-medium text-gray-300">
          Kişi Sayısı
        </label>
        <input
          type="number"
          id="partySize"
          min={1}
          value={formData.partySize}
          onChange={(e) => setFormData({ ...formData, partySize: Number(e.target.value) })}
          className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white"
          required
        />
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-300">
          Notlar
        </label>
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white"
          rows={3}
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