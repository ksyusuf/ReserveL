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
soroban keys generate test1

# Hesabın public key'ini al
TEST_ADDRESS=$(soroban keys address test1)

# Hesabı test tokenleri ile fonla
curl "https://friendbot.stellar.org/?addr=$TEST_ADDRESS"

# Hesap bilgilerini kontrol et
soroban keys show test1
```

### 2. Kontratı Build Etme

```bash
# Eski build dosyalarını temizle
rm -rf target/

# Kontratı build et
soroban contract build
```

### 3. Kontratı Deploy Etme

```bash
soroban contract deploy \
    --wasm target/wasm32v1-none/release/reservel_contract.wasm \
    --source test1 \
    --network testnet
```

Deploy işlemi başarılı olduğunda, terminal size bir kontrat ID'si verecektir. Bu ID'yi not alın, kontratınızla etkileşime geçmek için buna ihtiyacınız olacak.

## Kontrat ID

```
CDHFV27NLOSUEIT7VF5QTQZKEQCWDVTGXLAUEQEOZBT7AVLZJEIBRJGF
```

## Kontrat İşlemleri

Kontratı test etmek ve işlemler yapmak için Stellar Expert üzerinden kontrat adresini kontrol edebilirsiniz:
https://stellar.expert/explorer/testnet/contract/CDHFV27NLOSUEIT7VF5QTQZKEQCWDVTGXLAUEQEOZBT7AVLZJEIBRJGF

## Önemli Notlar

1. Her deploy işleminden önce kontratı yeniden build etmeyi unutmayın.
2. Test hesabınızın yeterli XLM'ye sahip olduğundan emin olun.
3. Kontrat ID'sini güvenli bir yerde saklayın.
4. WSL üzerinde çalışırken Windows dizinlerine `/mnt/c/...` şeklinde erişebilirsiniz. 