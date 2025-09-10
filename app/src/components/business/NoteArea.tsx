import React, { useState } from "react";
import Button from "../ui/Button";
import { createConfirmationUrl } from "@/lib/utils";
import { updateReservationNote } from "./useReservations";

interface NoteAreaProps {
  reservation: any;
}

export default function NoteArea({ reservation }: NoteAreaProps) {
  const [editingNotes, setEditingNotes] = useState<boolean>(false);
  const [noteText, setNoteText] = useState(reservation.notes || "");

  const handleOpenEditor = () => setEditingNotes(true);
  const handleCancelEdit = () => {
    setNoteText(reservation.notes || "");
    setEditingNotes(false);
  };

  const handleSaveNote = async () => {
    await updateReservationNote(reservation.reservationId, noteText);
    reservation.notes = noteText;
    setEditingNotes(false);
  };

  const handleCopyUrl = (confirmationToken: string) => {
    const url = createConfirmationUrl(confirmationToken);
    navigator.clipboard.writeText(url);
  };

  return (
    <div className="mb-2 w-full lg:w-[220px] flex flex-col items-start">
      {editingNotes ? (
        <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg w-full flex flex-col min-h-[48px] sm:min-h-[60px] lg:min-h-[80px] max-h-[120px] lg:max-h-[160px]">
          <p className="text-sm text-blue-300 font-medium mb-2 flex items-center justify-between">
            <span>📝 Not:</span>
          </p>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="w-full flex-1 pl-2 bg-blue-900/20 border border-blue-500/30 rounded-lg text-blue100 text-sm resize-none min-h-[24px] sm:min-h-[32px] lg:min-h-[48px] max-h-[60px] lg:max-h-[100px]"
            rows={2}
            placeholder="Not ekleyin..."
          />
          <div className="flex flex-wrap gap-2 mt-2">
            <Button
              size="sm"
              variant="outline"
              className="border-green-500 text-green-500 hover:bg-green-500/10 text-xs"
              onClick={handleSaveNote}
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
      ) : reservation.notes ? (
        <div className="relative p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg w-full flex flex-col justify-between min-h-[48px] sm:min-h-[60px] lg:min-h-[80px] max-h-[120px] lg:max-h-[160px]">
          <button
            type="button"
            className="absolute top-2 right-2 p-1.5 text-blue-400 hover:text-blue-50"
            onClick={handleOpenEditor}
            title="Notu düzenle"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414
                   a2 2 0 112.828 2.828L11.828 15H9v-2.828
                   l8.586-8.586z"
              />
            </svg>
          </button>
          <div>
            <p className="text-sm text-blue-300 font-medium mb-1 flex items-center justify-between">
              <span>📝 Not:</span>
            </p>
            <p className="text-sm text-blue-200 italic break-words line-clamp-3 pr-8">
              "{reservation.notes}"
            </p>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="w-full lg:w-[220px] p-3 bg-blue-900/10 border border-blue-500/20 rounded-lg
                     hover:bg-blue-900/20 hover:border-blue-500/30 transition-all duration-200
                     group flex items-center justify-center gap-2"
          onClick={handleOpenEditor}
          title="Not Ekle"
        >
          <svg
            className="w-4 h-4 text-blue-400 group-hover:text-blue-300 transition-colors duration-200"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          <span className="text-sm text-blue-400 group-hover:text-blue-300 font-medium transition-colors duration-200">
            Not Ekle
          </span>
        </button>
      )}
    </div>
  );
}
