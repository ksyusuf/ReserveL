'use client';

import { useState, useEffect } from 'react';
import Button from '../ui/Button';
import { formatDate, formatTime } from '@/lib/utils';
import { updateReservationStatusOnContract, initializeContract } from '@/contracts/contractActions';

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
  const [initializingContract, setInitializingContract] = useState(false);

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
        alert(`✅ Sadakat token'ı başarıyla müşteri cüzdanına gönderildi!\n\nTransaction Hash: ${result.hash}\n\nStellar Expert'te görüntülemek için: https://stellar.expert/explorer/testnet/tx/${result.hash}`);
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

  const handleInitializeContract = async () => {
    console.log('🔍 handleInitializeContract başladı');
    
    // Statik loyalty token ID kullanılıyor
    // Bu token testnet'te oluşturulmuş örnek sadakat token'ıdır
    const loyaltyTokenId = 'CCLWOTOK72Z5QOJJWHGCUCBWHHEA2MPP35CYW4QXXWRCYSZ5F7NMANRJ';
    
    setInitializingContract(true);
    setError(null);
    
    try {
      const result = await initializeContract(loyaltyTokenId);
      console.log('🔍 initializeContract sonucu:', result);
      
      if (result.success) {
        console.log('✅ Kontrat başarıyla initialize edildi!');
        alert(`✅ Kontrat başarıyla initialize edildi!\n\nTransaction Hash: ${result.hash}\n\nStellar Expert'te görüntülemek için: https://stellar.expert/explorer/testnet/tx/${result.hash}`);
      } else {
        console.error('❌ Kontrat initialize hatası:', result.error);
        setError(`Kontrat initialize edilirken hata: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ handleInitializeContract hatası:', error);
      setError('Kontrat initialize edilirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setInitializingContract(false);
    }
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
    <div className="space-y-4">
      {/* Initialize Contract Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleInitializeContract}
          disabled={initializingContract}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          {initializingContract ? 'Kontrat Initialize Ediliyor...' : 'Kontratı Initialize Et'}
        </Button>
      </div>
      
      <div className="grid gap-4">
        {reservations.map((reservation) => (
          <div
            key={reservation.reservationId}
            className="p-4 bg-background-light border border-gray-700 rounded-lg space-y-2"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-white">{reservation.customerName || 'Müşteri Adı'}</h3>
                <p className="text-sm text-gray-400">{reservation.customerPhone || 'Telefon'}</p>
                {reservation.notes && (
                  <p className="text-sm text-gray-300 mt-1 italic">"{reservation.notes}"</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-white">
                  {formatDate(reservation.date)} - {formatTime(reservation.time)}
                </p>
                <p className="text-sm text-gray-400">
                  {reservation.numberOfPeople || 0} kişi
                </p>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="space-x-2">
                {reservation.confirmationStatus === 'pending' && (
                  <>
                    <Button
                      size="sm"
                      variant={reservation.attendanceStatus === 'arrived' ? 'primary' : 'outline'}
                      className={reservation.attendanceStatus === 'arrived'
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'border-green-500 text-green-500 hover:bg-green-500/10'
                      }
                      onClick={() => updateAttendanceStatus(reservation.reservationId, 'arrived', reservation.blockchainReservationId)}
                    >
                      Geldi
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-orange-500 text-orange-500 hover:bg-orange-500/10"
                      onClick={() => updateAttendanceStatus(reservation.reservationId, 'no_show', reservation.blockchainReservationId)}
                    >
                      Gelmedi
                    </Button>
                    <Button
                      size="sm"
                      variant={reservation.attendanceStatus === 'not_arrived' ? 'primary' : 'outline'}
                      className={reservation.attendanceStatus === 'not_arrived'
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'border-red-500 text-red-500 hover:bg-red-500/10'
                      }
                      onClick={() => updateAttendanceStatus(reservation.reservationId, 'not_arrived')}
                    >
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
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'border-green-500 text-green-500 hover:bg-green-500/10'
                      }
                      onClick={() => updateAttendanceStatus(reservation.reservationId, 'arrived', reservation.blockchainReservationId)}
                      disabled={reservation.attendanceStatus === 'arrived' || updatingContract === reservation.reservationId}
                    >
                      {updatingContract === reservation.reservationId ? 'Token Veriliyor...' : 'Geldi'}
                    </Button>
                    <Button
                      size="sm"
                      variant={reservation.attendanceStatus === 'no_show' ? 'primary' : 'outline'}
                      className={reservation.attendanceStatus === 'no_show' 
                        ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                        : 'border-orange-500 text-orange-500 hover:bg-orange-500/10'
                      }
                      onClick={() => updateAttendanceStatus(reservation.reservationId, 'no_show', reservation.blockchainReservationId)}
                      disabled={reservation.attendanceStatus === 'no_show'}
                    >
                      Gelmedi
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-600 text-red-600 hover:bg-red-600/20 hover:border-red-500 hover:text-red-500 bg-red-600/10"
                      onClick={() => cancelConfirmedReservation(reservation.reservationId)}
                    >
                      İptal Et
                    </Button>
                  </>
                )}
              </div>
              <div className="text-sm space-y-1">
                {/* Confirmation Status */}
                <span className={`inline-block px-2 py-1 rounded ${
                  reservation.confirmationStatus === 'confirmed' && reservation.status === 'cancelled'
                    ? 'bg-orange-500/20 text-orange-400'
                    : reservation.confirmationStatus === 'confirmed'
                    ? 'bg-green-500/20 text-green-400'
                    : reservation.confirmationStatus === 'cancelled'
                    ? 'bg-orange-500/20 text-orange-400'
                    : reservation.confirmationStatus === 'pending'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
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
                  <span className={`inline-block px-2 py-1 rounded text-xs ${
                    reservation.loyaltyTokensSent
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
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