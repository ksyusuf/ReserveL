import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

// Statik işletme adları listesi
export const BUSINESS_NAMES = [
  'Le Petit Bistrot',
  'Sakura Sushi Bar',
  'Terraza Mediterranea',
  'Golden Dragon Restaurant',
  'Café de Paris'
];

// Rastgele işletme adı seçen fonksiyon
export const getRandomBusinessName = (): string => {
  const randomIndex = Math.floor(Math.random() * BUSINESS_NAMES.length);
  return BUSINESS_NAMES[randomIndex];
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
    let dateObj: Date;
    
    if (typeof date === 'string') {
      // Eğer date string formatında ise (YYYY-MM-DD)
      if (date.includes('-')) {
        dateObj = new Date(date);
      } else {
        // Eğer timestamp veya başka bir format ise
        dateObj = new Date(date);
      }
    } else {
      dateObj = date;
    }
    
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
  
  try {
    // Eğer time zaten HH:MM formatında ise
    if (time.includes(':')) {
      const [hours, minutes] = time.split(':');
      return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
    }
    
    // Eğer time başka bir format ise, Date objesi olarak parse etmeye çalış
    const dateObj = new Date(`2000-01-01T${time}`);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    }
    
    return time;
  } catch (error) {
    return 'Belirtilmemiş';
  }
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