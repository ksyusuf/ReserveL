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
      if (response.ok) {
        const data = await response.json();
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
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Rezervasyon bilgileri yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !reservationStatus) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold text-red-800 mb-2">Hata</h2>
            <p className="text-red-600">{error || 'Rezervasyon bulunamadı'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900/90 rounded-2xl">
      <div className="container mx-auto px-4 py-10">
        <div className="w-full max-w-3xl mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-3 tracking-tight drop-shadow">ReserveL</h1>
            <p className="text-lg md:text-xl text-blue-200 font-medium mb-1">Rezervasyonunuzu onaylayın ve avantajlardan yararlanın</p>
            <p className="text-base text-blue-300 font-semibold">Stellar blockchain ile güvenli rezervasyon</p>
          </div>

          <div className="bg-gray-900/80 border border-gray-700 rounded-xl p-6 shadow-lg backdrop-blur-sm">
            <ConfirmationDetails 
              reservation={reservationStatus}
              blockchainStatus={blockchainReservation?.status}
            />
          </div>

          {reservationStatus.status === 'pending' && reservationStatus && (
            <div className="bg-gray-900/80 border border-gray-700 rounded-xl p-6 shadow-lg mt-4 backdrop-blur-sm">
              <PaymentSection 
                reservationId={reservationId!}
                businessId={reservationStatus.businessId}
                reservationStatus={reservationStatus}
                onSuccess={handleConfirmationSuccess}
              />
            </div>
          )}

          {reservationStatus.confirmationStatus === 'confirmed' && (
            <div className="bg-green-900/30 border border-green-500/40 rounded-xl p-6 text-center backdrop-blur-sm">
              <h2 className="text-xl font-semibold text-green-800 mb-2">
                Rezervasyon Onaylandı!
              </h2>
              <p className="text-green-600">
                Rezervasyonunuz başarıyla onaylandı. Belirtilen tarih ve saatte görüşmek üzere!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>Yükleniyor...</div>}>
      <CustomerPage />
    </Suspense>
  );
} 