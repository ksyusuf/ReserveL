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
    <div className="bg-white p-6 rounded-lg shadow-sm border font-sans">
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Rezervasyon Detayları</h2>
            <p className="text-base font-mono text-blue-700 break-all mb-1">{reservation.reservationId}</p>
            
          </div>
          <div className="flex flex-col gap-2">
            <div className={`px-3 py-1 rounded-full text-sm font-semibold shadow-sm ${
              reservation.confirmationStatus === 'confirmed'
                ? 'bg-green-100 text-green-800'
                : reservation.confirmationStatus === 'cancelled'
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {reservation.confirmationStatus === 'confirmed' ? 'Onaylandı' : 
               reservation.confirmationStatus === 'cancelled' ? 'İptal Edildi' : 'Bekliyor'}
            </div>
            {blockchainStatus && (
              <div className={`px-3 py-1 rounded-full text-sm font-semibold shadow-sm ${
                blockchainStatus === 'Confirmed'
                  ? 'bg-blue-100 text-blue-800'
                  : blockchainStatus === 'Cancelled'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                Blockchain: {blockchainStatus}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">İşletme Adı</h3>
            <p className="font-medium text-gray-900 text-sm">{safeBusinessName}</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Müşteri Adı</h3>
            <p className="font-medium text-gray-900 text-sm">{safeCustomerName}</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tarih</h3>
            <p className="font-medium text-gray-900 text-sm">{formatDate(safeDate)}</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Saat</h3>
            <p className="font-medium text-gray-900 text-sm">{formatTime(safeTime)}</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Kişi Sayısı</h3>
            <p className="font-medium text-gray-900 text-sm">{safeNumberOfPeople} kişi</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Telefon</h3>
            <p className="font-medium text-gray-900 text-sm">{safeCustomerPhone}</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Gelme Durumu</h3>
            <p className={`font-medium text-sm ${
              reservation.attendanceStatus === 'arrived' ? 'text-green-600' :
              reservation.attendanceStatus === 'no_show' ? 'text-red-600' : 'text-yellow-600'
            }`}>
              {reservation.attendanceStatus === 'arrived' ? 'Geldi' :
               reservation.attendanceStatus === 'no_show' ? 'Gelmedi' : 'Bekliyor'}
            </p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sadakat Puanı</h3>
            <p className="font-medium text-gray-900 text-sm">
              {reservation.loyaltyTokensSent ? 'Verildi' : 'Verilmedi'}
            </p>
          </div>
          {reservation.customerAddress && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cüzdan Adresi</h3>
              <p className="font-mono text-blue-800 text-sm break-all">{reservation.customerAddress}</p>
            </div>
          )}
          {reservation.transactionHash && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">İşlem Hash</h3>
              <p className="font-mono text-blue-800 text-sm break-all">{reservation.transactionHash}</p>
            </div>
          )}
          {safeNotes && (
            <div className="md:col-span-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notlar</h3>
              <p className="font-medium text-gray-900 text-sm">{safeNotes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 