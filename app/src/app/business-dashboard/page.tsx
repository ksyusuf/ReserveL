'use client';

import { useState } from 'react';
import ReservationForm from '@/components/business/ReservationForm';
import ReservationList from '@/components/business/ReservationList';

export default function BusinessDashboard() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleReservationCreated = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">ReserveL</h1>
          <p className="text-xl text-gray-300 font-medium">
            Rezervasyonları yönetin ve yeni rezervasyonlar oluşturun
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <div className="bg-background-light rounded-xl p-6 shadow-lg">
            <h2 className="text-2xl font-bold text-white mb-6">Yeni Rezervasyon</h2>
            <ReservationForm onReservationCreated={handleReservationCreated} />
          </div>
          <div className="bg-background-light rounded-xl p-6 shadow-lg">
            <h2 className="text-2xl font-bold text-white mb-6">Mevcut Rezervasyonlar</h2>
            <ReservationList key={refreshKey} />
          </div>
        </div>
      </div>
    </div>
  );
} 