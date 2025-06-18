'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getReservation, confirmReservation } from '@/lib/soroban';

interface ReservationDetails {
  customerName: string;
  customerPhone: string;
  date: string;
  time: string;
  notes: string;
  status: string;
  reservationId: string;
  customerId: string;
}

export default function ConfirmReservation() {
  const { token } = useParams();
  const [details, setDetails] = useState<ReservationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    async function loadReservation() {
      try {
        // Token ile reservation detaylarını API'den çek
        const res = await fetch(`/api/reservations/confirm/${token}`);
        if (!res.ok) {
          setError('Rezervasyon detayları alınamadı');
          setLoading(false);
          return;
        }
        const data = await res.json();
        // reservationId ve customerId'yi de al
        const details: ReservationDetails = {
          customerName: String(data.customerName || ''),
          customerPhone: String(data.customerPhone || ''),
          date: String(data.date || ''),
          time: String(data.time || ''),
          notes: String(data.notes || ''),
          status: String(data.confirmationStatus || ''),
          reservationId: String(data.reservationId || ''),
          customerId: String(data.customerId || ''),
        };
        setDetails(details);
      } catch (err) {
        setError('Rezervasyon detayları yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    }
    loadReservation();
  }, [token]);

  const handleConfirm = async () => {
    if (!details) return;
    setConfirming(true);
    try {
      // reservationId number olmalı
      const reservationIdNum = Number(details.reservationId);
      const result = await confirmReservation(reservationIdNum, details.customerId);
      if (result.success) {
        window.location.href = '/confirm/success';
      } else {
        setError('Rezervasyon onaylanamadı');
      }
    } catch (err) {
      setError('Rezervasyon onaylanırken bir hata oluştu');
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Yükleniyor...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Rezervasyon bulunamadı</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-gray-800 rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-white mb-6">Rezervasyon Onayı</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300">Müşteri Adı</label>
            <p className="mt-1 text-white">{details.customerName}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300">Telefon</label>
            <p className="mt-1 text-white">{details.customerPhone}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300">Tarih</label>
            <p className="mt-1 text-white">{details.date}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300">Saat</label>
            <p className="mt-1 text-white">{details.time}</p>
          </div>

          {details.notes && (
            <div>
              <label className="block text-sm font-medium text-gray-300">Notlar</label>
              <p className="mt-1 text-white">{details.notes}</p>
            </div>
          )}

          <div className="pt-4">
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {confirming ? 'Onaylanıyor...' : '1 USDC ile Onayla'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 