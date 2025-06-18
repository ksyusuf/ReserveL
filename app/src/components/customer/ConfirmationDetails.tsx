import { formatDate, formatTime } from '@/lib/utils';

interface ConfirmationDetailsProps {
  reservation: {
    reservationId: string;
    businessName: string;
    customerName: string;
    date: string;
    time: string;
    numberOfPeople: number;
    paymentStatus: 'pending' | 'completed' | 'failed';
    confirmationStatus: 'pending' | 'confirmed' | 'cancelled';
  };
}

export default function ConfirmationDetails({ reservation }: ConfirmationDetailsProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold">{reservation.businessName}</h2>
            <p className="text-sm text-gray-500">Rezervasyon No: {reservation.reservationId}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm ${
            reservation.confirmationStatus === 'confirmed'
              ? 'bg-green-100 text-green-800'
              : reservation.confirmationStatus === 'cancelled'
              ? 'bg-red-100 text-red-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {reservation.confirmationStatus === 'confirmed'
              ? 'Onaylandı'
              : reservation.confirmationStatus === 'cancelled'
              ? 'İptal Edildi'
              : 'Onay Bekliyor'}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Müşteri</h3>
            <p>{reservation.customerName}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Kişi Sayısı</h3>
            <p>{reservation.numberOfPeople} kişi</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Tarih</h3>
            <p>{formatDate(new Date(reservation.date))}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Saat</h3>
            <p>{formatTime(reservation.time)}</p>
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-500">Ödeme Durumu</h3>
            <span className={`px-3 py-1 rounded-full text-sm ${
              reservation.paymentStatus === 'completed'
                ? 'bg-green-100 text-green-800'
                : reservation.paymentStatus === 'failed'
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {reservation.paymentStatus === 'completed'
                ? 'Ödeme Tamamlandı'
                : reservation.paymentStatus === 'failed'
                ? 'Ödeme Başarısız'
                : 'Ödeme Bekliyor'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
} 