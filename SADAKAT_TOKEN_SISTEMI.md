# ReserveL Sadakat Token Sistemi

## Genel Bakış

ReserveL projesi, müşterilerin rezervasyon yapması ve işletmelerin bu rezervasyonları yönetmesi için Stellar blockchain üzerinde çalışan bir sistemdir. Müşteri rezervasyona geldiğinde, otomatik olarak sadakat token'ları verilir.

## Sistem Mimarisi

### 1. Smart Contract (Soroban)
- **Dosya**: `contracts/src/lib.rs`
- **Fonksiyon**: `update_reservation_status`
- **Token Miktarı**: 100 token (1,000,000,000 stroops)
- **Durum**: `Completed` olarak işaretlendiğinde otomatik token transferi

### 2. Frontend (Next.js)
- **Business Dashboard**: `app/src/app/business-dashboard/page.tsx`
- **Reservation List**: `app/src/components/business/ReservationList.tsx`
- **Customer Page**: `app/src/app/customer-page/page.tsx`

### 3. Backend (API Routes)
- **Update Attendance**: `app/src/app/api/reservations/update-attendance/route.ts`
- **Database**: MongoDB ile rezervasyon takibi

## Sadakat Token Süreci

### Adım 1: Rezervasyon Oluşturma
1. İşletme rezervasyon oluşturur
2. Kontrat üzerinde `create_reservation` çağrılır
3. Rezervasyon `Pending` durumunda başlar

### Adım 2: Müşteri Onayı
1. Müşteri rezervasyonu onaylar
2. `confirm_reservation` fonksiyonu çağrılır
3. Rezervasyon `Confirmed` durumuna geçer

### Adım 3: Müşteri Gelme Durumu
1. İşletme "Geldi" butonuna tıklar
2. `update-attendance` API'si çağrılır
3. `attendanceStatus` = 'arrived' olarak güncellenir
4. `status` = 'completed' olarak güncellenir

### Adım 4: Sadakat Token Transferi
1. Frontend'den `updateContractStatus` fonksiyonu çağrılır
2. Kontrat üzerinde `update_reservation_status` fonksiyonu çağrılır
3. Durum `Completed` olarak güncellenir
4. Kontrat otomatik olarak 100 token'ı müşteri cüzdanına transfer eder
5. `loyalty_issued` = true olarak işaretlenir


## Kullanıcı Arayüzü

### İşletme Dashboard
- Rezervasyon listesi
- "Geldi" butonu (sadakat token'ı tetikler)
- Token durumu göstergesi (🎁 Token Verildi / ⏳ Token Bekliyor)
- Loading durumu ("Token Veriliyor...")

### Müşteri Sayfası
- Rezervasyon detayları
- Sadakat token durumu (🎁 100 Token Verildi / ⏳ Token Bekliyor)
- Blockchain durumu

## Güvenlik Önlemleri

1. **Yetkilendirme**: Sadece işletme sahibi kontrat durumunu güncelleyebilir
2. **Tekrar Önleme**: `loyalty_issued` flag'i ile token'ın tekrar verilmesi engellenir
3. **Durum Kontrolü**: Sadece `Confirmed` durumundaki rezervasyonlar `Completed` olabilir

## Hata Yönetimi

1. **Cüzdan Bağlantısı**: Freighter cüzdanı gerekli
2. **Network Hataları**: Soroban RPC bağlantı hataları yakalanır
3. **Kontrat Hataları**: Kontrat fonksiyon çağrı hataları loglanır
4. **UI Feedback**: Kullanıcıya hata mesajları gösterilir

## Test Senaryoları

1. **Normal Akış**: Müşteri gelir → Token verilir
2. **No Show**: Müşteri gelmez → Token verilmez
3. **Tekrar Deneme**: Aynı rezervasyon için tekrar token verilmez
4. **Network Hataları**: Bağlantı sorunları durumunda retry mekanizması

## Gelecek Geliştirmeler

1. **Token Miktarı Ayarlanabilir**: İşletme bazında token miktarı
2. **Tier Sistemi**: Farklı sadakat seviyeleri
3. **Token Kullanımı**: Token'ların işletmede kullanılması
4. **Analytics**: Token verilme istatistikleri
5. **Bildirimler**: Email/SMS ile token bildirimi 


## Teknik Detaylar

### Kontrat Fonksiyonu
```rust
pub fn update_reservation_status(env: Env, reservation_id: u64, new_status: ReservationStatus) {
    // ... kontrat kodu ...
    match new_status {
        ReservationStatus::Completed => {
            if !reservation.loyalty_issued {
                let loyalty_key = Symbol::new(&env, "loyalty");
                let loyalty_token_id: Address = env.storage().instance().get(&loyalty_key).expect(" Loyalty token not set");
                // Token client'ını oluştur
                let loyalty_client = token::Client::new(&env, &loyalty_token_id);
                // Miktar belirle
                let loyalty_amount: i128 = 100 * 10i128.pow(7); // 100 token
                let business = reservation.business_id.clone();
                business.require_auth();
                // Müşteri adresini kontrol et
                let customer = reservation.customer_id.clone();
                let customer = customer.unwrap();
                // Sadakat token'larını müşteriye aktar
                loyalty_client.transfer(&business, &customer, &loyalty_amount);
                reservation.loyalty_issued = true;
            }
            reservation.status = new_status.clone();
        }
        // ... diğer durumlar ...
    }
}
```

### Frontend Kontrat Etkileşimi
```typescript
export async function updateReservationStatusOnContract(reservationId: number, newStatus: 'Completed' | 'NoShow') {
  try {
    const { address } = await requestAccess();
    if (!address) throw new Error('Cüzdan bağlantısı gerekli');
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
          function: 'update_reservation_status',
          args: [
            nativeToScVal(reservationId, { type: 'u64' }),
            nativeToScVal(newStatus, { type: 'symbol' })
          ],
        })
      )
      .setTimeout(60)
      .build();
    const simResult: any = await server.simulateTransaction(tx);
    if (typeof simResult.error === 'string') {
      const errorCode = extractErrorCode(simResult.error);
      if (errorCode !== undefined) {
        const errorMsg = contractErrorMessages[errorCode as ContractError] ?? 'Bilinmeyen kontrat hatası';
        return { success: false, error: errorMsg, code: errorCode };
      }
    }
    const assembledTx = rpc.assembleTransaction(tx, simResult);
    const xdr = assembledTx.build().toXDR();
    const { signedTxXdr } = await signTransaction(xdr, {
      networkPassphrase: Networks.TESTNET,
    });
    const signedTx = TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET);
    const txResponse = await server.sendTransaction(signedTx);
    let finalResult = await CustomPollTransaction(txResponse.hash);

    if (finalResult && finalResult.data.result.status === 'SUCCESS') {
      return { success: true, hash: txResponse.hash };
    }else{
      console.error('İşlem zaman aşımına uğradı veya başarıyla tamamlanamadı.');
      return { success: false, hash: txResponse.hash };
    }

  } catch (error) {
    console.error('❌ updateReservationStatusOnContract hatası:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Bilinmeyen hata' };
  }
}
```
