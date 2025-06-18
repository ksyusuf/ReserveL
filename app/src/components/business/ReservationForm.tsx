'use client';

import { useState, useEffect } from 'react';
import { createReservation, connectFreighter } from '@/lib/stellar';

interface ReservationFormData {
  customerName: string;
  customerPhone: string;
  date: string;
  time: string;
  notes: string;
  businessId: string;
  customerId: string;
  partySize: number;
  paymentAmount: number;
  paymentAsset: string;
}

export default function ReservationForm() {
  const [formData, setFormData] = useState<ReservationFormData>({
    customerName: '',
    customerPhone: '',
    date: '',
    time: '',
    notes: '',
    businessId: '',
    customerId: '',
    partySize: 1,
    paymentAmount: 0,
    paymentAsset: ''
  });
  const [loading, setLoading] = useState(false);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFreighterInstalled, setIsFreighterInstalled] = useState<boolean | null>(null);

  useEffect(() => {
    // Freighter'ın yüklü olup olmadığını kontrol et
    const checkFreighter = async () => {
      try {
        // @ts-ignore
        const hasFreighter = typeof window !== 'undefined' && window.freighter !== undefined;
        console.log('Freighter durumu:', hasFreighter);
        
        if (hasFreighter) {
          // @ts-ignore
          const isConnected = await window.freighter.isConnected();
          console.log('Freighter bağlantı durumu:', isConnected);
          
          if (!isConnected) {
            // @ts-ignore
            await window.freighter.connect();
            console.log('Freighter bağlantısı başarılı');
          }
        }
        
        setIsFreighterInstalled(hasFreighter);
      } catch (error) {
        console.error('Freighter kontrol hatası:', error);
        setIsFreighterInstalled(false);
      }
    };
    
    // Sayfa yüklendiğinde ve her 5 saniyede bir kontrol et
    checkFreighter();
    const interval = setInterval(checkFreighter, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      if (!isFreighterInstalled) {
        throw new Error('Freighter cüzdanı yüklü değil. Lütfen önce Freighter eklentisini yükleyin.');
      }

      // Freighter bağlantısını kontrol et
      const isConnected = await connectFreighter();
      if (!isConnected) {
        throw new Error('Freighter cüzdanına bağlanılamadı. Lütfen Freighter eklentisini açın ve bağlanın.');
      }

      // Varsayılan değerleri ayarla
      const defaultCustomerId = 'GDRWXGQZJ3F3V5WJ6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z';
      const defaultPaymentAsset = 'GDRWXGQZJ3F3V5WJ6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z';

      // Rezervasyon zamanını Unix timestamp'e çevir
      const reservationTime = new Date(`${formData.date}T${formData.time}`).getTime();
      
      // First, save to database
      const dbResponse = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerName: formData.customerName,
          customerPhone: formData.customerPhone,
          date: formData.date,
          time: formData.time,
          numberOfPeople: formData.partySize,
          businessId: '', // Freighter'dan alınacak
          customerId: defaultCustomerId,
          notes: formData.notes || '',
          paymentAmount: formData.paymentAmount,
          paymentAsset: defaultPaymentAsset
        }),
      });

      if (!dbResponse.ok) {
        const errorData = await dbResponse.json();
        throw new Error(errorData.error || 'Veritabanına kayıt sırasında bir hata oluştu');
      }

      const dbResult = await dbResponse.json();
      console.log('Veritabanı kaydı başarılı:', dbResult);

      // Then, save to smart contract
      const contractResult = await createReservation({
        businessId: '', // Freighter'dan alınacak
        customerId: defaultCustomerId,
        reservationTime,
        partySize: formData.partySize,
        paymentAmount: formData.paymentAmount * 10000000, // 7 decimal places for Stellar
        paymentAsset: defaultPaymentAsset
      });

      console.log('Kontrat sonucu:', contractResult);

      if (!contractResult.success) {
        throw new Error(contractResult.error || 'Akıllı kontrata kayıt sırasında bir hata oluştu');
      }

      // Update the reservation in database with contract ID
      await fetch(`/api/reservations?id=${dbResult.reservationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractReservationId: contractResult.reservationId,
        }),
      });

      console.log('Rezervasyon güncellendi, kontrat ID:', contractResult.reservationId);
      setReservationId(dbResult.reservationId);
      setFormData({
        customerName: '',
        customerPhone: '',
        date: '',
        time: '',
        notes: '',
        businessId: '',
        customerId: '',
        partySize: 1,
        paymentAmount: 0,
        paymentAsset: ''
      });
    } catch (error) {
      console.error('Rezervasyon oluşturma hatası:', error);
      setError(error instanceof Error ? error.message : 'Rezervasyon oluşturulurken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (isFreighterInstalled === false) {
    return (
      <div className="bg-yellow-900 text-white p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Freighter Cüzdanı Gerekli</h3>
        <p className="mb-4">
          Rezervasyon oluşturmak için Freighter cüzdanı gereklidir. Lütfen aşağıdaki adımları izleyin:
        </p>
        <ol className="list-decimal list-inside space-y-2 mb-4">
          <li>
            <a 
              href="https://chrome.google.com/webstore/detail/freighter/bcacfldlkkdogcmkkibnjlakofdplcbk" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-300 hover:text-blue-200"
            >
              Chrome için Freighter'ı yükleyin
            </a>
          </li>
          <li>
            <a 
              href="https://addons.mozilla.org/en-US/firefox/addon/freighter/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-300 hover:text-blue-200"
            >
              Firefox için Freighter'ı yükleyin
            </a>
          </li>
          <li>Tarayıcınızı yenileyin</li>
          <li>Freighter'ı açın ve bir hesap oluşturun</li>
        </ol>
        <p className="text-sm text-gray-300">
          Freighter, Stellar ağında güvenli işlemler yapmanızı sağlayan bir cüzdan uygulamasıdır.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-900 text-white p-4 rounded-md">
          <p>{error}</p>
        </div>
      )}
      
      <div>
        <label htmlFor="customerName" className="block text-sm font-medium text-gray-300">
          Müşteri Adı
        </label>
        <input
          type="text"
          id="customerName"
          value={formData.customerName}
          onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
          className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white"
          required
        />
      </div>

      <div>
        <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-300">
          Müşteri Telefonu
        </label>
        <input
          type="tel"
          id="customerPhone"
          value={formData.customerPhone}
          onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
          className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white"
          required
        />
      </div>

      <div>
        <label htmlFor="date" className="block text-sm font-medium text-gray-300">
          Tarih
        </label>
        <input
          type="date"
          id="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white"
          required
        />
      </div>

      <div>
        <label htmlFor="time" className="block text-sm font-medium text-gray-300">
          Saat
        </label>
        <input
          type="time"
          id="time"
          value={formData.time}
          onChange={(e) => setFormData({ ...formData, time: e.target.value })}
          className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white"
          required
        />
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-300">
          Notlar
        </label>
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white"
          rows={3}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Rezervasyon Oluşturuluyor...' : 'Rezervasyon Oluştur'}
      </button>

      {reservationId && (
        <div className="mt-4 p-4 bg-green-900 rounded-md">
          <p className="text-white font-medium">Rezervasyon başarıyla oluşturuldu!</p>
          <p className="text-white mt-2">Rezervasyon ID:</p>
          <p className="text-white break-all mt-1">{reservationId}</p>
        </div>
      )}
    </form>
  );
} 