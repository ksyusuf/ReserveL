# ReserveL Smart Contract

Bu dizin, ReserveL projesinin Stellar Soroban akıllı kontratını içerir.

## Gereksinimler

- Rust ve Cargo
- Soroban CLI (sürüm 22.8.1 veya üzeri)
- WSL (Windows için)

## Build ve Deploy Süreci

### 1. Test Hesabı Oluşturma

```bash
# Test hesabı oluştur
stellar keys generate alice

# Hesabı test tokenleri ile fonla
stellar keys fund alice

# Hesap bilgilerini kontrol et (secret key)
stellar keys show alice
```

### 2. Kontratı Build Etme

```bash
# Eski build dosyalarını temizle
rm -rf target/

# Kontratı build et
stellar contract build
```

### 3. Kontratı Deploy Etme

```bash
stellar contract deploy \
  --wasm target/wasm32v1-none/release/reservel_contract.wasm \
  --source alice \
  --network testnet
```

Deploy işlemi başarılı olduğunda, terminal size bir kontrat ID'si verecektir. Bu ID'yi not alın, kontratınızla etkileşime geçmek için buna ihtiyacınız olacak.

## Kontrat ID

```
CACV2ECSIDU37E5OD3X6NEQ4C7QXER3MRVPWNIISB5PV6NDKM7OP3U7I
```

## Kontrat İşlemleri

Kontratı test etmek ve işlemler yapmak için Stellar Expert üzerinden kontrat adresini kontrol edebilirsiniz:
https://stellar.expert/explorer/testnet/contract/CACV2ECSIDU37E5OD3X6NEQ4C7QXER3MRVPWNIISB5PV6NDKM7OP3U7I

### 4. Kontratı init Etme (initialize)
```bash
stellar keys fund alice

stellar contract invoke \
  --id CACV2ECSIDU37E5OD3X6NEQ4C7QXER3MRVPWNIISB5PV6NDKM7OP3U7I \
  --source-account alice \
  --network testnet \
  -- initialize \
  --owner alice \
  --loyalty-token-id CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
```

get business
stellar contract invoke \
  --id CACV2ECSIDU37E5OD3X6NEQ4C7QXER3MRVPWNIISB5PV6NDKM7OP3U7I \
  --source-account alice \
  --network testnet \
  -- get_business \
  --business_name "yusuf"

register business
stellar contract invoke \
  --id CACV2ECSIDU37E5OD3X6NEQ4C7QXER3MRVPWNIISB5PV6NDKM7OP3U7I \
  --source-account alice \
  --network testnet \
  -- register_business \
  --business_name "alice" \
  --wallet_address alice

## Önemli Notlar

1. Her deploy işleminden önce kontratı yeniden build etmeyi unutmayın.
2. Test hesabınızın yeterli XLM'ye sahip olduğundan emin olun.
3. Kontrat ID'sini güvenli bir yerde saklayın.
4. WSL üzerinde çalışırken Windows dizinlerine `/mnt/c/...` şeklinde erişebilirsiniz. 

stellar cli ile örnek deploy;

stellar contract invoke \
  --id CACV2ECSIDU37E5OD3X6NEQ4C7QXER3MRVPWNIISB5PV6NDKM7OP3U7I \
  --network testnet \
  --source-account alice \
  -- create_reservation \
    --business_id GC5D6JM4YP3CEZNUZ6FMDD4L26XVUO3GKLCU4SHAYNRTMRWB6FMYRKBC \
    --reservation_time 1730000000 \
    --party_size 2 \
    --payment_amount 10000000 \
    --payment_asset GC5D6JM4YP3CEZNUZ6FMDD4L26XVUO3GKLCU4SHAYNRTMRWB6FMYRKBC

cli ile deploy;
stellar contract deploy   --wasm target/wasm32v1-none/release/reservel_contract.wasm   --network testnet --source-account SDBCUEVN5ITAW2UFXMB5RMQBPWBAZMELQU7LHTPXLLB6EFXISUO3LGHA