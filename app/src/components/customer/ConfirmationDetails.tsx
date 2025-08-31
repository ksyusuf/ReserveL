import { formatDate, formatTime } from '@/lib/utils';

interface ConfirmationDetailsProps {
  reservation: {
    reservationId: string;
    businessId: string;
    businessName: string;
    customerId: string;
    customerName: string;
    date: string;
    time: string;
    numberOfPeople: number;
    customerPhone: string;
    notes: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    attendanceStatus: 'not_arrived' | 'arrived' | 'no_show';
    confirmationStatus: 'pending' | 'confirmed' | 'cancelled';
    loyaltyTokensSent: boolean;
    customerAddress: string | null;
    transactionHash: string | null;
    createdAt: string;
    updatedAt: string;
  };
  blockchainStatus?: string; // Zincirden gelen durum bilgisi (opsiyonel)
}

export default function ConfirmationDetails({ reservation, blockchainStatus }: ConfirmationDetailsProps) {
  // Veri doğrulama ve temizleme
  const safeBusinessName = reservation.businessName || 'Restoran Adı';
  const safeCustomerName = reservation.customerName || 'Müşteri Adı';
  const safeDate = reservation.date || '';
  const safeTime = reservation.time || '';
  const safeNumberOfPeople = reservation.numberOfPeople || 0;
  const safeCustomerPhone = reservation.customerPhone || 'Telefon';
  const safeNotes = reservation.notes || '';

  return (
    <div className="space-y-6">
      {/* Header with Status */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Rezervasyon Detayları</h2>
          <p className="font-mono text-blue-300 text-sm break-all">{reservation.reservationId}</p>
        </div>
        <div className="flex flex-col gap-2">
          <div className={`px-3 py-1 rounded-full text-xs sm:text-sm font-semibold shadow-sm border 
            ${reservation.confirmationStatus === 'confirmed'
              ? 'bg-green-500/20 text-green-300 border-green-500/30'
              : reservation.confirmationStatus === 'cancelled'
              ? 'bg-red-500/20 text-red-300 border-red-500/30'
              : 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30'}
          `}>
            {reservation.confirmationStatus === 'confirmed' ? 'Onaylandı' : 
             reservation.confirmationStatus === 'cancelled' ? 'İptal Edildi' : 'Bekliyor'}
          </div>
          {blockchainStatus && (
            <div className={`px-3 py-1 rounded-full text-xs sm:text-sm font-semibold shadow-sm border 
              ${blockchainStatus === 'Confirmed'
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                : blockchainStatus === 'Cancelled'
                ? 'bg-red-500/20 text-red-300 border-red-500/30'
                : 'bg-gray-500/20 text-gray-300 border-gray-500/30'}
            `}>
              Blockchain: {blockchainStatus}
            </div>
          )}
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {/* Business Info */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <div className="flex items-center space-x-3 mb-3">
            <div className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-br from-green-600 to-blue-600 rounded-lg shadow-lg">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">İşletme</h3>
              <p className="font-medium text-white text-sm">{safeBusinessName}</p>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <div className="flex items-center space-x-3 mb-3">
            <div className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg shadow-lg">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Müşteri</h3>
              <p className="font-medium text-white text-sm">{safeCustomerName}</p>
            </div>
          </div>
        </div>

        {/* Date & Time */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <div className="flex items-center space-x-3 mb-3">
            <div className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg shadow-lg">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Tarih & Saat</h3>
              <p className="font-medium text-white text-sm">{formatDate(safeDate)} - {formatTime(safeTime)}</p>
            </div>
          </div>
        </div>

        {/* Party Size & Phone */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <div className="flex items-center space-x-3 mb-3">
            <div className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-br from-orange-600 to-red-600 rounded-lg shadow-lg">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Kişi & İletişim</h3>
              <p className="font-medium text-white text-sm">{safeNumberOfPeople} kişi • {safeCustomerPhone}</p>
            </div>
          </div>
        </div>

        {/* Attendance Status */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <div className="flex items-center space-x-3 mb-3">
            <div className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-br from-yellow-600 to-orange-600 rounded-lg shadow-lg">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Gelme Durumu</h3>
              <p className={`font-medium text-sm 
                ${reservation.attendanceStatus === 'arrived' ? 'text-green-400' :
                  reservation.attendanceStatus === 'no_show' ? 'text-red-400' : 'text-yellow-200'}
              `}>
                {reservation.attendanceStatus === 'arrived' ? 'Geldi' :
                  reservation.attendanceStatus === 'no_show' ? 'Gelmedi' : 'Bekliyor'}
              </p>
            </div>
          </div>
        </div>

        {/* Loyalty Status */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <div className="flex items-center space-x-3 mb-3">
            <div className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-br from-pink-600 to-purple-600 rounded-lg shadow-lg">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Sadakat Puanı</h3>
              <div className="flex items-center gap-2">
                <p className={`font-medium text-sm 
                  ${reservation.loyaltyTokensSent ? 'text-green-400' : 'text-gray-400'}
                `}>
                  {reservation.loyaltyTokensSent ? '🎁 100 Token Verildi' : '⏳ Token Bekliyor'}
                </p>
                {reservation.loyaltyTokensSent && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
                    ✓ Tamamlandı
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Blockchain Info */}
      {(reservation.customerAddress || reservation.transactionHash) && (
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <div className="flex items-center space-x-3 mb-4">
            <div className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg shadow-lg">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Blockchain Bilgileri</h3>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {reservation.customerAddress && (
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Cüzdan Adresi</h4>
                <p className="font-mono text-blue-300 text-xs break-all">{reservation.customerAddress}</p>
              </div>
            )}
            {reservation.transactionHash && (
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">İşlem Hash</h4>
                <p className="font-mono text-blue-300 text-xs break-all">{reservation.transactionHash}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {safeNotes && (
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <div className="flex items-center space-x-3 mb-3">
            <div className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg shadow-lg">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Notlar</h3>
              <p className="font-medium text-white text-sm">{safeNotes}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 