import { NextResponse } from 'next/server';
import { connectDB, Reservation } from '@/lib/db';

// Bu route, rezervasyonların gelme durumunu (attendance) güncellemek için kullanılır:
// POST: Rezervasyonun gelme durumunu günceller (not_arrived, arrived, no_show)
// arrived: Müşteri geldiğinde status 'completed' olur
// no_show: Müşteri gelmediğinde confirmationStatus 'cancelled', status 'cancelled' olur
// not_arrived: Varsayılan durum, herhangi bir değişiklik yapmaz

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const { reservationId, attendanceStatus } = body;
    
    if (!reservationId || !attendanceStatus) {
      return NextResponse.json(
        { error: 'Rezervasyon ID ve gelme durumu gerekli' },
        { status: 400 }
      );
    }
    
    const validStatuses = ['not_arrived', 'arrived', 'no_show'];
    if (!validStatuses.includes(attendanceStatus)) {
      return NextResponse.json(
        { error: 'Geçersiz gelme durumu' },
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
    
    const updateData: any = {
      attendanceStatus,
      updatedAt: new Date()
    };
    
    // Geldi olarak işaretlendiğinde
    if (attendanceStatus === 'arrived') {
      updateData.status = 'completed';
    }
    
    // Gelmedi olarak işaretlendiğinde
    if (attendanceStatus === 'no_show') {
      updateData.confirmationStatus = 'cancelled';
      updateData.status = 'cancelled';
    }
    
    const updatedReservation = await Reservation.findOneAndUpdate(
      { reservationId },
      { $set: updateData },
      { new: true }
    );
    
    if (!updatedReservation) {
      return NextResponse.json(
        { error: 'Rezervasyon güncellenirken hata oluştu' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      message: 'Gelme durumu başarıyla güncellendi',
      reservation: updatedReservation
    });
    
  } catch (error) {
    console.error('Gelme durumu güncelleme hatası:', error);
    return NextResponse.json(
      { error: 'Gelme durumu güncellenirken bir hata oluştu' },
      { status: 500 }
    );
  }
} 