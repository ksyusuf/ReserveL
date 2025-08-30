// Kontrat hata kodları enum'u (frontend için)
export enum ContractError {
  AlreadyInitialized = 1001,
  BusinessAlreadyRegistered = 1002,
  BusinessNotFound = 1003,
  Unauthorized = 1004,
}

// Hata kodu → Türkçe açıklama eşlemesi
export const contractErrorMessages: Record<ContractError, string> = {
  [ContractError.AlreadyInitialized]: "Kontrat zaten başlatılmış.",
  [ContractError.BusinessAlreadyRegistered]: "Bu işletme adı zaten kayıtlı.",
  [ContractError.BusinessNotFound]: "İşletme bulunamadı.",
  [ContractError.Unauthorized]: "Yetkisiz işlem.",
};

// Hata kodunu Türkçeye çeviren fonksiyon
export function getContractErrorMessage(errorCode: number): string {
  return contractErrorMessages[errorCode as ContractError] || "Bilinmeyen kontrat hatası";
}