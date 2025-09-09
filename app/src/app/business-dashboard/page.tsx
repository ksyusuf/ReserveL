'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ReservationForm from '@/components/business/ReservationForm';
import ReservationList from '@/components/business/ReservationList';
import { useAppStore } from '@/store/useAppStore';

export default function BusinessDashboard() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastCreatedReservationId, setLastCreatedReservationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const businessSession = useAppStore((s) => s.businessSession);
  const setBusinessSession = useAppStore((s) => s.setBusinessSession);
  const logout = useAppStore((s) => s.logout);
  
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
        setBusinessSession({
          name: session.businessName,
          walletAddress: session.walletAddress,
        });
      } catch (error) {
        console.error('Session kontrolü hatası:', error);
        router.push('/business-login');
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, [router, setBusinessSession]);

  const handleLogout = () => {
    localStorage.removeItem('businessSession');
    logout();
    router.push('/business-login');
  };

  const handleReservationCreated = (reservationId: string) => {
    setLastCreatedReservationId(reservationId);
    setRefreshKey(prev => prev + 1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-3">
          <svg className="animate-spin h-8 w-8 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-white text-xl font-medium">Yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-10 pointer-events-none" />
      
      {/* Main Content */}
      <div className="relative z-10 min-h-screen">
        {/* Header */}
        <div className="bg-white/5 backdrop-blur-xl border-b border-white/10 rounded-3xl">
          <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl shadow-lg">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    ReserveL
                  </h1>
                  <p className="text-gray-400 text-xs sm:text-sm">İşletme Yönetim Paneli</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                {businessSession && (
                  <div className="text-left sm:text-right w-full sm:w-auto">
                    <p className="text-white font-semibold text-sm sm:text-base">{businessSession.name}</p>
                    <p className="text-gray-400 text-xs sm:text-sm font-mono">{businessSession.walletAddress.slice(0, 8)}...{businessSession.walletAddress.slice(-6)}</p>
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center sm:justify-start space-x-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-xl transition-all duration-300 hover:scale-105 w-full sm:w-auto"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="text-sm">Çıkış Yap</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="container mx-auto py-6 sm:py-8">
          <div className="max-w-7xl mx-auto">
            {/* Main Grid */}
            <div className="grid gap-6 sm:gap-8 lg:grid-cols-3">
              {/* Reservation Form Sidebar */}
              <div className="lg:col-span-1">
                <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-4 sm:p-8 shadow-2xl border border-white/10 h-fit lg:sticky lg:top-8">
                  <div className="flex items-center space-x-3 mb-6 sm:mb-8">
                    <div className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-green-600 to-blue-600 rounded-xl shadow-lg">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-2xl font-bold text-white">Yeni Rezervasyon</h3>
                      <p className="text-gray-400 text-xs sm:text-sm">Müşteri rezervasyonu oluşturun</p>
                    </div>
                  </div>
                  <ReservationForm onReservationCreated={handleReservationCreated} />
                </div>
              </div>

              {/* Reservation List */}
              <div className="lg:col-span-2">
                <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-4 sm:p-8 shadow-2xl border border-white/10">
                  <div className="flex items-center space-x-3 mb-6 sm:mb-8">
                    <div className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl shadow-lg">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-2xl font-bold text-white">Mevcut Rezervasyonlar</h3>
                      <p className="text-gray-400 text-xs sm:text-sm">Tüm rezervasyonlarınızı görüntüleyin ve yönetin</p>
                    </div>
                  </div>
                  <ReservationList 
                    key={refreshKey} 
                    lastCreatedReservationId={lastCreatedReservationId}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 