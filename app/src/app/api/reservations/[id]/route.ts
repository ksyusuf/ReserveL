import { NextResponse } from 'next/server';
import { connectDB, Reservation } from '@/lib/db';

// Bu route, belirli bir rezervasyonu ID ile getirmek için kullanılır:
// GET: URL parametresi olarak verilen ID ile rezervasyonu arar
// Rezervasyonu farklı alanlarda arar: reservationId, contractReservationId, blockchainReservationId
// Bulunan rezervasyonun tüm detaylarını döndürür

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const reservationId = params.id;
    
    // Rezervasyonu farklı alanlarda ara
    let reservation = await Reservation.findOne({ reservationId: reservationId });
    
    if (!reservation) {
      reservation = await Reservation.findOne({ contractReservationId: reservationId });
    }
    
    if (!reservation) {
      reservation = await Reservation.findOne({ blockchainReservationId: reservationId });
    }
    
    if (!reservation) {
      return NextResponse.json(
        { error: 'Rezervasyon bulunamadı' },
        { status: 404 }
      );
    }

    // Tüm rezervasyon verilerini döndür
    return NextResponse.json({
      reservation: {
        reservationId: reservation.reservationId,
        businessId: reservation.businessId,
        businessName: reservation.businessName,
        customerId: reservation.customerId,
        customerName: reservation.customerName,
        date: reservation.date,
        time: reservation.time,
        numberOfPeople: reservation.numberOfPeople,
        customerPhone: reservation.customerPhone,
        notes: reservation.notes,
        status: reservation.status,
        attendanceStatus: reservation.attendanceStatus,
        confirmationStatus: reservation.confirmationStatus,
        loyaltyTokensSent: reservation.loyaltyTokensSent,
        customerAddress: reservation.customerAddress,
        transactionHash: reservation.transactionHash,
        createdAt: reservation.createdAt,
        updatedAt: reservation.updatedAt
      }
    });
  } catch (error) {
    console.error('Rezervasyon getirme hatası:', error);
    return NextResponse.json(
      { error: 'Rezervasyon bilgileri alınırken bir hata oluştu' },
      { status: 500 }
    );
  }
} 