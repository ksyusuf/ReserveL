import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

export const generateReservationId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `RES-${timestamp}-${randomStr}`.toUpperCase();
};

export const generateConfirmationToken = (): string => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `CONF-${timestamp}-${randomStr}`.toUpperCase();
};

export const formatDate = (date: Date | string | undefined | null): string => {
  if (!date) return 'Belirtilmemiş';
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'Geçersiz tarih';
    return dateObj.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (error) {
    return 'Geçersiz tarih';
  }
};

export const formatTime = (time: string | undefined | null): string => {
  if (!time) return 'Belirtilmemiş';
  const [hours, minutes] = time.split(':');
  return `${hours}:${minutes}`;
};

export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^(\+90|0)?[0-9]{10}$/;
  return phoneRegex.test(phone.replace(/\s+/g, ''));
};

export const calculateLoyaltyTokens = (amount: number): number => {
  // 1 token per 100 units of currency
  return Math.floor(amount / 100);
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
}; 