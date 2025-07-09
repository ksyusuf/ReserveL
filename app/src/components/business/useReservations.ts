import { useState, useEffect, useCallback } from 'react';
import { autoNoShowCheck } from '@/lib/utils';
import { updateReservationStatusOnContract, initializeContract } from '@/contracts/contractActions';
import { Reservation } from '@/types/Reservation';

export default function useReservations({ onReservationCreated, lastCreatedReservationId }: any) {
  // Yorum ve log satırlarını silme!
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [updatingContract, setUpdatingContract] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [autoUpdatingAttendance, setAutoUpdatingAttendance] = useState<string | null>(null);

  // Yoruma özel URL oluşturucu
  const getApprovalUrl = useCallback((reservationId: string) => {
    return `https://reserve-l.vercel.app/customer-page?reservationId=${reservationId}`;
  }, []);

  // Panoya kopyalama fonksiyonu
  const handleCopyUrl = useCallback((reservationId: string) => {
    const url = getApprovalUrl(reservationId);
    navigator.clipboard.writeText(url);
    setCopiedId(reservationId);
    setTimeout(() => setCopiedId(null), 1500);
  }, [getApprovalUrl]);

  const fetchReservations = async () => {
    try {
      setError(null);
      const response = await fetch('/api/reservations');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Rezervasyonlar yüklenirken bir hata oluştu');
      }
      setReservations(data);
      setRetryCount(0); // Başarılı olursa retry sayacını sıfırla
      // Otomatik no_show kontrolü (global fonksiyon ile)
      setTimeout(async () => {
        const updatedIds = await autoNoShowCheck(data);
        if (updatedIds.length > 0) {
          // Spinner state'i güncelle
          setAutoUpdatingAttendance(updatedIds[0]); // Aynı anda birden fazla için ilkini göster
          await fetchReservations();
          setAutoUpdatingAttendance(null);
        }
      }, 0);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      setError(error instanceof Error ? error.message : 'Rezervasyonlar yüklenirken bir hata oluştu');
      if (retryCount < 3) {
        setRetryCount((prev) => prev + 1);
        setTimeout(fetchReservations, 2000); // 2 saniye sonra tekrar dene
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateReservationStatus = async (
    reservationId: string,
    status: 'confirmed' | 'cancelled'
  ) => {
    try {
      setError(null);
      const response = await fetch(`/api/reservations?id=${reservationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ confirmationStatus: status }),
      });
      if (!response.ok) {
        throw new Error('Rezervasyon güncellenirken bir hata oluştu');
      }
      await fetchReservations();
    } catch (error) {
      console.error('Error updating reservation:', error);
      setError('Rezervasyon güncellenirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const confirmPendingReservation = async (reservationId: string) => {
    try {
      setError(null);
      const response = await fetch('/api/reservations/confirm-pending', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reservationId }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Rezervasyon onaylanırken bir hata oluştu');
      }
      await fetchReservations();
    } catch (error) {
      console.error('Error confirming pending reservation:', error);
      setError('Rezervasyon onaylanırken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const cancelConfirmedReservation = async (reservationId: string) => {
    try {
      setError(null);
      const response = await fetch('/api/reservations/cancel-confirmed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reservationId }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Rezervasyon iptal edilirken bir hata oluştu');
      }
      await fetchReservations();
    } catch (error) {
      console.error('Error cancelling confirmed reservation:', error);
      setError('Rezervasyon iptal edilirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const updateContractStatus = async (blockchainReservationId: string, newStatus: 'Completed' | 'NoShow') => {
    console.log('🔍 updateContractStatus başladı:', { blockchainReservationId, newStatus });
    setUpdatingContract(blockchainReservationId);
    setError(null);
    // Eğer bu yeni oluşturulan rezervasyon ise, lastCreatedReservationId'yi kullan
    let blockchainId = lastCreatedReservationId;
    // Hala yoksa, rezervasyonu bul ve blockchain ID'sini al
    if (!blockchainId) {
      console.log('🔍 lastCreatedReservationId yok, rezervasyon aranıyor...');
      const reservation = reservations.find(r => r.blockchainReservationId === blockchainReservationId);
      console.log('🔍 bulunan rezervasyon:', reservation);
      if (!reservation || !reservation.blockchainReservationId) {
        console.error('❌ Blockchain rezervasyon ID bulunamadı');
        setError('Blockchain rezervasyon ID bulunamadı. Bu rezervasyon eski bir rezervasyon olabilir.');
        setUpdatingContract(null);
        return;
      }
      blockchainId = reservation.blockchainReservationId;
    }
    console.log('🔍 Blockchain ID kullanılıyor:', blockchainId);
    console.log('🔍 updateReservationStatusOnContract çağrılıyor...');
    const result = await updateReservationStatusOnContract(blockchainId, newStatus);
    console.log('🔍 updateReservationStatusOnContract sonucu:', result);
    if (result.success) {
      console.log('✅ Kontrat güncelleme başarılı!');
      if (newStatus === 'Completed') {
        console.log('🔍 Alert gösteriliyor...');
      }
      console.log('🔍 Rezervasyonlar yenileniyor...');
      await fetchReservations();
    } else {
      console.error('❌ Kontrat güncelleme hatası:', result.error);
      setError(`Kontrat güncellenirken hata: ${result.error}`);
    }
    setUpdatingContract(null);
  };

  const updateAttendanceStatus = async (
    reservationId: string,
    attendanceStatus: 'not_arrived' | 'arrived' | 'no_show',
    blockchainReservationId?: string
  ) => {
    console.log('🔍 updateAttendanceStatus başladı:', { reservationId, attendanceStatus });
    try {
      setError(null);
      const response = await fetch('/api/reservations/update-attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reservationId, attendanceStatus }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gelme durumu güncellenirken bir hata oluştu');
      }
      console.log('🔍 API güncelleme başarılı, kontrat güncelleme kontrol ediliyor...');
      // Eğer müşteri geldi olarak işaretlendiyse, kontrat durumunu da güncelle
      if (attendanceStatus === 'arrived') {
        if (blockchainReservationId) {
          console.log('🔍 Müşteri geldi, kontrat durumu Completed olarak güncelleniyor...');
          await updateContractStatus(blockchainReservationId, 'Completed');
        } else {
          console.log('⚠️ blockchainReservationId yok, kontrat güncellemesi yapılmıyor');
        }
      } else if (attendanceStatus === 'no_show') {
        if (blockchainReservationId) {
          console.log('🔍 Müşteri gelmedi, kontrat durumu NoShow olarak güncelleniyor...');
          await updateContractStatus(blockchainReservationId, 'NoShow');
        } else {
          console.log('⚠️ blockchainReservationId yok, kontrat güncellemesi yapılmıyor');
        }
      }
      console.log('🔍 Rezervasyonlar yenileniyor...');
      await fetchReservations();
    } catch (error) {
      console.error('❌ updateAttendanceStatus hatası:', error);
      setError('Gelme durumu güncellenirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const updateReservationNotes = async (reservationId: string, notes: string) => {
    try {
      setError(null);
      const response = await fetch(`/api/reservations?id=${reservationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes }),
      });
      if (!response.ok) {
        throw new Error('Not güncellenirken bir hata oluştu');
      }
      await fetchReservations();
      setEditingNotes(null);
      setNoteText('');
    } catch (error) {
      console.error('Error updating notes:', error);
      setError('Not güncellenirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  return {
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
  };
} 