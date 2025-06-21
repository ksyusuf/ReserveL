import { NextResponse } from 'next/server';
import { connectDB, Reservation } from '@/lib/db';

// Bu route, onaylanmış (confirmed) rezervasyonları iptal etmek için kullanılır:
// POST: Onaylanmış bir rezervasyonu iptal eder
// Sadece confirmationStatus'u 'confirmed' olan rezervasyonlar iptal edilebilir
// İptal edildiğinde status 'cancelled', attendanceStatus 'not_arrived' olur
// confirmationStatus 'confirmed' olarak kalır (onaylanmış durumu korunur)

// burası, onaylanmış bir rezervasyonun iptal edilmesi durumunu kontrol eder.
export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const { reservationId } = body;
    
    if (!reservationId) {
      return NextResponse.json(
        { error: 'Rezervasyon ID gerekli' },
        { status: 400 }
      );
    }
    
    // Mevcut rezervasyonu al
    const existingReservation = await Reservation.findOne({ reservationId });
    if (!existingReservation) {
      return NextResponse.json(
        { error: 'Rezervasyon bulunamadı' },
        { status: 404 }
      );
    }
    
    // Sadece onaylanmış rezervasyonları iptal etmeye izin ver
    if (existingReservation.confirmationStatus !== 'confirmed') {
      return NextResponse.json(
        { error: 'Sadece onaylanmış rezervasyonlar iptal edilebilir' },
        { status: 400 }
      );
    }
    
    // Onaylanmış rezervasyonu iptal et
    // confirmationStatus confirmed kalır, status cancelled olur, attendanceStatus not_arrived olur
    const updatedReservation = await Reservation.findOneAndUpdate(
      { reservationId },
      {
        $set: {
          status: 'cancelled',
          attendanceStatus: 'not_arrived',
          updatedAt: new Date()
        }
      },
      { new: true }
    );
    
    if (!updatedReservation) {
      return NextResponse.json(
        { error: 'Rezervasyon güncellenirken hata oluştu' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      message: 'Onaylanmış rezervasyon başarıyla iptal edildi',
      reservation: updatedReservation
    });
    
  } catch (error) {
    console.error('Onaylanmış rezervasyon iptal hatası:', error);
    return NextResponse.json(
      { error: 'Rezervasyon iptal edilirken bir hata oluştu' },
      { status: 500 }
    );
  }
} 