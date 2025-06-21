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
  if (!val) return null;
  if (val._arm === 'vec' && Array.isArray(val._value) && val._value.length > 0) {
    return scValToAddress(val._value[0]);
  }
  return null;
}

function scValToU64(val: any) {
  if (!val || val._arm !== 'u64') return 0;
  return Number(val._value._value ?? val._value);
}

function scValToU32(val: any) {
  if (!val || val._arm !== 'u32') return 0;
  return val._value;
}

function scValToI128(val: any) {
  if (!val || val._arm !== 'i128') return 0;
  // Sadece lo kullan (küçük değerler için yeterli)
  return val._value._attributes?.lo?._value || 0;
}

function scValToBool(val: any) {
  if (!val || val._arm !== 'b') return false;
  return val._value;
}

function scValToStatus(val: any) {
  if (!val) return '';
  if (val._arm === 'vec' && Array.isArray(val._value) && val._value.length > 0) {
    // Status bir enum, ilk eleman bir sym
    return symToStr(val._value[0]);
  }
  if (val._arm === 'sym') return symToStr(val);
  return '';
}

function parseReservation(scval: any, reservationId: string) {
  if (!scval || !scval._value) return null;
  const mapArr = scval._value;
  const get = (key: string) =>
    mapArr.find((entry: any) => symToStr(entry._attributes?.key) === key)?._attributes?.val;

  return {
    reservationId,
    business_id: scValToAddress(get('business_id')),
    customer_id: scValToOptionAddress(get('customer_id')),
    reservation_time: scValToU64(get('reservation_time')),
    party_size: scValToU32(get('party_size')),
    payment_amount: scValToI128(get('payment_amount')),
    payment_asset: scValToAddress(get('payment_asset')),
    status: scValToStatus(get('status')),
    loyalty_issued: scValToBool(get('loyalty_issued')),
  };
}

export default function CustomerPage() {
  const searchParams = useSearchParams();
  const reservationId = searchParams.get('reservationId');
  const [reservation, setReservation] = useState<any | null>(null);
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

  useEffect(() => {
    const fetchReservation = async () => {
      setLoading(true);
      setError(null);
      setReservation(null);
        console.log(reservationId);
      if (!reservationId) {
        setError('Rezervasyon ID bulunamadı!');
        setLoading(false);
        return;
      }

      try {
        // Kullanıcıdan cüzdan bağlantısı iste
        const { address } = await requestAccess();
        if (!address) {
          setError('Cüzdan bağlantısı gerekli!');
          setLoading(false);
          return;
        }
        setWalletAddress(address);

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
        console.debug('Simülasyon öncesi tx:', tx);
        let simResult;
        try {
          simResult = await server.simulateTransaction(tx);
          console.debug('Simülasyon sonucu:', simResult);
        } catch (simError) {
          const errorMsg = (simError && typeof simError === 'object' && 'message' in simError) ? (simError as any).message : String(simError);
          console.error('Simülasyon sırasında hata oluştu:', simError);
          console.error('Hata mesajı:', errorMsg);
          if (errorMsg.includes('invalid BigInt syntax')) {
            setError('Rezervasyon ID geçersiz veya sistemde bulunamadı.');
          } else {
            setError('Simülasyon sırasında hata oluştu: ' + errorMsg);
          }
          setLoading(false);
          return;
        }
        // Hem eski hem yeni SDK için reservation verisini bul
        let reservationData = null;
        if ('returnValue' in simResult && simResult.returnValue) {
          reservationData = simResult.returnValue;
        } else if ('result' in simResult && simResult.result && 'retval' in simResult.result) {
          reservationData = simResult.result.retval;
        }
        console.debug('Kontrattan gelen reservationData:', reservationData);
        const parsedReservation = parseReservation(reservationData, reservationId);
        console.debug('Parse edilen reservation:', parsedReservation);
        if (!parsedReservation) {
          setError('Rezervasyon bulunamadı veya silinmiş.');
          setLoading(false);
          return;
        }
        setReservation(parsedReservation);
      } catch (err: any) {
        setError('Rezervasyon çekilemedi: ' + (err.message || ''));
      } finally {
        setLoading(false);
      }
    };
    fetchReservation();
  }, [reservationId]);

  const handleConfirmationSuccess = () => {
    if (reservation) {
      setReservation({
        ...reservation,
        paymentStatus: 'completed',
        confirmationStatus: 'confirmed',
      });
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

  if (error || !reservation) {
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
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Rezervasyon Onayı</h1>
          <p className="text-xl text-gray-300">
            Rezervasyonunuzu onaylayın ve ödeme yapın
          </p>
        </div>

        <div className="bg-background-light rounded-xl p-6 shadow-lg">
          <ConfirmationDetails reservation={reservation} />
        </div>

        {reservation.status === 'Pending' && (
          <div className="bg-background-light rounded-xl p-6 shadow-lg mt-4">
            <PaymentSection 
              reservationId={reservation.reservationId}
              businessId={reservation.business_id}
              onSuccess={handleConfirmationSuccess}
            />
          </div>
        )}

        {reservation.confirmationStatus === 'confirmed' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
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
  );
} 