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
    <div className="space-y-6">
      <ReservationStats reservations={reservations} />
      <div className="space-y-4">
        {reservations.map((reservation: Reservation) => (
          <ReservationCard
            key={reservation.reservationId}
            reservation={reservation}
            updatingContract={updatingContract}
            autoUpdatingAttendance={autoUpdatingAttendance}
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
        ))}
      </div>
    </div>
  );
} 