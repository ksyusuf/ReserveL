'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getBusinessFromContract } from '@/contracts/contractActions';

export default function BusinessLoginPage() {
  const [businessName, setBusinessName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // 1. Kontrattan işletme bilgilerini al
      console.log('🔍 Kontrattan işletme bilgileri alınıyor...');
      console.log('🔍 İşletme adı:', businessName);
      
      const contractResult = await getBusinessFromContract(businessName);
      
      if (!contractResult.success) {
        setError('Kontrat bağlantısı başarısız');
        setIsLoading(false);
        return;
      }
      
      console.log('✅ Kontrat bilgileri alındı:', contractResult);
      
      // 2. Veritabanından işletme bilgilerini al
      const businessResponse = await fetch('/api/business/get-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ businessName }),
      });

      if (!businessResponse.ok) {
        setError('İşletme bulunamadı');
        setIsLoading(false);
        return;
      }

      const businessData = await businessResponse.json();
      console.log('🔍 Veritabanı bilgileri alındı:', businessData);
      
      // 3. Cüzdan adresi eşleştirmesi
      if (contractResult.walletAddress !== businessData.walletAddress) {
        setError('Cüzdan adresi eşleşmiyor');
        setIsLoading(false);
        return;
      }
      
      console.log('✅ Cüzdan adresi eşleşti');
      
      // 4. Session bilgisini localStorage'a kaydet
      const sessionData = {
        businessId: businessData._id,
        businessName: businessData.businessName,
        walletAddress: businessData.walletAddress,
        loginTime: new Date().toISOString()
      };
      localStorage.setItem('businessSession', JSON.stringify(sessionData));
      
      console.log('✅ Giriş başarılı, session kaydedildi');
      
      // Giriş başarılı, dashboard'a yönlendir
      router.push('/business-dashboard');
      
    } catch (error) {
      console.error('❌ Giriş hatası:', error);
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="max-w-md w-full space-y-8 p-8 bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-2">İşletme Girişi</h2>
          <p className="text-gray-300">Hesabınıza giriş yapın</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="businessName" className="block text-sm font-medium text-gray-300 mb-2">
              İşletme Adı
            </label>
            <input
              id="businessName"
              name="businessName"
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="İşletme adınızı girin"
            />
          </div>



          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isLoading ? 'Cüzdanla Giriş Yapılıyor...' : 'Cüzdanla Giriş Yap'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-gray-300">
              Henüz hesabınız yok mu?{' '}
              <Link href="/business-register" className="text-purple-400 hover:text-purple-300 font-medium">
                Kayıt olun
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
} 