'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { connectWallet } from '@/lib/wallet';
import { registerBusinessOnContract, getBusinessFromContract } from '@/contracts/contractActions';

export default function BusinessRegisterPage() {
  const [formData, setFormData] = useState({
    businessName: '',
    email: '',
    phone: '',
    address: '',
    description: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // 1) Cüzdan bağlantısı
      setSuccess('Cüzdan bağlanıyor...');
      const walletResult = await connectWallet();
      
      if (!walletResult.address) {
        throw new Error('Cüzdan bağlantısı başarısız');
      }

      // 2) Veritabanında var mı? (önce cüzdan, sonra isim ayrı ayrı)
      setSuccess('Veritabanı kontrol ediliyor...');
      const dbCheckByWallet = await fetch('/api/business/get-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: walletResult.address }),
      });
      if (dbCheckByWallet.ok) {
        setSuccess('');
        throw new Error('Bu cüzdan adresi zaten bir işletmeye ait.');
      }

      const dbCheckByName = await fetch('/api/business/get-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName: formData.businessName }),
      });
      if (dbCheckByName.ok) {
        setSuccess('');
        throw new Error('Bu işletme adı zaten kullanımda.');
      }

      // 3) Kontratta var mı?
      setSuccess('Kontrat kontrol ediliyor...');
      const getResult = await getBusinessFromContract(formData.businessName);
      if (getResult && getResult.success === true && getResult.walletAddress) {
        setSuccess('');
        throw new Error('Bu işletme adı zaten kontratta kayıtlı. Yetkililer ile iletişime geçin.');
      }

      // 4) Kontrata kayıt
      setSuccess('Kontrata kayıt ediliyor...');
      const contractResult = await registerBusinessOnContract(formData.businessName, walletResult.address);
      if (!contractResult.success) {
        setSuccess('');
        throw new Error(contractResult.registrationHash);
      }

      // 5) Veritabanına kayıt
      setSuccess('Veritabanına kaydediliyor...');
      const response = await fetch('/api/business/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          walletAddress: walletResult.address,
          registrationHash: contractResult.registrationHash,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Kayıt başarısız');
      }

      setSuccess('İşletme kaydı başarıyla tamamlandı! Giriş sayfasına yönlendiriliyorsunuz...');
      try {
        localStorage.setItem('prefillBusinessName', formData.businessName);
      } catch {}
      setTimeout(() => {
        router.push('/business-login');
      }, 1500);
    } catch (error) {
      // Hata durumunda başarı mesajını kapat
      setSuccess('');
      setError(`Kayıt hatası: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-600 to-blue-600 rounded-2xl mb-6 shadow-lg">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h1 className="text-5xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-4">
          ReserveL
        </h1>
        <p className="text-xl text-gray-300 font-light max-w-2xl mx-auto leading-relaxed">
          İşletmenizi blockchain tabanlı rezervasyon sistemine kaydedin ve müşterilerinizle güvenli bir şekilde buluşun
        </p>
      </div>

      {/* Main Form Container */}
      <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/10">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-3">İşletme Kaydı</h2>
          <p className="text-gray-400">Cüzdanınızla güvenli ve hızlı kayıt</p>
        </div>

        <form className="space-y-8" onSubmit={handleSubmit}>
          {/* Status Messages */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-6 py-4 rounded-xl backdrop-blur-sm">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-300 px-6 py-4 rounded-xl backdrop-blur-sm">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {success}
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Business Name */}
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
                  value={formData.businessName}
                  onChange={handleInputChange}
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

            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-semibold text-gray-300">
                E-posta Adresi
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 backdrop-blur-sm"
                  placeholder="ornek@email.com"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label htmlFor="phone" className="block text-sm font-semibold text-gray-300">
                Telefon Numarası
              </label>
              <div className="relative">
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 backdrop-blur-sm"
                  placeholder="+90 555 123 45 67"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <label htmlFor="address" className="block text-sm font-semibold text-gray-300">
                İşletme Adresi
              </label>
              <div className="relative">
                <input
                  id="address"
                  name="address"
                  type="text"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 backdrop-blur-sm"
                  placeholder="İşletme adresiniz"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-semibold text-gray-300">
              İşletme Açıklaması
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              value={formData.description}
              onChange={handleInputChange}
              className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 resize-none transition-all duration-300 backdrop-blur-sm"
              placeholder="İşletmeniz hakkında kısa bir açıklama yazın..."
            />
          </div>

          {/* Info Card */}
          <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 text-green-200 px-6 py-4 rounded-xl backdrop-blur-sm">
            <div className="flex items-start">
              <svg className="w-6 h-6 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-medium mb-1">Güvenli Kayıt Süreci</p>
                <p className="text-sm text-green-300/80">
                  Kayıt işlemi sırasında cüzdanınızla imzalama yapmanız gerekecektir. 
                  Cüzdan adresiniz otomatik olarak alınacak ve işletmenizi blockchain'e kaydedecektir.
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
                  Kayıt yapılıyor...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Cüzdanla İmzala ve Kayıt Ol
                </>
              )}
            </button>
          </div>

          {/* Login Link */}
          <div className="text-center pt-6 border-t border-white/10">
            <p className="text-gray-400">
              Zaten hesabınız var mı?{' '}
              <Link href="/business-login" className="text-green-400 hover:text-green-300 font-semibold transition-colors duration-200 hover:underline">
                Giriş yapın
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
} 