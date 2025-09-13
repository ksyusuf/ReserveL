'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import * as StellarSdk from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';
import { requestAccess } from '@stellar/freighter-api';
import { CustomPollTransaction } from "../../contracts/contractActions"

interface ReservationFormData {
  customerName: string;
  customerPhone: string;
  date: string;
  time: string;
  notes: string;
  customerId: string;
  partySize: number;
}

interface ReservationFormProps {
  onReservationCreated?: (reservationId: string) => void;
}

const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID!;
const SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';

export default function ReservationForm({ onReservationCreated }: ReservationFormProps) {
  // Global transparanlık değeri
  const FORM_TRANSPARENCY = 'opacity-20';
  const FORM_TRANSPARENT_CLASS = 'form-transparency';
  const [formData, setFormData] = useState<ReservationFormData>({
    customerName: '',
    customerPhone: '',
    date: '',
    time: '',
    notes: '',
    customerId: '',
    partySize: 1,
  });
  const [loading, setLoading] = useState(false);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const businessSession = useAppStore(s => s.businessSession);
  const [responseConfirmUrl, setResponseConfirmUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>('');
  const pushToast = useAppStore((s) => s.pushToast);

  function getReservationTimestamp(date: string, time: string) {
    if (!date || !time) return 0;
    return Math.floor(new Date(`${date}T${time}:00Z`).getTime() / 1000);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setReservationId(null);

    console.log('submit tetiklendi'); // en başa koy

    try {
      // Form verilerini doğrula ve temizle
      const validatedData = {
        customerName: formData.customerName?.trim(),
        customerPhone: formData.customerPhone?.trim(),
        date: formData.date?.trim(),
        time: formData.time?.trim(),
        notes: formData.notes?.trim(),
        customerId: formData.customerId?.trim(),
        partySize: Math.max(1, parseInt(formData.partySize.toString())),
      };

      // Tarih ve saat doğrulama
      if (!validatedData.date) {
        throw new Error('Tarih seçilmelidir');
      }

      if (!validatedData.time) {
        throw new Error('Saat seçilmelidir');
      }

      const dateObj = new Date(validatedData.date);
      if (isNaN(dateObj.getTime())) {
        throw new Error('Geçersiz tarih formatı');
      }

      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(validatedData.time)) {
        throw new Error('Geçersiz saat formatı (HH:MM olmalı)');
      }

      const { address } = await requestAccess();
      console.log(address);
      if (!address || !StellarSdk.StrKey.isValidEd25519PublicKey(address)) {
        throw new Error('Freighter cüzdan adresi alınamadı veya geçersiz.');
      }

      const reservation_time = getReservationTimestamp(validatedData.date, validatedData.time);
      if (!reservation_time) throw new Error('Tarih ve saat geçersiz!');

      const server = new StellarSdk.rpc.Server(
        SOROBAN_RPC_URL,
        { allowHttp: true },
      );
      const account = await server.getAccount(address);

      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
        memo: StellarSdk.Memo.none(),
      })
        .addOperation(
          StellarSdk.Operation.invokeContractFunction({
            contract: CONTRACT_ID,
            function: 'create_reservation',
            args: [
              new StellarSdk.Address(address).toScVal(),               // business_id
              StellarSdk.nativeToScVal(reservation_time, { type: 'u64' }),
              StellarSdk.nativeToScVal(validatedData.partySize, { type: 'u32' }),
              StellarSdk.nativeToScVal("10000000", { type: 'i128' }),  // 1 USD
              StellarSdk.nativeToScVal(undefined, { type: 'asset' }) // native asset anlamında
            ],
          })
        )
        .setTimeout(60)
        .build();

        const simResult = await server.simulateTransaction(tx); // geçici olarak any
        console.log('Simülasyon sonucu:', simResult);

        // TypeScript'e burada returnValue olduğunu bildiriyoruz:
        // const returnValue = (simResult as any).returnValue;

        // if (returnValue && returnValue._arm === 'u64') {
        //   const reservationId = Number(returnValue._value._value ?? returnValue._value);
        //   console.log('Yeni rezervasyon ID:', reservationId);
        // }
        /// normalde fonksiyonun dönüş değerine böyle erişiyorduk ama bozulmuş bu.

        const assembledTx = StellarSdk.rpc.assembleTransaction(tx, simResult);

        const xdrForSing = assembledTx.build().toXDR();

        // 🔐 İmzalama
        const { signedTxXdr } = await signTransaction(xdrForSing, {
          networkPassphrase: StellarSdk.Networks.TESTNET,
        });


        const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedTxXdr, StellarSdk.Networks.TESTNET);

        // const sendResult = await server.sendTransaction(signedTx);

        // console.log('İşlem başarılı:', sendResult);

        // console.log('sendResult.hash:', sendResult.hash);

        // Initialize Soroban RPC server for testnet
        const rpc = new StellarSdk.rpc.Server("https://soroban-testnet.stellar.org");
        let sendResult: StellarSdk.rpc.Api.SendTransactionResponse;
        try {
          sendResult = await rpc.sendTransaction(signedTx);
          if (sendResult.status !== "PENDING") {
            throw sendResult;
          }
        } catch (error) {
          console.error("Error sending transaction:", error);
          throw error;
        }

        console.log("sendResult.hash: ", sendResult.hash);

        // const finalStatus = await rpc.pollTransaction(sendResult.hash, {
        //   sleepStrategy: (_iter: number) => 1000,
        //   attempts: 10,
        // });
        // normalde bu pollTransaction çalışıyordu ve dönüş değerinden sdk metotları ile dönüşüm yaparak
        // kontrat fonksiyonunun dönüş değerini vs. kolayca okuyabiliyordum ama bu sistem bozuldu.
        // freighter api mi bozdu stellar mı bozdu anlamadım.
        // artık getTransaction ile istek atıp sonucun onaylanmış olma durumuna göre id verisini de
        // simülasyondan çekecek şekilde düzenledim...

        let finalResult = await CustomPollTransaction(sendResult.hash);
        console.log("finalResult: ", finalResult);
        
                
        const lanet_big_id = (simResult as any).result.retval._value._value
        const id = Number(lanet_big_id);
        
        setReservationId(id.toString());

        if (!finalResult || finalResult.data.result.status !== 'SUCCESS') {
          console.error('İşlem zaman aşımına uğradı veya başarıyla tamamlanamadı.');
          throw new Error('Zincir işlemi başarısız oldu');
        }

        // Zincir işlemi başarılı olduktan sonra veritabanına kaydet
        console.log('Zincir işlemi başarılı, veritabanına kaydediliyor...');
        
        const reservationData = {
          customerName: validatedData.customerName,
          customerPhone: validatedData.customerPhone,
          date: validatedData.date,
          time: validatedData.time,
          numberOfPeople: validatedData.partySize,
          businessId: address,
          businessName: businessSession?.name,
          customerId: validatedData.customerId,
          notes: validatedData.notes,
          blockchainReservationId: id.toString(),
          status: 'pending',
          attendanceStatus: 'not_arrived',
          confirmationStatus: 'pending'
        };

        console.log('Frontend\'den gönderilen reservationData:', JSON.stringify(reservationData, null, 2));

        try {
          const response = await fetch('/api/reservations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(reservationData),
          });

          const jsonData = await response.json();
          if (!response.ok) {
            const errorData = jsonData;
            console.error('Veritabanı kayıt hatası:', errorData);
            throw new Error(`Veritabanına kayıt yapılamadı: ${errorData.error || 'Bilinmeyen hata'}`);
          }
          setResponseConfirmUrl(jsonData.confirmationUrl || null);
          console.log('Rezervasyon veritabanına başarıyla kaydedildi:', jsonData);
          
          // Başarılı olduğunda callback'i çağır ve formu temizle
          if (onReservationCreated) {
            onReservationCreated(id.toString());
          }
          
          // Formu temizle
          setFormData({
            customerName: '',
            customerPhone: '',
            date: '',
            time: '',
            notes: '',
            customerId: '',
            partySize: 1,
          });
        } catch (dbError: any) {
          console.error('Veritabanı kayıt hatası:', dbError);
          // Zincir işlemi başarılı ama veritabanı hatası - kullanıcıya bilgi ver
          setError(`Rezervasyon zincire kaydedildi ancak veritabanına kayıt yapılamadı: ${dbError.message}`);
        }

    } catch (err: any) {
      console.log(err);
      setError(err.message || 'Bilinmeyen hata!');
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="relative">
    
    <div className={`flex items-center space-x-3 mb-6 sm:mb-8 ${responseConfirmUrl ? FORM_TRANSPARENCY : ''} ${FORM_TRANSPARENT_CLASS}`}
      style={responseConfirmUrl ? { pointerEvents: 'none' } : {}}
    >
      <div className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-green-600 to-blue-600 rounded-xl shadow-lg">
        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </div>
      <div>
        <h3 className="text-lg sm:text-2xl font-bold text-white">Yeni Rezervasyon</h3>
        <p className="text-gray-400 text-xs sm:text-sm">Müşteri rezervasyonu oluşturun</p>
      </div>
    </div>
    <form
      onSubmit={handleSubmit}
      className={`space-y-4 sm:space-y-6 ${responseConfirmUrl ? FORM_TRANSPARENCY : ''} ${FORM_TRANSPARENT_CLASS}`}
      style={responseConfirmUrl ? { pointerEvents: 'none' } : {}}
    >
      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-3 sm:px-4 py-3 rounded-xl backdrop-blur-sm">
          <div className="flex items-center">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs sm:text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Customer Information */}
      <div className="space-y-3 sm:space-y-4">
        <div>
          <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1 sm:mb-2">
            Müşteri Adı <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 backdrop-blur-sm text-sm sm:text-base"
              placeholder="Müşteri adını girin"
              required
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 sm:pr-4">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1 sm:mb-2">
            Müşteri Telefonu <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              type="tel"
              value={formData.customerPhone}
              onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 backdrop-blur-sm text-sm sm:text-base"
              placeholder="+90 555 123 45 67"
              required
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 sm:pr-4">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Reservation Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div>
          <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1 sm:mb-2">
            Tarih <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 backdrop-blur-sm text-sm sm:text-base"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1 sm:mb-2">
            Saat <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 backdrop-blur-sm text-sm sm:text-base"
              required
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 sm:pr-4">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="sm:col-span-2 lg:col-span-1">
          <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1 sm:mb-2">
            Kişi Sayısı <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              min={1}
              value={formData.partySize}
              onChange={(e) => setFormData({ ...formData, partySize: Number(e.target.value) })}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 backdrop-blur-sm text-sm sm:text-base"
              style={{ WebkitAppearance: 'none', MozAppearance: 'textfield', appearance: 'textfield' } as React.CSSProperties}
              required
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 sm:pr-4">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Notes Section */}
      <div className="border-t border-white/10 pt-4 sm:pt-6">
        <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1 sm:mb-2">
          Özel Notlar
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 resize-none transition-all duration-300 backdrop-blur-sm text-sm sm:text-base"
          rows={3}
          placeholder="Rezervasyon hakkında özel notlar..."
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center items-center py-3 sm:py-4 px-4 sm:px-6 border border-transparent rounded-xl shadow-lg text-base sm:text-lg font-semibold text-white bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
        style={responseConfirmUrl ? { pointerEvents: 'none' } : {}}
      >
        {loading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm sm:text-base">Rezervasyon Oluşturuluyor...</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="text-sm sm:text-base">Rezervasyon Oluştur</span>
          </>
        )}
      </button>
  </form>

  {/* Başarı Overlay */}
  {responseConfirmUrl && (
      <div className="fixed inset-0 flex justify-center items-center p-4 z-50">
        <div className="bg-green-900/60 border border-green-950 text-white p-6 sm:p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center space-y-6 transform scale-95 animate-scale-in">
          <div className="flex justify-center items-center">
            <svg
              className="w-16 h-16 text-green-400 animate-pulse"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="font-bold text-xl sm:text-2xl text-green-300">Başarılı!</p>
          <p className="font-medium mb-2 text-sm sm:text-base">Rezervasyon başarıyla oluşturuldu!</p>
          <div className="flex items-center gap-2">
            <div className="relative flex flex-col items-center w-full gap-2">
              {copied && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-green-700 text-white text-md px-4 py-1 rounded-xl shadow-lg z-30 animate-fade-in font-semibold flex items-center gap-1">
                  <svg className="w-4 h-4 text-green-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Kopyalandı!
                </div>
              )}
              <div className="flex items-center gap-2 w-full">
                <input
                  type="text"
                  readOnly
                  value={responseConfirmUrl}
                  className="flex-1 w-full text-xs sm:text-md bg-white/10 text-white px-3 py-2 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-green-400/60 transition-all duration-200 shadow-inner cursor-pointer"
                  onClick={() => {
                    navigator.clipboard.writeText(responseConfirmUrl);
                    setCopied('Kopyalandı!');
                    setTimeout(() => setCopied(null), 1500);
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(responseConfirmUrl);
                    setCopied('Kopyalandı!');
                    setTimeout(() => setCopied(null), 1500);
                  }}
                  className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-green-500/80 to-blue-500/80 text-white rounded-lg hover:from-green-600 hover:to-blue-600 shadow-md text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400/60"
                >
                  <svg className="w-4 h-4 mr-1 inline-block align-text-bottom" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" className="stroke-current text-green-300" />
                    <rect x="3" y="3" width="13" height="13" rx="2" ry="2" className="stroke-current text-white" />
                  </svg>
                  Kopyala
                </button>
              </div>
            </div>
          </div>
          <p className="text-sm text-left text-green-300/80 mt-2">
            Bu linki müşteriyle paylaşarak rezervasyonun onaylanmasını sağlayabilirsiniz.
          </p>
          <button
            type="button"
            onClick={() => {
              setResponseConfirmUrl(null);
            }}
            className="w-full flex justify-center items-center py-3 sm:py-4 px-4 sm:px-6 border border-transparent rounded-xl shadow-lg text-base sm:text-md font-semibold text-white bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Yeni Rezervasyon Oluştur
          </button>
        </div>
      </div>
    )}
  </div>
  );
}
