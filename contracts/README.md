
<div align="center">
  <a href="https://stellar.org/"><img src="../app/public/Stellar-Logo.png" alt="Rise In" width="170"/></a>
  
  <h1>ReserveL Akıllı Kontrat</h1>
  <p><b>Rezervasyonlara sadakat, Web3 ile güvence altında!</b></p>
</div>

ReserveL, işletmelerin rezervasyonlarına gelmeyen müşterilerden kaynaklı maddi kayıplarını azaltmak için geliştirilmiş, Stellar Soroban üzerinde çalışan bir akıllı kontrattır. Rezervasyon süreçlerini şeffaf, güvenli ve otomatik hale getirir.

---

## Ekosistem Hakkında Kısa Bilgi

Bu kontrat, <b>Stellar Soroban</b> akıllı kontrat platformunda çalışır. Soroban, Stellar ağı üzerinde merkeziyetsiz uygulamalar geliştirmek için modern, hızlı ve güvenli bir altyapı sunar. ReserveL kontratı, rezervasyon ve ödül süreçlerini zincir üzerinde yönetir ve tüm işlemler şeffaf şekilde izlenebilir.

Kullanıcılar, cüzdanlarıyla etkileşime geçerek rezervasyon oluşturabilir, işletmeler ise sadakat token'ları ile ödüllendirme yapabilir. Tüm işlemler testnet ortamında denenebilir.


## Gereksinimler

- Rust & Cargo
- Soroban CLI (v22.8.1+)
- WSL (Windows için, önerilir)


## Hızlı Başlangıç

1. **Test Hesabı Oluşturun:**
  ```bash
  stellar keys generate alice
  stellar keys fund alice
  stellar keys show alice
  ```
2. **Kontratı Derleyin:**
  ```bash
  rm -rf target/
  stellar contract build
  ```
3. **Kontratı Deploy Edin:**
  ```bash
  stellar contract deploy \
    --wasm target/wasm32v1-none/release/reservel_contract.wasm \
    --source alice \
    --network testnet
  ```
  Başarılı deploy sonrası terminalde kontrat ID'si gözükecektir. Bu ID ile kontratınızı yönetebilirsiniz. App environment'i içeriindeki kontrat id alanını düzenlemeyi unutmayın.


## Kontrat ID

Örnek:
```
CASQJSF3PG6MTCVMHXRN5AZZFGEB7J4LMPVYVHCDZ3BYAPPRAAXBU2AM
```


## Kontrat İşlemleri & Örnek Çağrılar

Kontratı test etmek ve işlemler yapmak için [Stellar Expert](https://stellar.expert/explorer/testnet/contract/CASQJSF3PG6MTCVMHXRN5AZZFGEB7J4LMPVYVHCDZ3BYAPPRAAXBU2AM) üzerinden kontrat adresini inceleyebilirsiniz.

[https://stellar.expert/explorer/testnet/contract/CASQJSF3PG6MTCVMHXRN5AZZFGEB7J4LMPVYVHCDZ3BYAPPRAAXBU2AM](https://stellar.expert/explorer/testnet/contract/CASQJSF3PG6MTCVMHXRN5AZZFGEB7J4LMPVYVHCDZ3BYAPPRAAXBU2AM)

### Kontratı Başlatma (initialize)
```bash
stellar contract invoke \
  --id CASQJSF3PG6MTCVMHXRN5AZZFGEB7J4LMPVYVHCDZ3BYAPPRAAXBU2AM \
  --source-account alice \
  --network testnet \
  -- initialize \
  --owner alice \
  --loyalty-token-id CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
```


#### Diğer Örnek Çağrılar
```bash
# İşletme bilgisi sorgulama
stellar contract invoke \
  --id CASQJSF3PG6MTCVMHXRN5AZZFGEB7J4LMPVYVHCDZ3BYAPPRAAXBU2AM \
  --source-account alice \
  --network testnet \
  -- get_business \
  --business_name "yusuf"

# İşletme kaydı
stellar contract invoke \
  --id CASQJSF3PG6MTCVMHXRN5AZZFGEB7J4LMPVYVHCDZ3BYAPPRAAXBU2AM \
  --source-account alice \
  --network testnet \
  -- register_business \
  --business_name "alice" \
  --wallet_address alice
```

---


## Kontratta Bulunan Fonksiyonlar

- **initialize**: Kontratı başlatır ve sahibi ile sadakat token adresini ayarlar.
- **create_loyalty_token**: İşletme sahibi tarafından sadakat (loyalty) token'ı oluşturur.
- **create_reservation**: Yeni bir rezervasyon oluşturur.
- **confirm_reservation**: Rezervasyonu müşteri tarafından onaylar ve ödemeyi işletmeye aktarır.
- **update_reservation_status**: Rezervasyonun durumunu (Completed, NoShow, Cancelled) günceller.
- **get_reservation**: Belirli bir rezervasyonun detaylarını getirir.
- **get_loyalty_token_id**: Kontrata kayıtlı sadakat token adresini döndürür.
- **get_owner**: Kontrat sahibinin adresini döndürür.
- **register_business**: Yeni bir işletme kaydı oluşturur.
- **get_business**: İşletme adı ile kayıtlı işletme bilgilerini getirir.

Her fonksiyonun detaylı kullanımı ve parametreleri için kontrat koduna bakabilirsiniz.

---


## Önemli Notlar

1. Her deploy işleminden önce kontratı yeniden build etmeyi unutmayın.
2. Test hesabınızın yeterli XLM'ye sahip olduğundan emin olun.
3. Kontrat ID'sini güvenli bir yerde saklayın.
4. WSL üzerinde çalışırken Windows dizinlerine `/mnt/c/...` şeklinde erişebilirsiniz.
