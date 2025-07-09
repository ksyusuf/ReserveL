import React from 'react';
import { Reservation } from '@/types/Reservation';

export default function ReservationStats({ reservations }: { reservations: Reservation[] }) {
  // Yorum ve log satırlarını silme!
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-gradient-to-r from-blue-600/20 to-blue-800/20 border border-blue-500/30 rounded-lg p-4">
        <div className="flex items-center">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-gray-400">Bekleyen</p>
            <p className="text-xl font-semibold text-white">
              {reservations.filter(r => r.confirmationStatus === 'pending').length}
            </p>
          </div>
        </div>
      </div>
      <div className="bg-gradient-to-r from-green-600/20 to-green-800/20 border border-green-500/30 rounded-lg p-4">
        <div className="flex items-center">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-gray-400">Onaylanan</p>
            <p className="text-xl font-semibold text-white">
              {reservations.filter(r => r.confirmationStatus === 'confirmed').length}
            </p>
          </div>
        </div>
      </div>
      <div className="bg-gradient-to-r from-purple-600/20 to-purple-800/20 border border-purple-500/30 rounded-lg p-4">
        <div className="flex items-center">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-gray-400">Gelen</p>
            <p className="text-xl font-semibold text-white">
              {reservations.filter(r => r.attendanceStatus === 'arrived').length}
            </p>
          </div>
        </div>
      </div>
      <div className="bg-gradient-to-r from-orange-600/20 to-orange-800/20 border border-orange-500/30 rounded-lg p-4">
        <div className="flex items-center">
          <div className="p-2 bg-orange-500/20 rounded-lg">
            <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-gray-400">Gelmedi</p>
            <p className="text-xl font-semibold text-white">
              {reservations.filter(r => r.attendanceStatus === 'no_show').length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 