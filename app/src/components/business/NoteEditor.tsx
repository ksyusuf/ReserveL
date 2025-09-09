import React, { useCallback, useState } from 'react';
import Button from '../ui/Button';
import { createConfirmationUrl } from '@/lib/utils';

// const [copiedId, setCopiedId] = useState<string | null>(null);

// Panoya kopyalama fonksiyonu
const handleCopyUrl = (confirmationToken: string) => {
  const url =  createConfirmationUrl(confirmationToken); // createConfirmationUrl'in döndürdüğü değeri al
  navigator.clipboard.writeText(url);
  // setCopiedId(reservationId);
  // setTimeout(() => setCopiedId(null), 1500);
};


export default function NoteEditor({
  reservation,
  editingNotes,
  noteText,
  setNoteText,
  updateReservationNotes,
  handleCancelEdit,
}: any) {
  return (
    <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg w-full flex flex-col min-h-[48px] sm:min-h-[60px] lg:min-h-[80px] max-h-[120px] lg:max-h-[160px]">
      <p className="text-sm text-blue-300 font-medium mb-2 flex items-center justify-between">
        <span>📝 Not:</span>
        <button
          type="button"
          className="ml-2 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-200 border border-blue-500/40 rounded px-2 py-1 transition"
          onClick={() => handleCopyUrl(reservation.confirmationToken)}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8a2 2 0 002-2V8a2 2 0 00-2-2H8a2 2 0 00-2 2v6a2 2 0 002 2zm0 0v2a2 2 0 002 2h4a2 2 0 002-2v-2" /></svg>
        </button>
        {/* {copiedId === reservation.blockchainReservationId && (
          <div className="absolute left-1/2 -translate-x-1/2 -top-8 bg-gray-800 text-white text-xs px-3 py-1 rounded shadow z-20 animate-fade-in">
            Kopyalandı!
          </div>
        )} */}
      </p>
      <textarea
        value={noteText}
        onChange={(e) => setNoteText(e.target.value)}
        className="w-full flex-1 bg-blue-900/20 border border-blue-500/30 rounded-lg text-white text-sm resize-none min-h-[24px] sm:min-h-[32px] lg:min-h-[48px] max-h-[60px] lg:max-h-[100px]"
        rows={2}
        placeholder="Not ekleyin..."
      />
      <div className="flex flex-wrap gap-2 mt-2">
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