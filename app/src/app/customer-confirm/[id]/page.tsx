import { notFound } from 'next/navigation';
import ConfirmationDetails from '@/components/customer/ConfirmationDetails';
import PaymentSection from '@/components/customer/PaymentSection';

interface PageProps {
  params: {
    id: string;
  };
}

async function getReservation(id: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reservations?id=${id}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch reservation');
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching reservation:', error);
    return null;
  }
}

export default async function CustomerConfirmationPage({ params }: PageProps) {
  const reservation = await getReservation(params.id);

  if (!reservation) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">Rezervasyon Onayı</h1>
          <p className="text-gray-600">
            Rezervasyon detaylarınızı kontrol edin ve ödeme işlemini tamamlayın.
          </p>
        </div>

        <ConfirmationDetails reservation={reservation} />

        {reservation.paymentStatus === 'pending' && (
          <PaymentSection
            reservationId={reservation.reservationId}
            amount={100} // TODO: Get from reservation or business settings
            onPaymentComplete={() => {
              // TODO: Handle payment completion
            }}
          />
        )}
      </div>
    </div>
  );
} 