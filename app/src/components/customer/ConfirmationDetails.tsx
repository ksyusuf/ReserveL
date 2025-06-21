import { formatDate, formatTime } from '@/lib/utils';

interface ConfirmationDetailsProps {
  reservation: {
    reservationId: string;
    business_id: string | null;
    customer_id: string | null;
    reservation_time: number;
    party_size: number;
    payment_amount: string | number;
    payment_asset: string | null;
    status: string;
    loyalty_issued: boolean;
  };
}

export default function ConfirmationDetails({ reservation }: ConfirmationDetailsProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border font-sans">
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Rezervasyon ID</h2>
            <p className="text-base font-mono text-blue-700 break-all mb-1">{reservation.reservationId}</p>
            <p className="text-sm font-medium text-gray-600">Durum: <span className="font-semibold text-gray-900">{reservation.status}</span></p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-semibold shadow-sm ${
            reservation.status === 'Confirmed'
              ? 'bg-green-100 text-green-800'
              : reservation.status === 'Cancelled'
              ? 'bg-red-100 text-red-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {reservation.status}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">İşletme Adresi</h3>
            <p className="font-mono text-blue-800 text-sm break-all">{reservation.business_id || 'Belirtilmemiş'}</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Müşteri Adresi</h3>
            <p className="font-mono text-blue-800 text-sm break-all">{reservation.customer_id || 'Belirtilmemiş'}</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Kişi Sayısı</h3>
            <p className="font-medium text-gray-900 text-sm">{reservation.party_size} kişi</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sadakat Puanı Verildi mi?</h3>
            <p className="font-medium text-gray-900 text-sm">{reservation.loyalty_issued ? 'Evet' : 'Hayır'}</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Rezervasyon Zamanı</h3>
            <p className="font-medium text-gray-900 text-sm">
              {reservation.reservation_time
                ? formatDate(new Date(reservation.reservation_time * 1000)) +
                  ' ' +
                  formatTime(
                    new Date(reservation.reservation_time * 1000)
                      .toISOString()
                      .substring(11, 16)
                  )
                : 'Belirtilmemiş'}
            </p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ödeme Miktarı</h3>
            <p className="font-mono text-green-700 text-sm">{reservation.payment_amount}</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ödeme Varlığı</h3>
            <p className="font-mono text-blue-800 text-sm break-all">{reservation.payment_asset || 'Belirtilmemiş'}</p>
          </div>
        </div>
      </div>
    </div>
  );
} 