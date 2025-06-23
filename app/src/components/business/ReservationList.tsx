'use client';

import { useState, useEffect, useCallback } from 'react';
import Button from '../ui/Button';
import { formatDate, formatTime } from '@/lib/utils';
import { updateReservationStatusOnContract, initializeContract } from '@/contracts/contractActions';

// Global fonksiyon olarak window objesine ekle
declare global {
  interface Window {
    initializeReserveLContract: () => Promise<void>;
  }
}

// Global fonksiyonu tanımla
if (typeof window !== 'undefined') {
  window.initializeReserveLContract = async () => {
    console.log('🔍 initializeReserveLContract başladı');
    
    // Statik loyalty token ID kullanılıyor
    // Bu token testnet'te oluşturulmuş örnek sadakat token'ıdır
    const loyaltyTokenId = 'CCCW5YEWDTTKEA3P3TUX3FMBSV4IPG33IEJAEEFLXGV2HMD2GUINUH44';
    
    try {
      const result = await initializeContract(loyaltyTokenId);
      console.log('🔍 initializeContract sonucu:', result);
      
      if (result.success) {
        console.log('✅ Kontrat başarıyla initialize edildi!');
        console.log('Transaction Hash:', result.hash);
        console.log('Stellar Expert\'te görüntülemek için:', `https://stellar.expert/explorer/testnet/tx/${result.hash}`);
      } else {
        console.error('❌ Kontrat initialize hatası:', result.error);
      }
    } catch (error) {
      console.error('❌ initializeReserveLContract hatası:', error);
    }
  };
}

interface Reservation {
  reservationId: string;
  customerName: string;
  customerPhone: string;
  date: string;
  time: string;
  numberOfPeople: number;
  attendanceStatus: 'not_arrived' | 'arrived' | 'no_show';
  confirmationStatus: 'pending' | 'confirmed' | 'cancelled';
  loyaltyTokensSent: boolean;
  blockchainReservationId: string;
  notes?: string;
  status: 'confirmed' | 'cancelled';
}

interface ReservationListProps {
  onReservationCreated?: () => void;
  lastCreatedReservationId?: string | null;
}

export default function ReservationList({ onReservationCreated, lastCreatedReservationId }: ReservationListProps) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [updatingContract, setUpdatingContract] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
    } catch (error) {
      console.error('Error fetching reservations:', error);
      setError(error instanceof Error ? error.message : 'Rezervasyonlar yüklenirken bir hata oluştu');
      
      // 3 kezden az deneme yapıldıysa otomatik yeniden dene
      if (retryCount < 3) {
        setRetryCount(prev => prev + 1);
        setTimeout(fetchReservations, 2000); // 2 saniye sonra tekrar dene
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
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

  const handleEditNotes = (reservation: Reservation) => {
    setEditingNotes(reservation.reservationId);
    setNoteText(reservation.notes || '');
  };

  const handleSaveNotes = (reservationId: string) => {
    updateReservationNotes(reservationId, noteText);
  };

  const handleCancelEdit = () => {
    setEditingNotes(null);
    setNoteText('');
  };

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
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold text-white">Rezervasyonlar</h3>
          <p className="text-sm text-gray-400 mt-1">
            Toplam {reservations.length} rezervasyon
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-400">Canlı</span>
        </div>
      </div>

      {/* Stats Cards */}
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

      {/* Reservations List */}
      <div className="space-y-4">
        {reservations.map((reservation) => (
          <div
            key={reservation.reservationId}
            className="relative bg-gradient-to-r from-gray-800/50 to-gray-900/50 border border-gray-700/50 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-gray-600/50"
          >
            <div className="flex flex-col md:flex-row justify-between gap-6">
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
                    onClick={() => handleCopyUrl(reservation.blockchainReservationId)}
                    title="Onay URL'sini kopyala"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8a2 2 0 002-2V8a2 2 0 00-2-2H8a2 2 0 00-2 2v6a2 2 0 002 2zm0 0v2a2 2 0 002 2h4a2 2 0 002-2v-2" /></svg>
                    Onay URL
                  </button>
                  {copiedId === reservation.blockchainReservationId && (
                    <div className="absolute left-1/2 -translate-x-1/2 -top-8 bg-gray-800 text-white text-xs px-3 py-1 rounded shadow z-20 animate-fade-in">
                      Kopyalandı!
                    </div>
                  )}
                </div>
              </div>

              {/* SAĞ: Not kutusu */}
              <div className="flex flex-col items-end min-w-[220px] max-w-xs w-full">
                <div className="mb-2 w-[220px] flex items-start">
                  {editingNotes === reservation.reservationId ? (
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
                          onClick={() => handleSaveNotes(reservation.reservationId)}
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
                    <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg w-full flex flex-col justify-between min-h-[48px] sm:min-h-[60px] md:min-h-[80px] lg:min-h-[100px] max-h-[120px] md:max-h-[160px]">
                      <div>
                        <p className="text-sm text-blue-300 font-medium mb-1 flex items-center justify-between">
                          <span>📝 Not:</span>
                        </p>
                        <p className="text-sm text-blue-200 italic break-words line-clamp-3">"{reservation.notes}"</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-blue-500 text-blue-500 hover:bg-blue-500/10 text-xs mt-2 self-end"
                        onClick={() => handleEditNotes(reservation)}
                      >
                        Düzenle
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-blue-500 text-blue-500 hover:bg-blue-500/10 text-xs w-full min-h-[48px] sm:min-h-[60px] md:min-h-[80px] lg:min-h-[100px] max-h-[120px] md:max-h-[160px]"
                      onClick={() => handleEditNotes(reservation)}
                    >
                      + Not Ekle
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons and Status (eski haliyle) */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-700/50 mt-4">
              <div className="flex space-x-2">
                {reservation.confirmationStatus === 'pending' && (
                  <>
                    <Button
                      size="sm"
                      variant={reservation.attendanceStatus === 'arrived' ? 'primary' : 'outline'}
                      className={reservation.attendanceStatus === 'arrived'
                        ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg'
                        : 'border-green-500 text-green-500 hover:bg-green-500/10'
                      }
                      onClick={() => updateAttendanceStatus(reservation.reservationId, 'arrived', reservation.blockchainReservationId)}
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
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      İptal Et
                    </Button>
                  </>
                )}
                {reservation.confirmationStatus === 'confirmed' && (
                  <>
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
                  </>
                )}
              </div>
              <div className="flex flex-col items-end space-y-2">
                {/* Confirmation Status */}
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  reservation.confirmationStatus === 'confirmed' && reservation.status === 'cancelled'
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                    : reservation.confirmationStatus === 'confirmed'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : reservation.confirmationStatus === 'cancelled'
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                    : reservation.confirmationStatus === 'pending'
                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                }`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    reservation.confirmationStatus === 'confirmed' && reservation.status === 'cancelled'
                      ? 'bg-orange-400'
                      : reservation.confirmationStatus === 'confirmed'
                      ? 'bg-green-400'
                      : reservation.confirmationStatus === 'cancelled'
                      ? 'bg-orange-400'
                      : reservation.confirmationStatus === 'pending'
                      ? 'bg-yellow-400'
                      : 'bg-yellow-400'
                  }`}></div>
                  {reservation.confirmationStatus === 'confirmed' && reservation.status === 'cancelled'
                    ? 'Onaylı-İptal'
                    : reservation.confirmationStatus === 'confirmed'
                    ? 'Onaylandı'
                    : reservation.confirmationStatus === 'cancelled'
                    ? 'Gelmedi'
                    : reservation.confirmationStatus === 'pending'
                    ? 'Onay Bekliyor'
                    : 'Onay Bekliyor'}
                </span>
                {/* Loyalty Token Status */}
                {reservation.attendanceStatus === 'arrived' && (
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    reservation.loyaltyTokensSent
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      reservation.loyaltyTokensSent ? 'bg-purple-400' : 'bg-blue-400'
                    }`}></div>
                    {reservation.loyaltyTokensSent ? '🎁 Token Verildi' : '⏳ Token Bekliyor'}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 