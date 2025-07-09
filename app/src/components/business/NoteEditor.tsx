import React from 'react';
import Button from '../ui/Button';

export default function NoteEditor({
  reservation,
  editingNotes,
  noteText,
  setNoteText,
  updateReservationNotes,
  handleCancelEdit,
  handleCopyUrl,
  copiedId,
}: any) {
  // Yorum ve log satırlarını silme!
  return (
    <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg w-full flex flex-col min-h-[48px] sm:min-h-[60px] md:min-h-[80px] lg:min-h-[100px] max-h-[120px] md:max-h-[160px]">
      <p className="text-sm text-blue-300 font-medium mb-2 flex items-center justify-between">
        <span>📝 Not:</span>
        <button
          type="button"
          className="ml-2 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-200 border border-blue-500/40 rounded px-2 py-1 transition"
          onClick={() => handleCopyUrl(reservation.blockchainReservationId)}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8a2 2 0 002-2V8a2 2 0 00-2-2H8a2 2 0 00-2 2v6a2 2 0 002 2zm0 0v2a2 2 0 002 2h4a2 2 0 002-2v-2" /></svg>
          {copiedId === reservation.reservationId ? 'Kopyalandı!' : 'Onay URL'}
        </button>
      </p>
      <textarea
        value={noteText}
        onChange={(e) => setNoteText(e.target.value)}
        className="w-full flex-1 bg-blue-900/20 border border-blue-500/30 rounded-lg text-white text-sm resize-none min-h-[24px] sm:min-h-[32px] md:min-h-[48px] lg:min-h-[64px] max-h-[60px] md:max-h-[100px]"
        rows={2}
        placeholder="Not ekleyin..."
      />
      <div className="flex gap-2 mt-2">
        <Button
          size="sm"
          variant="outline"
          className="border-green-500 text-green-500 hover:bg-green-500/10 text-xs"
          onClick={() => updateReservationNotes(reservation.reservationId, noteText)}
        >
          Kaydet
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-red-500 text-red-500 hover:bg-red-500/10 text-xs"
          onClick={handleCancelEdit}
        >
          İptal
        </Button>
      </div>
    </div>
  );
} 