'use client';

import { useState } from 'react';
import Button from '../ui/Button';

interface PaymentSectionProps {
  reservationId: string;
  onSuccess: () => void;
}

export default function PaymentSection({ reservationId, onSuccess }: PaymentSectionProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError(null);

      // Stellar cüzdan bağlantısı ve ödeme işlemi burada yapılacak
      const response = await fetch('/api/stellar/confirm-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reservationId,
          amount: '1', // 1 USDC
        }),
      });

      if (!response.ok) {
        throw new Error('Ödeme işlemi başarısız oldu');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ödeme sırasında bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Ödeme Bilgileri</h2>
        <p className="text-gray-600">
          Rezervasyonunuzu onaylamak için 1 USDC ödeme yapmanız gerekmektedir.
          Bu ücret, rezervasyonunuzu garanti altına almak için alınmaktadır.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      )}

      <Button
        onClick={handlePayment}
        disabled={loading}
        className="w-full"
      >
        {loading ? 'İşlem Yapılıyor...' : '1 USDC ile Onayla ve Öde'}
      </Button>
    </div>
  );
} 