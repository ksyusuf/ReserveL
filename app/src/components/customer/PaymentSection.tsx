import { useState } from 'react';
import Button from '../ui/Button';
import { registerPasskey, authenticatePasskey } from '@/lib/passkey';

interface PaymentSectionProps {
  reservationId: string;
  amount: number;
  onPaymentComplete: () => void;
}

export default function PaymentSection({
  reservationId,
  amount,
  onPaymentComplete,
}: PaymentSectionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPasskeyRegistered, setIsPasskeyRegistered] = useState(false);

  const handlePasskeyRegistration = async () => {
    try {
      setIsLoading(true);
      await registerPasskey(reservationId);
      setIsPasskeyRegistered(true);
    } catch (error) {
      console.error('Passkey registration error:', error);
      // TODO: Show error toast
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    try {
      setIsLoading(true);

      // Authenticate with Passkey
      const isAuthenticated = await authenticatePasskey();
      if (!isAuthenticated) {
        throw new Error('Passkey authentication failed');
      }

      // TODO: Get wallet address from user's wallet
      const walletAddress = 'G...'; // Placeholder

      // Confirm payment
      const response = await fetch('/api/stellar/confirm-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reservationId,
          sourceSecretKey: walletAddress,
          amount: amount.toString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Payment confirmation failed');
      }

      onPaymentComplete();
    } catch (error) {
      console.error('Payment error:', error);
      // TODO: Show error toast
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
      <div>
        <h2 className="text-xl font-semibold mb-2">Ödeme</h2>
        <p className="text-gray-600">
          Rezervasyon ücreti: {amount} USDC
        </p>
      </div>

      {!isPasskeyRegistered ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Ödeme yapabilmek için önce Passkey'inizi kaydetmeniz gerekmektedir.
          </p>
          <Button
            onClick={handlePasskeyRegistration}
            isLoading={isLoading}
          >
            Passkey Kaydet
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Passkey kaydınız tamamlandı. Ödeme yapmak için cüzdanınızı bağlayın.
          </p>
          <Button
            onClick={handlePayment}
            isLoading={isLoading}
          >
            Cüzdanı Bağla ve Öde
          </Button>
        </div>
      )}
    </div>
  );
} 