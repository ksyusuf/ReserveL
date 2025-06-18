'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmationDetails from '@/components/customer/ConfirmationDetails';
import PaymentSection from '@/components/customer/PaymentSection';
import Button from '@/components/ui/Button';

export default function ConfirmationPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [reservation, setReservation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReservation = async () => {
      try {
        const response = await fetch(`/api/reservations/confirm/${params.token}`);
        if (!response.ok) {
          throw new Error('Rezervasyon bulunamadı');
        }
        const data = await response.json();
        setReservation(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchReservation();
  }, [params.token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Rezervasyon bilgileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Hata</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => router.push('/')}>Ana Sayfaya Dön</Button>
        </div>
      </div>
    );
  }

  if (!reservation) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Rezervasyon Onayı</h1>
          
          <ConfirmationDetails reservation={reservation} />
          
          <div className="mt-8 border-t border-gray-200 pt-6">
            <PaymentSection 
              reservationId={reservation.reservationId}
              onSuccess={() => {
                // Başarılı ödeme sonrası yönlendirme
                router.push(`/confirm/${params.token}/success`);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 