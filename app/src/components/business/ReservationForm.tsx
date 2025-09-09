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
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
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

      {/* Success Message with Link */}
      {responseConfirmUrl && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-300 px-4 sm:px-6 py-3 sm:py-4 rounded-xl backdrop-blur-sm">
          <div className="flex items-start">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="font-medium mb-2 text-sm sm:text-base">Rezervasyon başarıyla oluşturuldu!</p>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={responseConfirmUrl}
                  className="flex-1 text-xs sm:text-sm bg-white/5 text-white px-2 sm:px-3 py-1 sm:py-2 rounded-lg border border-white/10"
                  onFocus={e => e.target.select()}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      navigator.clipboard.writeText(responseConfirmUrl);
                    }
                  }}
                  className="p-1.5 sm:p-2 bg-green-600/20 text-green-300 rounded-lg hover:bg-green-600/30 transition-colors border border-green-500/30"
                  title="Kopyala"
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-green-300/80 mt-2">
                Bu linki müşteriyle paylaşarak rezervasyonun onaylanmasını sağlayabilirsiniz.
              </p>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
