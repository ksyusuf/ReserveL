import React, { useCallback, useState } from 'react';
import Button from '../ui/Button';
import { formatDate, formatTime } from '@/lib/utils';
import { Reservation } from '@/types/Reservation';
import { createConfirmationUrl } from '@/lib/utils';
import NoteArea from './NoteArea';



export default function ReservationCard({
  reservation,
  updatingContract,
  autoUpdatingAttendance,
  reservationError,
  updateAttendanceStatus,
  updateReservationStatus,
  confirmPendingReservation,
  cancelConfirmedReservation,
}: {
  reservation: Reservation;
  updatingContract: string | null;
  autoUpdatingAttendance: string | null;
  reservationError?: string;
  updateAttendanceStatus: (reservationId: string, attendanceStatus: 'not_arrived' | 'arrived' | 'no_show', blockchainReservationId?: string) => Promise<void>;
  updateReservationStatus: (reservationId: string, status: 'confirmed' | 'cancelled') => Promise<void>;
  confirmPendingReservation: (reservationId: string) => Promise<void>;
  cancelConfirmedReservation: (reservationId: string) => Promise<void>;
}) {

  const [showAttendancePopup, setShowAttendancePopup] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>('');

  // Panoya kopyalama fonksiyonu
  const handleCopyUrl = (confirmationToken: string) => {
    const url =  createConfirmationUrl(confirmationToken); // createConfirmationUrl'in döndürdüğü değeri al
    navigator.clipboard.writeText(url);
    setCopiedId(confirmationToken);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleAttendanceAction = async (status: 'arrived' | 'no_show' | 'not_arrived') => {
    if (status === 'not_arrived') {
      await updateAttendanceStatus(reservation.reservationId, status);
    } else {
      await updateAttendanceStatus(reservation.reservationId, status, reservation.blockchainReservationId);
    }
    setShowAttendancePopup(false);
  };

  return (
    <div
      className="relative bg-gradient-to-r from-gray-800/50 to-gray-900/50 border border-gray-700/50 rounded-xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-gray-600/50"
    >
      {/* Rezervasyon Bazlı Hata Mesajı */}
      {reservationError && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-300 px-3 py-2 rounded-lg backdrop-blur-sm">
          <div className="flex items-start">
            <svg className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-xs font-medium text-red-300">{reservationError}</p>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col lg:flex-row justify-between gap-4 sm:gap-6">
        {/* SOL: Müşteri ve rezervasyon bilgileri */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {reservation.customerName?.charAt(0)?.toUpperCase() || 'M'}
              </span>
            </div>
            <div className="truncate">
              <h3 className="font-semibold text-white text-lg truncate">{reservation.customerName || 'Müşteri Adı'}</h3>
              <p className="text-sm text-gray-400 flex items-center truncate">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {reservation.customerPhone || 'Telefon'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-300">
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {formatDate(reservation.date)}
            </div>
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatTime(reservation.time)}
            </div>
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {reservation.numberOfPeople || 0} kişi
            </div>
          </div>
          {/* Onay URL kopyala butonu - sol tarafta, müşteri bilgilerinin altında */}
          <div className="relative mt-3 inline-block">
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-200 border border-blue-500/40 rounded px-2 py-1 bg-gray-900/70 backdrop-blur transition"
              onClick={() => handleCopyUrl(reservation.confirmationToken)}
              title="Onay URL'sini kopyala"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8a2 2 0 002-2V8a2 2 0 00-2-2H8a2 2 0 00-2 2v6a2 2 0 002 2zm0 0v2a2 2 0 002 2h4a2 2 0 002-2v-2" /></svg>
              Onay URL
            </button>
            {copiedId === reservation.confirmationToken && (
              <div className="absolute left-1/2 -translate-x-1/2 -top-8 bg-gray-800 text-white text-xs px-3 py-1 rounded shadow z-20 animate-fade-in">
                Kopyalandı!
              </div>
            )}
          </div>
        </div>

        {/* SAĞ: Not kutusu */}
        <NoteArea reservation={reservation} />

      </div>
      {/* Action Buttons and Status */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch pt-4 border-t border-gray-700/50 mt-4 gap-2">
        {/* Butonlar sola yaslı */}
        <div className="flex flex-wrap gap-2 order-1 sm:order-none">
          {reservation.confirmationStatus === 'pending' && (
            <>
              {/* Desktop: Normal butonlar */}
              <div className="hidden sm:flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={reservation.attendanceStatus === 'arrived' ? 'primary' : 'outline'}
                  className={reservation.attendanceStatus === 'arrived'
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg'
                    : 'border-green-500 text-green-500 hover:bg-green-500/10'
                  }
                  onClick={() => updateAttendanceStatus(reservation.reservationId, 'arrived', reservation.blockchainReservationId)}
                  isLoading={autoUpdatingAttendance === reservation.reservationId && false}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Geldi
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-orange-500 text-orange-500 hover:bg-orange-500/10"
                  onClick={() => updateAttendanceStatus(reservation.reservationId, 'no_show', reservation.blockchainReservationId)}
                  isLoading={autoUpdatingAttendance === reservation.reservationId}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Gelmedi
                </Button>
                <Button
                  size="sm"
                  variant={reservation.attendanceStatus === 'not_arrived' ? 'primary' : 'outline'}
                  className={reservation.attendanceStatus === 'not_arrived'
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg'
                    : 'border-red-500 text-red-500 hover:bg-red-500/10'
                  }
                  onClick={() => updateAttendanceStatus(reservation.reservationId, 'not_arrived')}
                  isLoading={false}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  İptal Et
                </Button>
              </div>
              {/* Mobile: Popup butonu */}
              <div className="sm:hidden">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-blue-500 text-blue-500 hover:bg-blue-500/10"
                  onClick={() => setShowAttendancePopup(true)}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Durum
                </Button>
              </div>
            </>
          )}
          {reservation.confirmationStatus === 'confirmed' && (
            <>
              {/* Desktop: Normal butonlar */}
              <div className="hidden sm:flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={reservation.attendanceStatus === 'arrived' ? 'primary' : 'outline'}
                  className={reservation.attendanceStatus === 'arrived' 
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg' 
                    : 'border-green-500 text-green-500 hover:bg-green-500/10'
                  }
                  onClick={() => updateAttendanceStatus(reservation.reservationId, 'arrived', reservation.blockchainReservationId)}
                  disabled={reservation.attendanceStatus === 'arrived' || updatingContract === reservation.reservationId}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {updatingContract === reservation.reservationId ? 'Token Veriliyor...' : 'Geldi'}
                </Button>
                <Button
                  size="sm"
                  variant={reservation.attendanceStatus === 'no_show' ? 'primary' : 'outline'}
                  className={reservation.attendanceStatus === 'no_show' 
                    ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-lg' 
                    : 'border-orange-500 text-orange-500 hover:bg-orange-500/10'
                  }
                  onClick={() => updateAttendanceStatus(reservation.reservationId, 'no_show', reservation.blockchainReservationId)}
                  disabled={reservation.attendanceStatus === 'no_show'}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Gelmedi
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-600 text-red-600 hover:bg-red-600/20 hover:border-red-500 hover:text-red-500 bg-red-600/10"
                  onClick={() => cancelConfirmedReservation(reservation.reservationId)}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  İptal Et
                </Button>
              </div>
              {/* Mobile: Popup butonu */}
              <div className="sm:hidden">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-blue-500 text-blue-500 hover:bg-blue-500/10"
                  onClick={() => setShowAttendancePopup(true)}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Durum
                </Button>
              </div>
            </>
          )}
        </div>
        {/* Badge göstergeleri sağa yaslı, wrap ve responsive */}
        <div className="flex flex-wrap gap-2 sm:gap-3 justify-end flex-1 min-w-0 order-2 sm:order-none">
          {/* 1. Confirmation Status */}
          {reservation.confirmationStatus === 'pending' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
              <div className="w-2 h-2 rounded-full mr-2 bg-yellow-400"></div>
              Onay Bekliyor
            </span>
          )}
          {reservation.confirmationStatus === 'confirmed' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
              <div className="w-2 h-2 rounded-full mr-2 bg-green-400"></div>
              Onaylandı
            </span>
          )}
          {reservation.confirmationStatus === 'cancelled' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <div className="w-2 h-2 rounded-full mr-2 bg-orange-400"></div>
              İptal Edildi
            </span>
          )}
          {/* 2. Status */}
          {reservation.status === 'pending' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <div className="w-2 h-2 rounded-full mr-2 bg-blue-400"></div>
              Bekliyor
            </span>
          )}
          {reservation.status === 'confirmed' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
              <div className="w-2 h-2 rounded-full mr-2 bg-green-400"></div>
              Onaylandı
            </span>
          )}
          {/* status cancelled olunca yazdırılacak badge işlevi confirmationStatus ile aynı olduğu için
                bunu yazdırmamayı tercih ediyoruz. */}
          {/* {reservation.status === 'cancelled' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <div className="w-2 h-2 rounded-full mr-2 bg-orange-400"></div>
              İptal Edildi
            </span>
          )} */}
          {reservation.status === 'completed' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <div className="w-2 h-2 rounded-full mr-2 bg-purple-400"></div>
              Tamamlandı
            </span>
          )}
          {/* 3. Attendance Status */}
          {reservation.attendanceStatus === 'not_arrived' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
              <div className="w-2 h-2 rounded-full mr-2 bg-gray-400"></div>
              Gelmedi (Henüz)
            </span>
          )}
          {reservation.attendanceStatus === 'arrived' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-600/20 text-green-600 border border-green-600/30">
              <div className="w-2 h-2 rounded-full mr-2 bg-green-600"></div>
              Geldi
            </span>
          )}
          {reservation.attendanceStatus === 'no_show' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-600/20 text-orange-600 border border-orange-500/30">
              <div className="w-2 h-2 rounded-full mr-2 bg-orange-500"></div>
              Gelmedi
            </span>
          )}
          {/* 4. Loyalty Token Status */}
          {reservation.loyaltyTokensSent ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <div className="w-2 h-2 rounded-full mr-2 bg-purple-400"></div>
              🎁 Token Verildi
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <div className="w-2 h-2 rounded-full mr-2 bg-blue-400"></div>
              ⏳ Token Bekliyor
            </span>
          )}
                 </div>
       </div>

       {/* Attendance Popup */}
       {showAttendancePopup && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 rounded-xl">
           <div className="bg-gray-900/85 border border-gray-700/50 rounded-2xl p-4 w-full max-w-xs shadow-2xl backdrop-blur-xl">
             <div className="flex items-center justify-between mb-3">
               <h3 className="text-base font-medium text-white">Durum Güncelle</h3>
               <button
                 onClick={() => setShowAttendancePopup(false)}
                 className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-gray-800/50"
               >
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                 </svg>
               </button>
             </div>
             
             <div className="space-y-2">
               {reservation.confirmationStatus === 'pending' && (
                 <>
                   <button
                     onClick={() => handleAttendanceAction('arrived')}
                     disabled={autoUpdatingAttendance === reservation.reservationId}
                     className={`w-full p-2.5 rounded-xl border transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium ${
                       reservation.attendanceStatus === 'arrived'
                         ? 'bg-green-600/90 border-green-500/50 text-white shadow-lg'
                         : 'border-green-500/50 text-green-400 hover:bg-green-500/10 hover:border-green-400/70'
                     }`}
                   >
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                     </svg>
                     Geldi
                     {autoUpdatingAttendance === reservation.reservationId && (
                       <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                       </svg>
                     )}
                   </button>
                   
                   <button
                     onClick={() => handleAttendanceAction('no_show')}
                     disabled={autoUpdatingAttendance === reservation.reservationId}
                     className={`w-full p-2.5 rounded-xl border transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium ${
                       reservation.attendanceStatus === 'no_show'
                         ? 'bg-orange-600/90 border-orange-500/50 text-white shadow-lg'
                         : 'border-orange-500/50 text-orange-400 hover:bg-orange-500/10 hover:border-orange-400/70'
                     }`}
                   >
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                     </svg>
                     Gelmedi
                     {autoUpdatingAttendance === reservation.reservationId && (
                       <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                       </svg>
                     )}
                   </button>
                   
                   <button
                     onClick={() => handleAttendanceAction('not_arrived')}
                     className={`w-full p-2.5 rounded-xl border transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium ${
                       reservation.attendanceStatus === 'not_arrived'
                         ? 'bg-red-600/90 border-red-500/50 text-white shadow-lg'
                         : 'border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-400/70'
                     }`}
                   >
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                     </svg>
                     İptal Et
                   </button>
                 </>
               )}
               
               {reservation.confirmationStatus === 'confirmed' && (
                 <>
                   <button
                     onClick={() => handleAttendanceAction('arrived')}
                     disabled={reservation.attendanceStatus === 'arrived' || updatingContract === reservation.reservationId}
                     className={`w-full p-2.5 rounded-xl border transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium ${
                       reservation.attendanceStatus === 'arrived'
                         ? 'bg-green-600/90 border-green-500/50 text-white shadow-lg'
                         : 'border-green-500/50 text-green-400 hover:bg-green-500/10 hover:border-green-400/70'
                     }`}
                   >
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                     </svg>
                     {updatingContract === reservation.reservationId ? 'Token Veriliyor...' : 'Geldi'}
                     {updatingContract === reservation.reservationId && (
                       <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                       </svg>
                     )}
                   </button>
                   
                   <button
                     onClick={() => handleAttendanceAction('no_show')}
                     disabled={reservation.attendanceStatus === 'no_show'}
                     className={`w-full p-2.5 rounded-xl border transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium ${
                       reservation.attendanceStatus === 'no_show'
                         ? 'bg-orange-600/90 border-orange-500/50 text-white shadow-lg'
                         : 'border-orange-500/50 text-orange-400 hover:bg-orange-500/10 hover:border-orange-400/70'
                     }`}
                   >
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                     </svg>
                     Gelmedi
                   </button>
                   
                   <button
                     onClick={() => {
                       cancelConfirmedReservation(reservation.reservationId);
                       setShowAttendancePopup(false);
                     }}
                     className="w-full p-2.5 rounded-xl border border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-400/70 bg-red-500/5 transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium"
                   >
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                     </svg>
                     İptal Et
                   </button>
                 </>
               )}
             </div>
           </div>
         </div>
       )}
     </div>
   );
 } 