'use client';

import Button from '../ui/Button';
import ReservationCard from './ReservationCard';
import ReservationStats from './ReservationStats';
import NoteEditor from './NoteEditor';
import useReservations from './useReservations';
import { Reservation } from '@/types/Reservation';

interface ReservationListProps {
  onReservationCreated?: () => void;
  lastCreatedReservationId?: string | null;
}

export default function ReservationList({ onReservationCreated, lastCreatedReservationId }: ReservationListProps) {
  const {
    reservations,
    isLoading,
    error,
    updatingContract,
    autoUpdatingAttendance,
    reservationErrors,
    fetchReservations,
    updateAttendanceStatus,
    updateReservationStatus,
    confirmPendingReservation,
    cancelConfirmedReservation,
    updateReservationNotes,
    editingNotes,
    setEditingNotes,
    noteText,
    setNoteText,
    copiedId,
    handleCopyUrl,
  } = useReservations({ onReservationCreated, lastCreatedReservationId });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 sm:py-12">
        <div className="flex items-center space-x-3">
          <svg className="animate-spin h-5 w-5 sm:h-6 sm:w-6 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-white font-medium text-sm sm:text-base">Rezervasyonlar yükleniyor...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 sm:px-6 py-4 sm:py-6 rounded-xl backdrop-blur-sm">
        <div className="flex items-start">
          <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="font-medium mb-2 text-sm sm:text-base">Rezervasyonlar yüklenirken hata oluştu</p>
            <p className="text-xs sm:text-sm text-red-300/80 mb-3 sm:mb-4">{error}</p>
            <Button 
              onClick={fetchReservations} 
              className="bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-xs sm:text-sm"
            >
              <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Yeniden Dene
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (reservations.length === 0) {
    return (
      <div className="text-center py-8 sm:py-12">
        <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gray-500/20 rounded-2xl mb-3 sm:mb-4">
          <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Henüz rezervasyon bulunmuyor</h3>
        <p className="text-gray-400 max-w-md mx-auto text-sm sm:text-base px-4">
          İlk rezervasyonunuzu oluşturmak için sol taraftaki formu kullanabilirsiniz. 
          Rezervasyonlar burada listelenecektir.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Stats Section */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/10">
        <ReservationStats reservations={reservations} />
      </div>

      {/* Reservations List */}
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <h3 className="text-base sm:text-lg font-semibold text-white">
            Tüm Rezervasyonlar ({reservations.length})
          </h3>
          <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Onaylı</span>
            <div className="w-2 h-2 bg-yellow-500 rounded-full ml-2 sm:ml-3"></div>
            <span>Beklemede</span>
            <div className="w-2 h-2 bg-red-500 rounded-full ml-2 sm:ml-3"></div>
            <span>İptal</span>
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {reservations.map((reservation: Reservation) => (
            <div
              key={reservation.reservationId}
              className="transform transition-all duration-300 hover:scale-[1.01] sm:hover:scale-[1.02]"
            >
              <ReservationCard
                reservation={reservation}
                updatingContract={updatingContract}
                autoUpdatingAttendance={autoUpdatingAttendance}
                reservationError={reservationErrors[reservation.reservationId]}
                updateAttendanceStatus={updateAttendanceStatus}
                updateReservationStatus={updateReservationStatus}
                confirmPendingReservation={confirmPendingReservation}
                cancelConfirmedReservation={cancelConfirmedReservation}
                editingNotes={editingNotes}
                setEditingNotes={setEditingNotes}
                noteText={noteText}
                setNoteText={setNoteText}
                updateReservationNotes={updateReservationNotes}
                copiedId={copiedId}
                handleCopyUrl={handleCopyUrl}
                NoteEditor={NoteEditor}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 