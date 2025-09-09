import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { autoNoShowCheck } from '@/lib/utils';
import { updateReservationStatusOnContract } from '@/contracts/contractActions';
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
  const [autoUpdatingAttendance, setAutoUpdatingAttendance] = useState<string | null>(null);
  const [reservationErrors, setReservationErrors] = useState<Record<string, string>>({});
  const businessSession = useAppStore((s) => s.businessSession);

  const fetchReservations = async () => {
    try {
      setError(null);
      setIsLoading(true);
      const businessId = businessSession?.walletAddress ? encodeURIComponent(businessSession.walletAddress) : '';
      const url = businessId ? `/api/reservations?businessId=${businessId}` : '/api/reservations';
      const response = await fetch(url);
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
  }, [businessSession?.walletAddress]);

  // Tek rezervasyon güncelleme fonksiyonu
  const getSingleReservation = async (reservationId: string) => {
    try {
      const response = await fetch(`/api/reservations?id=${reservationId}`);
      if (!response.ok) {
        throw new Error('Rezervasyon güncellenirken bir hata oluştu');
      }
      const updatedReservation = await response.json();
      
      // Sadece ilgili rezervasyonu güncelle
      setReservations(prev => 
        prev.map(r => r.reservationId === reservationId ? updatedReservation : r)
      );
    } catch (error) {
      console.error('Error updating single reservation:', error);
      // Hata durumunda tüm listeyi yenile
      await fetchReservations();
    }
  };

  const updateReservationStatus = async (
    reservationId: string,
    status: 'confirmed' | 'cancelled'
  ) => {
    try {
      // Rezervasyon bazlı hatayı temizle
      setReservationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[reservationId];
        return newErrors;
      });
      
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
      await getSingleReservation(reservationId);
    } catch (error) {
      console.error('Error updating reservation:', error);
      setReservationErrors(prev => ({
        ...prev,
        [reservationId]: 'Rezervasyon güncellenirken bir hata oluştu. Lütfen tekrar deneyin.'
      }));
    }
  };

  const confirmPendingReservation = async (reservationId: string) => {
    try {
      // Rezervasyon bazlı hatayı temizle
      setReservationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[reservationId];
        return newErrors;
      });
      
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
      await getSingleReservation(reservationId);
    } catch (error) {
      console.error('Error confirming pending reservation:', error);
      setReservationErrors(prev => ({
        ...prev,
        [reservationId]: 'Rezervasyon onaylanırken bir hata oluştu. Lütfen tekrar deneyin.'
      }));
    }
  };

  const cancelConfirmedReservation = async (reservationId: string) => {
    try {
      // Rezervasyon bazlı hatayı temizle
      setReservationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[reservationId];
        return newErrors;
      });
      
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
      await getSingleReservation(reservationId);
    } catch (error) {
      console.error('Error cancelling confirmed reservation:', error);
      setReservationErrors(prev => ({
        ...prev,
        [reservationId]: 'Rezervasyon iptal edilirken bir hata oluştu. Lütfen tekrar deneyin.'
      }));
    }
  };

  const updateAttendanceStatus = async (
    reservationId: string,
    attendanceStatus: 'not_arrived' | 'arrived' | 'no_show',
    blockchainReservationId?: string
  ) => {
    console.log('🔍 updateAttendanceStatus başladı:', { reservationId, attendanceStatus });
    try {
      // Rezervasyon bazlı hatayı temizle
      setReservationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[reservationId];
        return newErrors;
      });
      
      const reservation = reservations.find(r => r.blockchainReservationId === blockchainReservationId);
      console.log('🔍 bulunan rezervasyon:', reservation);
      if (!reservation || !reservation.blockchainReservationId) {
        console.error('❌ Blockchain rezervasyon ID bulunamadı');
        setReservationErrors(prev => ({
          ...prev,
          [reservationId]: 'Blockchain rezervasyon ID bulunamadı. Bu rezervasyon eski bir rezervasyon olabilir.'
        }));
        setUpdatingContract(null);
        return;
      }
      let res_id = parseInt(reservation.blockchainReservationId, 10);
      let result: any;
      // Önce kontrat güncellemesini yap. aynı zamanda kontrol etmiş oluruz. önceliğimiz kontrat.
      if (attendanceStatus === 'arrived') {
        if (blockchainReservationId) {
          console.log('🔍 Müşteri geldi, kontrat durumu Completed olarak güncelleniyor...');
          result = await updateReservationStatusOnContract(res_id, 'Completed');
        } else {
          console.log('⚠️ blockchainReservationId yok, kontrat güncellemesi yapılmıyor');
          throw new Error('blockchainReservationId yok.');
        }
      } else if (attendanceStatus === 'no_show') {
        if (blockchainReservationId) {
          console.log('🔍 Müşteri gelmedi, kontrat durumu NoShow olarak güncelleniyor...');
          result = await updateReservationStatusOnContract(res_id, 'NoShow');
        } else {
          console.log('⚠️ blockchainReservationId yok, kontrat güncellemesi yapılmıyor');
          throw new Error('blockchainReservationId yok.');
        }
      }
      if (result.success) {
        console.log('✅ Kontrat güncelleme başarılı!');
      } else {
        console.error('❌ Kontrat güncelleme hatası:', result.error);
        setReservationErrors(prev => ({
          ...prev,
          [reservationId]: `Kontrat güncellenirken hata: ${result.error}`
        }));
        return;
      }

      // normalde zincir güncelleme işlemi için önce simülasyonu yapıp duruma bakıp ona 
      // göre veritabanı güncelleme işlemine geçmek ve tüm iki işlemi de büyüük bir rollback
      // mekanizması şeklinde yapmak gerek..
      // kontrat güncellemesi başarıyla tamamlandığına göre veritabanı güncellenebilir.
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
      console.log('🔍 DB güncelleme başarılı.');
      
      // Hibrit yaklaşım: Başarılı durumda sadece ilgili rezervasyonu güncelle
      console.log('🔍 İlgili rezervasyon güncelleniyor...');
      await getSingleReservation(reservationId);
    } catch (error) {
      console.error('❌ updateAttendanceStatus hatası:', error);
      setReservationErrors(prev => ({
        ...prev,
        [reservationId]: 'Gelme durumu güncellenirken bir hata oluştu. Lütfen tekrar deneyin.'
      }));
    }
  };

  const updateReservationNotes = async (reservationId: string, notes: string) => {
    try {
      // Rezervasyon bazlı hatayı temizle
      setReservationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[reservationId];
        return newErrors;
      });
      
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
      await getSingleReservation(reservationId);
      setEditingNotes(null);
      setNoteText('');
    } catch (error) {
      console.error('Error updating notes:', error);
      setReservationErrors(prev => ({
        ...prev,
        [reservationId]: 'Not güncellenirken bir hata oluştu. Lütfen tekrar deneyin.'
      }));
    }
  };

  return {
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
  };
} 