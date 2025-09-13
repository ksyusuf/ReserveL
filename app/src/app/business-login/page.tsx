'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getBusinessFromContract } from '@/contracts/contractActions';
import { checkWalletConnection, connectWallet } from '@/lib/wallet';
import { useAppStore } from '@/store/useAppStore';

export default function BusinessLoginPage() {
  const [businessName, setBusinessName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{type: "error" | "warning"; message: string;} | null>(null);
  const router = useRouter();
  const setBusinessSession = useAppStore((s) => s.setBusinessSession);
  const setWalletConnected = useAppStore((s) => s.setWalletConnected);
  const setWalletAddress = useAppStore((s) => s.setWalletAddress);
  const setWalletError = useAppStore((s) => s.setWalletError);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError({ type: 'error', message: '' });

    try {
      // 1. Freighter cüzdanından adres al ve store'a yaz
      const walletStatus = await checkWalletConnection();
      if (!walletStatus.connected || !walletStatus.address) {
        setWalletConnected(false);
        setWalletAddress(null);
        setWalletError(walletStatus.error ?? 'Cüzdan bağlı değil.');
        setError({ type: 'warning', message: 'Cüzdan bağlı değil. Lütfen Freighter ile bağlanın.' });
        setIsLoading(true);
        const walletResult = await connectWallet();
        
        if (!walletResult.address) {
          setIsLoading(false);
          throw new Error('Cüzdan bağlantısı başarısız');
        }
      }
      setWalletConnected(true);
      setWalletAddress(walletStatus.address ?? null);
      setWalletError(null);

      // 2. Veritabanından işletmeyi hem isim hem cüzdanla doğrula
      const businessResponse = await fetch('/api/business/get-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName, walletAddress: walletStatus.address }),
      });
      if (!businessResponse.ok) {
        setError({ type: 'error', message: 'İşletme bulunamadı veya cüzdan adresi eşleşmiyor.' });
        setIsLoading(false);
        return;
      }
      const businessData = await businessResponse.json();

      // 3. Kontrattan işletme bilgilerini al
      console.log('🔍 Kontrattan işletme bilgileri alınıyor...');
      console.log('🔍 İşletme adı:', businessName);
      
      const contractResult = await getBusinessFromContract(businessName);
      
      if (!contractResult.success) {
        setError({ type: 'error', message: String(contractResult.error) });
        setIsLoading(false);
        return;
      }
      
      console.log('✅ Kontrat bilgileri alındı:', contractResult);
      console.log('🔍 Veritabanı bilgileri alındı:', businessData);

      // 4. Hem DB hem kontrat adresi ile Freighter adresini eşleştir
      if (contractResult.walletAddress !== businessData.walletAddress) {
        setError({ type: 'error', message: 'Cüzdan adresi eşleşmiyor.' });
        setIsLoading(false);
        return;
      }
      if (walletStatus.address !== businessData.walletAddress) {
        setError({ type: 'error', message: 'Tarayıcı cüzdan adresi bu işletmeyle eşleşmiyor.' });
        setIsLoading(false);
        return;
      }
      
      // 5. Session bilgisini localStorage'a ve store'a kaydet
      const sessionData = {
        businessId: businessData._id,
        businessName: businessData.businessName,
        walletAddress: businessData.walletAddress,
        loginTime: new Date().toISOString()
      };
      localStorage.setItem('businessSession', JSON.stringify(sessionData));
      setBusinessSession({ name: sessionData.businessName, walletAddress: sessionData.walletAddress });
      
      // Giriş başarılı, dashboard'a yönlendir
      router.push('/business-dashboard');
      
    } catch (error) {
      console.error('❌ Giriş hatası:', error);
      setError({ type: 'error', message: 'Bir hata oluştu. Lütfen tekrar deneyin.' });
      setIsLoading(false);
    }
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem('prefillBusinessName');
      if (saved) {
        setBusinessName(saved);
        localStorage.removeItem('prefillBusinessName');
      }
    } catch {}
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-600 to-blue-600 rounded-2xl mb-6 shadow-lg">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
        </div>
        <h1 className="text-5xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-4">
          ReserveL
        </h1>
        <p className="text-xl text-gray-300 font-light max-w-2xl mx-auto leading-relaxed">
          İşletme hesabınıza güvenli bir şekilde giriş yapın ve rezervasyonlarınızı yönetin
        </p>
      </div>

      {/* Main Form Container */}
      <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/10 max-w-md mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-3">İşletme Girişi</h2>
          <p className="text-gray-400">Cüzdanınızla güvenli ve hızlı giriş</p>
        </div>

        <form className="space-y-8" onSubmit={handleSubmit}>
          {/* Error Message */}
          {error && (
            <div
              className={`px-6 py-4 rounded-xl backdrop-blur-sm border
                ${error.type === "error"
                  ? "bg-red-500/10 border-red-500/30 text-red-300"
                  : "bg-yellow-500/10 border-yellow-500/30 text-yellow-300"
                }`}
            >
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 mr-3 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {error.message}
              </div>
            </div>
          )}


          {/* Business Name Input */}
          <div className="space-y-2">
            <label htmlFor="businessName" className="block text-sm font-semibold text-gray-300">
              İşletme Adı <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                id="businessName"
                name="businessName"
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 backdrop-blur-sm"
                placeholder="İşletme adınızı girin"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 text-green-200 px-6 py-4 rounded-xl backdrop-blur-sm">
            <div className="flex items-start">
              <svg className="w-6 h-6 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-medium mb-1">Güvenli Giriş Süreci</p>
                <p className="text-sm text-green-300/80">
                  Giriş işlemi sırasında cüzdanınızla doğrulama yapılacaktır. 
                  İşletme adınız blockchain'de kayıtlı cüzdan adresi ile eşleşmelidir.
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-xl shadow-lg text-lg font-semibold text-white bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Giriş yapılıyor...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Cüzdanla Giriş Yap
                </>
              )}
            </button>
          </div>

          {/* Register Link */}
          <div className="text-center pt-6 border-t border-white/10">
            <p className="text-gray-400">
              Henüz hesabınız yok mu?{' '}
              <Link href="/business-register" className="text-green-400 hover:text-green-300 font-semibold transition-colors duration-200 hover:underline">
                Kayıt olun
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
} 