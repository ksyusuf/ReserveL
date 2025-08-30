'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { connectWallet } from '@/lib/wallet';
import { registerBusinessOnContract } from '@/contracts/contractActions';


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
      // 1. Cüzdan bağlantısı
      setSuccess('Cüzdan bağlanıyor...');
      const walletResult = await connectWallet();
      
      if (!walletResult.address) {
        throw new Error('Cüzdan bağlantısı başarısız');
      }

      // 2. Kontrat kayıt işlemi
      setSuccess('Kontrat kayıt işlemi başlatılıyor...');
      const contractResult = await registerBusinessOnContract(formData.businessName, walletResult.address);

      if (!contractResult.success) {
        setSuccess('');
        throw new Error(contractResult.registrationHash);
      }
      //todo: veritabanına kaydetme yaparken aynı cüzdanla kayıt yapılmışsa kayıt engellenir.
      // ama buraya gelince zincire kayıt yapılmış oluyır.
      // işletme kaydı iki parçaya ayrılmalı, böyle cüzdan kontrolü, zincir kaydından önce yapılmalı.
      // veritabanı kontrolü -> zincir kontrolü / kaydı -> veritabanına kayıt

      // 3. Veritabanına kayıt
      setSuccess('Veritabanına kaydediliyor...');
      const response = await fetch('/api/business/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          walletAddress: walletResult.address,
          registrationHash: contractResult.registrationHash,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('İşletme kaydı başarıyla tamamlandı! Giriş sayfasına yönlendiriliyorsunuz...');
        setTimeout(() => {
          router.push('/business-login');
        }, 2000);
      } else {
        setError(data.message || 'Kayıt başarısız');
      }
    } catch (error) {
      setError(`Kayıt hatası: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 py-8">
      <div className="max-w-2xl w-full space-y-8 p-8 bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-2">İşletme Kaydı</h2>
          <p className="text-gray-300">Sisteme kayıt olmak için cüzdanınızla imzalama yapın</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/20 border border-green-500/50 text-green-200 px-4 py-3 rounded-lg">
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="businessName" className="block text-sm font-medium text-gray-300 mb-2">
                İşletme Adı *
              </label>
              <input
                id="businessName"
                name="businessName"
                type="text"
                required
                value={formData.businessName}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="İşletme adınızı girin"
              />
            </div>



            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                E-posta
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="E-posta adresiniz"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                Telefon
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Telefon numaranız"
              />
            </div>
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-300 mb-2">
              Adres
            </label>
            <input
              id="address"
              name="address"
              type="text"
              value={formData.address}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="İşletme adresiniz"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
              Açıklama
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              placeholder="İşletmeniz hakkında kısa açıklama"
            />
          </div>

          <div className="bg-blue-500/20 border border-blue-500/50 text-blue-200 px-4 py-3 rounded-lg">
            <p className="text-sm">
              <strong>Önemli:</strong> Kayıt işlemi sırasında cüzdanınızla imzalama yapmanız gerekecektir. 
              Cüzdan adresiniz otomatik olarak alınacak ve işletmenizi sisteme kaydedecektir.
            </p>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isLoading ? 'Kayıt yapılıyor...' : 'Cüzdanla İmzala ve Kayıt Ol'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-gray-300">
              Zaten hesabınız var mı?{' '}
              <Link href="/business-login" className="text-purple-400 hover:text-purple-300 font-medium">
                Giriş yapın
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
} 