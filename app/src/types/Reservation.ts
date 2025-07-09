export interface Reservation {
  reservationId: string;
  customerName: string;
  customerPhone: string;
  date: string;
  time: string;
  numberOfPeople: number;
  attendanceStatus: 'not_arrived' | 'arrived' | 'no_show';
  confirmationStatus: 'pending' | 'confirmed' | 'cancelled';
  loyaltyTokensSent: boolean;
  blockchainReservationId: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
} 