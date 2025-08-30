'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ReservationForm from '@/components/business/ReservationForm';
import ReservationList from '@/components/business/ReservationList';
import { getRandomBusinessName } from '@/lib/utils';

export default function BusinessDashboard() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastCreatedReservationId, setLastCreatedReservationId] = useState<string | null>(null);
  const [businessInfo, setBusinessInfo] = useState<{
    name: string;
    walletAddress: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  
  const businessName = useMemo(() => getRandomBusinessName(), []);

  useEffect(() => {
    // Session kontrolü (gerçek uygulamada JWT veya session kullanılabilir)
    const checkSession = async () => {
      try {
        // Bu kısım gerçek uygulamada session/JWT kontrolü ile değiştirilecek
        // Şimdilik basit bir kontrol yapıyoruz
        const sessionData = localStorage.getItem('businessSession');
        if (!sessionData) {
          router.push('/business-login');
          return;
        }

        const session = JSON.parse(sessionData);
        setBusinessInfo({
          name: session.businessName,
          walletAddress: session.walletAddress
        });
      } catch (error) {
        console.error('Session kontrolü hatası:', error);
        router.push('/business-login');
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('businessSession');
    router.push('/business-login');
  };

  const handleReservationCreated = (reservationId: string) => {
    setLastCreatedReservationId(reservationId);
    setRefreshKey(prev => prev + 1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="text-white text-xl">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold text-white mb-4">ReserveL</h1>
            <p className="text-xl text-gray-300 font-medium">
              Rezervasyonları yönetin ve yeni rezervasyonlar oluşturun
            </p>
            {businessInfo && (
              <div className="mt-2">
                <p className="text-lg text-blue-300 font-semibold">{businessInfo.name}</p>
                <p className="text-sm text-gray-400">{businessInfo.walletAddress}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200"
          >
            Çıkış Yap
          </button>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          <div className="md:col-span-1">
            <div className="bg-background-light rounded-xl p-6 shadow-lg h-fit sticky top-8">
              <h2 className="text-2xl font-bold text-white mb-6">Yeni Rezervasyon</h2>
              <ReservationForm onReservationCreated={handleReservationCreated} />
            </div>
          </div>
          <div className="md:col-span-2 bg-background-light rounded-xl p-6 shadow-lg">
            <h2 className="text-2xl font-bold text-white mb-6">Mevcut Rezervasyonlar</h2>
            <ReservationList 
              key={refreshKey} 
              lastCreatedReservationId={lastCreatedReservationId}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 