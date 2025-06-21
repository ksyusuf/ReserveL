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
  attendanceStatus: 'not_arrived' | 'arrived' | 'no_show';
  confirmationStatus: 'pending' | 'confirmed' | 'cancelled';
  loyaltyTokensSent: boolean;
  notes?: string;
  status: 'confirmed' | 'cancelled';
}

interface ReservationListProps {
  onReservationCreated?: () => void;
}

export default function ReservationList({ onReservationCreated }: ReservationListProps) {
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

  const confirmPendingReservation = async (reservationId: string) => {
    try {
      setError(null);
      const response = await fetch('/api/reservations/confirm-pending', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reservationId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Rezervasyon onaylanırken bir hata oluştu');
      }

      await fetchReservations();
    } catch (error) {
      console.error('Error confirming pending reservation:', error);
      setError('Rezervasyon onaylanırken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const cancelConfirmedReservation = async (reservationId: string) => {
    try {
      setError(null);
      const response = await fetch('/api/reservations/cancel-confirmed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reservationId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Rezervasyon iptal edilirken bir hata oluştu');
      }

      await fetchReservations();
    } catch (error) {
      console.error('Error cancelling confirmed reservation:', error);
      setError('Rezervasyon iptal edilirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const updateAttendanceStatus = async (
    reservationId: string,
    attendanceStatus: 'not_arrived' | 'arrived' | 'no_show'
  ) => {
    try {
      setError(null);
      const response = await fetch('/api/reservations/update-attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reservationId, attendanceStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gelme durumu güncellenirken bir hata oluştu');
      }

      await fetchReservations();
    } catch (error) {
      console.error('Error updating attendance status:', error);
      setError('Gelme durumu güncellenirken bir hata oluştu. Lütfen tekrar deneyin.');
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
                <h3 className="font-medium text-white">{reservation.customerName || 'Müşteri Adı'}</h3>
                <p className="text-sm text-gray-400">{reservation.customerPhone || 'Telefon'}</p>
                {reservation.notes && (
                  <p className="text-sm text-gray-300 mt-1 italic">"{reservation.notes}"</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-white">
                  {formatDate(reservation.date)} - {formatTime(reservation.time)}
                </p>
                <p className="text-sm text-gray-400">
                  {reservation.numberOfPeople || 0} kişi
                </p>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="space-x-2">
                {reservation.confirmationStatus === 'pending' && (
                  <>
                    <Button
                      size="sm"
                      variant={reservation.attendanceStatus === 'arrived' ? 'primary' : 'outline'}
                      className={reservation.attendanceStatus === 'arrived'
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'border-green-500 text-green-500 hover:bg-green-500/10'
                      }
                      onClick={() => updateAttendanceStatus(reservation.reservationId, 'arrived')}
                    >
                      Geldi
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-orange-500 text-orange-500 hover:bg-orange-500/10"
                      onClick={() => updateAttendanceStatus(reservation.reservationId, 'no_show')}
                    >
                      Gelmedi
                    </Button>
                    <Button
                      size="sm"
                      variant={reservation.attendanceStatus === 'not_arrived' ? 'primary' : 'outline'}
                      className={reservation.attendanceStatus === 'not_arrived'
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'border-red-500 text-red-500 hover:bg-red-500/10'
                      }
                      onClick={() => updateAttendanceStatus(reservation.reservationId, 'not_arrived')}
                    >
                      İptal Et
                    </Button>
                  </>
                )}
                {reservation.confirmationStatus === 'confirmed' && (
                  <>
                    <Button
                      size="sm"
                      variant={reservation.attendanceStatus === 'arrived' ? 'primary' : 'outline'}
                      className={reservation.attendanceStatus === 'arrived' 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'border-green-500 text-green-500 hover:bg-green-500/10'
                      }
                      onClick={() => updateAttendanceStatus(reservation.reservationId, 'arrived')}
                      disabled={reservation.attendanceStatus === 'arrived'}
                    >
                      Geldi
                    </Button>
                    <Button
                      size="sm"
                      variant={reservation.attendanceStatus === 'no_show' ? 'primary' : 'outline'}
                      className={reservation.attendanceStatus === 'no_show' 
                        ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                        : 'border-orange-500 text-orange-500 hover:bg-orange-500/10'
                      }
                      onClick={() => updateAttendanceStatus(reservation.reservationId, 'no_show')}
                      disabled={reservation.attendanceStatus === 'no_show'}
                    >
                      Gelmedi
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-600 text-red-600 hover:bg-red-600/20 hover:border-red-500 hover:text-red-500 bg-red-600/10"
                      onClick={() => cancelConfirmedReservation(reservation.reservationId)}
                    >
                      İptal Et
                    </Button>
                  </>
                )}
              </div>
              <div className="text-sm space-y-1">
                {/* Confirmation Status */}
                <span className={`inline-block px-2 py-1 rounded ${
                  reservation.confirmationStatus === 'confirmed' && reservation.status === 'cancelled'
                    ? 'bg-orange-500/20 text-orange-400'
                    : reservation.confirmationStatus === 'confirmed'
                    ? 'bg-green-500/20 text-green-400'
                    : reservation.confirmationStatus === 'cancelled'
                    ? 'bg-orange-500/20 text-orange-400'
                    : reservation.confirmationStatus === 'pending'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {reservation.confirmationStatus === 'confirmed' && reservation.status === 'cancelled'
                    ? 'Onaylı-İptal'
                    : reservation.confirmationStatus === 'confirmed'
                    ? 'Onaylandı'
                    : reservation.confirmationStatus === 'cancelled'
                    ? 'Gelmedi'
                    : reservation.confirmationStatus === 'pending'
                    ? 'Onay Bekliyor'
                    : 'Onay Bekliyor'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 