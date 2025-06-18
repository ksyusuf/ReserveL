'use client';

import { useState, useEffect } from 'react';
import Button from '../ui/Button';
import { formatDate, formatTime } from '@/lib/utils';

interface Reservation {
  reservationId: string;
  customerName: string;
  customerPhone: string;
  date: string;
  time: string;
  numberOfPeople: number;
  paymentStatus: 'pending' | 'completed' | 'failed';
  confirmationStatus: 'pending' | 'confirmed' | 'cancelled';
  loyaltyTokensSent: boolean;
}

export default function ReservationList() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchReservations = async () => {
    try {
      setError(null);
      console.log('Fetching reservations...'); // Debug için
      
      const response = await fetch('/api/reservations');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Rezervasyonlar yüklenirken bir hata oluştu');
      }
      
      console.log('Fetched reservations:', data); // Debug için
      setReservations(data);
      setRetryCount(0); // Başarılı olursa retry sayacını sıfırla
    } catch (error) {
      console.error('Error fetching reservations:', error);
      setError(error instanceof Error ? error.message : 'Rezervasyonlar yüklenirken bir hata oluştu');
      
      // 3 kezden az deneme yapıldıysa otomatik yeniden dene
      if (retryCount < 3) {
        setRetryCount(prev => prev + 1);
        setTimeout(fetchReservations, 2000); // 2 saniye sonra tekrar dene
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const updateReservationStatus = async (
    reservationId: string,
    status: 'confirmed' | 'cancelled'
  ) => {
    try {
      setError(null);
      const response = await fetch(`/api/reservations?id=${reservationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ confirmationStatus: status }),
      });

      if (!response.ok) {
        throw new Error('Rezervasyon güncellenirken bir hata oluştu');
      }

      await fetchReservations();
    } catch (error) {
      console.error('Error updating reservation:', error);
      setError('Rezervasyon güncellenirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-white">Yükleniyor...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg">
        <p className="text-red-500">{error}</p>
        <Button onClick={fetchReservations} className="mt-2">
          Yeniden Dene
        </Button>
      </div>
    );
  }

  if (reservations.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400">
        Henüz rezervasyon bulunmuyor.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {reservations.map((reservation) => (
          <div
            key={reservation.reservationId}
            className="p-4 bg-background-light border border-gray-700 rounded-lg space-y-2"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-white">{reservation.customerName}</h3>
                <p className="text-sm text-gray-400">{reservation.customerPhone}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-white">
                  {formatDate(new Date(reservation.date))} - {formatTime(reservation.time)}
                </p>
                <p className="text-sm text-gray-400">
                  {reservation.numberOfPeople} kişi
                </p>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="space-x-2">
                <Button
                  size="sm"
                  variant={reservation.confirmationStatus === 'confirmed' ? 'primary' : 'outline'}
                  onClick={() => updateReservationStatus(reservation.reservationId, 'confirmed')}
                  disabled={reservation.confirmationStatus === 'confirmed'}
                >
                  Onayla
                </Button>
                <Button
                  size="sm"
                  variant={reservation.confirmationStatus === 'cancelled' ? 'primary' : 'outline'}
                  onClick={() => updateReservationStatus(reservation.reservationId, 'cancelled')}
                  disabled={reservation.confirmationStatus === 'cancelled'}
                >
                  İptal Et
                </Button>
              </div>
              <div className="text-sm">
                <span className={`inline-block px-2 py-1 rounded ${
                  reservation.paymentStatus === 'completed'
                    ? 'bg-green-500/20 text-green-400'
                    : reservation.paymentStatus === 'failed'
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {reservation.paymentStatus === 'completed'
                    ? 'Ödeme Tamamlandı'
                    : reservation.paymentStatus === 'failed'
                    ? 'Ödeme Başarısız'
                    : 'Ödeme Bekliyor'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 