'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface ReservationFormData {
  customerName: string;
  customerPhone: string;
  date: string;
  time: string;
  numberOfPeople: number;
}

export default function ReservationForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ReservationFormData>({
    customerName: '',
    customerPhone: '',
    date: '',
    time: '',
    numberOfPeople: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      console.log('Submitting form data:', formData); // Debug için

      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          businessName: 'Test Restaurant', // TODO: Get from auth context
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Rezervasyon oluşturulurken bir hata oluştu');
      }

      console.log('Reservation created:', data); // Debug için

      router.refresh();
      setFormData({
        customerName: '',
        customerPhone: '',
        date: '',
        time: '',
        numberOfPeople: 1,
      });
    } catch (error) {
      console.error('Error creating reservation:', error);
      setError(error instanceof Error ? error.message : 'Rezervasyon oluşturulurken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'numberOfPeople' ? parseInt(value) || 1 : value,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg">
          <p className="text-red-500">{error}</p>
        </div>
      )}
      <Input
        label="Müşteri Adı"
        name="customerName"
        value={formData.customerName}
        onChange={handleChange}
        required
      />
      <Input
        label="Telefon Numarası"
        name="customerPhone"
        type="tel"
        value={formData.customerPhone}
        onChange={handleChange}
        required
      />
      <Input
        label="Tarih"
        name="date"
        type="date"
        value={formData.date}
        onChange={handleChange}
        required
      />
      <Input
        label="Saat"
        name="time"
        type="time"
        value={formData.time}
        onChange={handleChange}
        required
      />
      <Input
        label="Kişi Sayısı"
        name="numberOfPeople"
        type="number"
        min="1"
        value={formData.numberOfPeople}
        onChange={handleChange}
        required
      />
      <Button type="submit" isLoading={isLoading}>
        Rezervasyon Oluştur
      </Button>
    </form>
  );
} 