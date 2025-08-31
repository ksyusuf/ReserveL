'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import ConfirmationDetails from '@/components/customer/ConfirmationDetails';
import PaymentSection from '@/components/customer/PaymentSection';
import {
  rpc,
  xdr,
  Networks,
  nativeToScVal,
  Operation,
  TransactionBuilder,
  BASE_FEE,
  Memo,
  StrKey,
} from '@stellar/stellar-sdk';
import { requestAccess } from '@stellar/freighter-api';
import { Suspense } from 'react';
import { autoNoShowCheck } from '@/lib/utils';

const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID!;
const SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';

function symToStr(sym: any) {
  if (!sym || !sym._value) return '';
  const arr = sym._value.data || sym._value;
  return new TextDecoder().decode(Uint8Array.from(arr));
}

function scValToAddress(val: any) {
  if (!val || val._arm !== 'address') return null;
  const addr = val._value;
  if (addr._arm === 'accountId') {
    // addr._value._arm === 'ed25519', addr._value._value.data (32 byte)
    // Burada base32 encode ile Stellar public key stringe çevrilmeli
    const raw = addr._value._value.data || addr._value._value; // 32 byte Uint8Array veya array
    return StrKey.encodeEd25519PublicKey(Buffer.from(raw));
  }
  return null;
}

function scValToOptionAddress(val: any) {
  if (!val || val._arm !== 'option') return null;
  if (val._value._arm === 'none') return null;
  return scValToAddress(val._value._value);
}

function scValToU64(val: any) {
  if (!val || val._arm !== 'u64') return 0;
  return val._value._attributes?.lo?._value || 0;
}

function scValToU32(val: any) {
  if (!val || val._arm !== 'u32') return 0;
  return val._value || 0;
}

function scValToBool(val: any) {
  if (!val || val._arm !== 'bool') return false;
  return val._value || false;
}

function scValToStatus(val: any) {
  // Eğer vector ise, içindeki ilk değeri al
  if (val && val._arm === 'vec' && val._value && val._value.length > 0) {
    return scValToStatus(val._value[0]);
  }
  
  // Eğer symbol ise, string'e çevir ve status'e map et
  if (val && val._arm === 'sym') {
    const statusStr = symToStr(val);
    
    // String'e göre status belirle
    if (statusStr === 'Pending') return 'Pending';
    if (statusStr === 'Confirmed') return 'Confirmed';
    if (statusStr === 'NoShow') return 'NoShow';
    if (statusStr === 'Completed') return 'Completed';
    if (statusStr === 'Cancelled') return 'Cancelled';
    
    return 'Pending';
  }
  
  if (!val || val._arm !== 'enum') {
    return 'Pending';
  }
  const enumVal = val._value;
  
  if (enumVal._arm === 0) return 'Pending';
  if (enumVal._arm === 1) return 'Confirmed';
  if (enumVal._arm === 2) return 'NoShow';
  if (enumVal._arm === 3) return 'Completed';
  if (enumVal._arm === 4) return 'Cancelled';
  
  return 'Pending';
}

function scValToI128(val: any) {
  if (!val || val._arm !== 'i128') return 0;
  // Sadece lo kullan (küçük değerler için yeterli)
  return val._value._attributes?.lo?._value || 0;
}

function parseReservation(scval: any, reservationId: string) {
  if (!scval || !scval._value) return null;
  const mapArr = scval._value;
  const get = (key: string) =>
    mapArr.find((entry: any) => symToStr(entry._attributes?.key) === key)?._attributes?.val;

  const status = scValToStatus(get('status'));

  return {
    reservationId,
    business_id: scValToAddress(get('business_id')),
    customer_id: scValToOptionAddress(get('customer_id')),
    reservation_time: scValToU64(get('reservation_time')),
    party_size: scValToU32(get('party_size')),
    payment_amount: scValToI128(get('payment_amount')),
    payment_asset: scValToAddress(get('payment_asset')),
    status: status,
    loyalty_issued: scValToBool(get('loyalty_issued')),
  };
}

function CustomerPage() {
  const searchParams = useSearchParams();
  const reservationId = searchParams.get('reservationId');
  const [reservation, setReservation] = useState<any | null>(null);
  const [reservationStatus, setReservationStatus] = useState<any | null>(null);
  const [blockchainReservation, setBlockchainReservation] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  function hexToBytes(hex: string) {
    if (!hex) return [];
    const bytes = [];
    for (let c = 0; c < hex.length; c += 2) {
      bytes.push(parseInt(hex.substr(c, 2), 16));
    }
    return bytes;
  }

  // Rezervasyon durumunu API'den al
  const fetchReservationStatus = async (id: string) => {
    try {
      const response = await fetch(`/api/reservations/${id}`);
      let data;
      if (response.ok) {
        data = await response.json();
        console.log('API\'den gelen rezervasyon verisi:', data);
        setReservationStatus(data.reservation);
      } else {
        console.warn('Rezervasyon durumu alınamadı, varsayılan değerler kullanılıyor');
        setReservationStatus({
          reservationId: id,
          businessId: '',
          businessName: 'Restoran Adı',
          customerId: 'anonymous',
          customerName: 'Müşteri Adı',
          date: '',
          time: '',
          numberOfPeople: 0,
          customerPhone: 'Telefon',
          notes: '',
          status: 'pending',
          attendanceStatus: 'not_arrived',
          confirmationStatus: 'pending',
          loyaltyTokensSent: false,
          customerAddress: null,
          transactionHash: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      // Otomatik no_show kontrolü (global fonksiyon ile)
      if (data && data.reservation) {
        const updatedIds = await autoNoShowCheck(data.reservation);
        if (updatedIds.length > 0) {
          setLoading(true);
          // Güncel veriyi tekrar çek
          const updatedResponse = await fetch(`/api/reservations/${id}`);
          if (updatedResponse.ok) {
            const updatedData = await updatedResponse.json();
            setReservationStatus(updatedData.reservation);
          }
          setLoading(false);
        }
      }
    } catch (error) {
      console.warn('Rezervasyon durumu alınırken hata:', error);
      setReservationStatus({
        reservationId: id,
        businessId: '',
        businessName: 'Restoran Adı',
        customerId: 'anonymous',
        customerName: 'Müşteri Adı',
        date: '',
        time: '',
        numberOfPeople: 0,
        customerPhone: 'Telefon',
        notes: '',
        status: 'pending',
        attendanceStatus: 'not_arrived',
        confirmationStatus: 'pending',
        loyaltyTokensSent: false,
        customerAddress: null,
        transactionHash: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  };

  // Blockchain'den rezervasyon durumunu al
  const fetchBlockchainReservation = async (reservationId: string, address: string) => {
    try {
      const server = new rpc.Server(SOROBAN_RPC_URL);
      const account = await server.getAccount(address);

      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
        memo: Memo.none(),
      })
        .addOperation(
          Operation.invokeContractFunction({
            contract: CONTRACT_ID,
            function: 'get_reservation',
            args: [nativeToScVal(reservationId, { type: 'u64' })],
          })
        )
        .setTimeout(60)
        .build();

      const simResult = await server.simulateTransaction(tx);
      let reservationData = null;
      if ('returnValue' in simResult && simResult.returnValue) {
        reservationData = simResult.returnValue;
      } else if ('result' in simResult && simResult.result && 'retval' in simResult.result) {
        reservationData = simResult.result.retval;
      }

      const parsedReservation = parseReservation(reservationData, reservationId);
      return parsedReservation;
    } catch (error) {
      console.warn('Blockchain rezervasyon durumu alınırken hata:', error);
      return null;
    }
  };

  useEffect(() => {
    const fetchReservation = async () => {
      setLoading(true);
      setError(null);
      setReservation(null);
      setReservationStatus(null);
      setBlockchainReservation(null);
      if (!reservationId) {
        setError('Rezervasyon ID bulunamadı!');
        setLoading(false);
        return;
      }

      try {
        // Önce rezervasyon durumunu al
        await fetchReservationStatus(reservationId);

        // Kullanıcıdan cüzdan bağlantısı iste
        const { address } = await requestAccess();
        if (!address) {
          setError('Cüzdan bağlantısı gerekli!');
          setLoading(false);
          return;
        }
        setWalletAddress(address);

        // Blockchain'den rezervasyon durumunu al
        const parsedReservation = await fetchBlockchainReservation(reservationId, address);
        if (!parsedReservation) {
          setError('Rezervasyon bulunamadı veya silinmiş.');
          setLoading(false);
          return;
        }
        setBlockchainReservation(parsedReservation);
      } catch (err: any) {
        setError('Rezervasyon çekilemedi: ' + (err.message || ''));
      } finally {
        setLoading(false);
      }
    };
    fetchReservation();
  }, [reservationId]);

  // Blockchain durumunu periyodik olarak güncelle
  useEffect(() => {
    if (!reservationId || !walletAddress || !blockchainReservation) return;

    const updateBlockchainStatus = async () => {
      const parsedReservation = await fetchBlockchainReservation(reservationId, walletAddress);
      if (parsedReservation && parsedReservation.status !== blockchainReservation.status) {
        setBlockchainReservation(parsedReservation);
      }
    };

    // İlk güncelleme
    updateBlockchainStatus();

    // Her 10 saniyede bir güncelle
    const interval = setInterval(updateBlockchainStatus, 10000);

    return () => clearInterval(interval);
  }, [reservationId, walletAddress, blockchainReservation]);

  const handleConfirmationSuccess = async () => {
    // API'den güncel rezervasyon durumunu al
    if (reservationId) {
      await fetchReservationStatus(reservationId);
    }

    // Blockchain'den güncel durumu al
    if (reservationId && walletAddress) {
      const parsedReservation = await fetchBlockchainReservation(reservationId, walletAddress);
      if (parsedReservation) {
        setBlockchainReservation(parsedReservation);
      }
    }
  };

  if (loading) {
    return (
      <div className=" bg-black rounded-3xl ">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 pointer-events-none" />
        
        {/* Loading Content */}
        <div className="relative z-10 flex items-center justify-center px-4 py-8">
          <div className="flex items-center space-x-3">
            <svg className="animate-spin h-8 w-8 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-white text-xl font-medium">Rezervasyon bilgileri yükleniyor...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !reservationStatus) {
    return (
      <div className="min-h-screen bg-black rounded-3xl overflow-hidden">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 pointer-events-none" />
        
        {/* Error Content */}
        <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-6 py-6 rounded-xl backdrop-blur-sm max-w-md w-full">
            <div className="flex items-start">
              <svg className="w-6 h-6 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h2 className="text-xl font-semibold mb-2">Hata</h2>
                <p className="text-sm">{error || 'Rezervasyon bulunamadı'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black rounded-3xl overflow-hidden">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 pointer-events-none" />
      
      {/* Main Content */}
      <div className="relative z-10">
        <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="w-full max-w-4xl mx-auto space-y-8">
            {/* Hero Section */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-6 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-4">
                ReserveL
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-blue-200 font-medium mb-2">
                Rezervasyonunuzu onaylayın ve avantajlardan yararlanın
              </p>
              <p className="text-sm sm:text-base text-blue-300 font-semibold">
                Stellar blockchain ile güvenli rezervasyon
              </p>
            </div>

            {/* Confirmation Details */}
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-4 sm:p-6 shadow-2xl border border-white/10">
              <div className="flex items-center space-x-3 mb-6">
                <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-green-600 to-blue-600 rounded-xl shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">Rezervasyon Detayları</h2>
                  <p className="text-gray-400 text-sm">Rezervasyon bilgilerinizi kontrol edin</p>
                </div>
              </div>
              <ConfirmationDetails 
                reservation={reservationStatus}
                blockchainStatus={blockchainReservation?.status}
              />
            </div>

            {/* Payment Section */}
            {reservationStatus.status === 'pending' && reservationStatus && (
              <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-4 sm:p-6 shadow-2xl border border-white/10">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white">Ödeme ve Onay</h2>
                    <p className="text-gray-400 text-sm">Rezervasyonunuzu onaylamak için ödeme yapın</p>
                  </div>
                </div>
                <PaymentSection 
                  reservationId={reservationId!}
                  businessId={reservationStatus.businessId}
                  reservationStatus={reservationStatus}
                  onSuccess={handleConfirmationSuccess}
                />
              </div>
            )}

            {/* Success Message */}
            {reservationStatus.confirmationStatus === 'confirmed' && (
              <div className="bg-green-500/10 border border-green-500/30 text-green-300 px-6 py-6 rounded-xl backdrop-blur-sm">
                <div className="flex items-start">
                  <svg className="w-6 h-6 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h2 className="text-xl font-semibold mb-2">Rezervasyon Onaylandı!</h2>
                    <p className="text-sm">
                      Rezervasyonunuz başarıyla onaylandı. Belirtilen tarih ve saatte görüşmek üzere!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black rounded-3xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 pointer-events-none" />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="flex items-center space-x-3">
            <svg className="animate-spin h-8 w-8 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-white text-xl font-medium">Yükleniyor...</span>
          </div>
        </div>
      </div>
    }>
      <CustomerPage />
    </Suspense>
  );
} 