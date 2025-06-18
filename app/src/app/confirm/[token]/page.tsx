'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getReservationDetails, confirmReservation } from '@/lib/stellar';

interface ReservationDetails {
  customerName: string;
  customerPhone: string;
  date: string;
  time: string;
  notes: string;
  status: string;
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
        const result = await getReservationDetails(token as string);
        if (result.success && result.details) {
          const details: ReservationDetails = {
            customerName: String(result.details.customerName || ''),
            customerPhone: String(result.details.customerPhone || ''),
            date: String(result.details.date || ''),
            time: String(result.details.time || ''),
            notes: String(result.details.notes || ''),
            status: String(result.details.status || '')
          };
          setDetails(details);
        } else {
          setError('Rezervasyon detayları alınamadı');
        }
      } catch (err) {
        setError('Rezervasyon detayları yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    }

    loadReservation();
  }, [token]);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const result = await confirmReservation(token as string);
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