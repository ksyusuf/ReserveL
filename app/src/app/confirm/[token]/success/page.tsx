'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';

export default function SuccessPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [reservation, setReservation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
        console.error('Rezervasyon getirme hatası:', err);
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
          <p className="mt-4">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Rezervasyonunuz Onaylandı!
          </h1>

          {reservation && (
            <div className="text-left bg-gray-50 p-4 rounded-lg mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Rezervasyon Detayları
              </h2>
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">İşletme</dt>
                  <dd className="text-sm text-gray-900">{reservation.businessName}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Tarih</dt>
                  <dd className="text-sm text-gray-900">
                    {new Date(reservation.date).toLocaleDateString('tr-TR')}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Saat</dt>
                  <dd className="text-sm text-gray-900">{reservation.time}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Kişi Sayısı</dt>
                  <dd className="text-sm text-gray-900">{reservation.numberOfPeople}</dd>
                </div>
              </dl>
            </div>
          )}

          <p className="text-gray-600 mb-6">
            Rezervasyonunuz başarıyla onaylandı. Belirtilen tarih ve saatte işletmemizde
            sizi bekliyor olacağız.
          </p>

          <Button onClick={() => router.push('/')} className="w-full">
            Ana Sayfaya Dön
          </Button>
        </div>
      </div>
    </div>
  );
}
