import { NextResponse } from 'next/server';
import { connectDB, Reservation } from '@/lib/db';

// Bu route, onay bekleyen (pending) rezervasyonları onaylamak için kullanılır:
// POST: Pending durumundaki bir rezervasyonu confirmed durumuna geçirir
// Sadece confirmationStatus'u 'pending' olan rezervasyonlar onaylanabilir
// Onaylandığında status 'confirmed', attendanceStatus 'not_arrived' olur

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
    
    // Sadece pending durumundaki rezervasyonları onaylamaya izin ver
    if (existingReservation.confirmationStatus !== 'pending') {
      return NextResponse.json(
        { error: 'Sadece onay bekleyen rezervasyonlar onaylanabilir' },
        { status: 400 }
      );
    }
    
    // Pending rezervasyonu onayla
    const updatedReservation = await Reservation.findOneAndUpdate(
      { reservationId },
      {
        $set: {
          confirmationStatus: 'confirmed',
          status: 'confirmed',
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
      message: 'Rezervasyon başarıyla onaylandı',
      reservation: updatedReservation
    });
    
  } catch (error) {
    console.error('Rezervasyon onaylama hatası:', error);
    return NextResponse.json(
      { error: 'Rezervasyon onaylanırken bir hata oluştu' },
      { status: 500 }
    );
  }
} 