'use client';

import { useState } from 'react';
import ReservationForm from '@/components/business/ReservationForm';
import ReservationList from '@/components/business/ReservationList';

export default function BusinessDashboard() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastCreatedReservationId, setLastCreatedReservationId] = useState<string | null>(null);

  const handleReservationCreated = (reservationId: string) => {
    setLastCreatedReservationId(reservationId);
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">ReserveL</h1>
          <p className="text-xl text-gray-300 font-medium">
            Rezervasyonları yönetin ve yeni rezervasyonlar oluşturun
          </p>
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