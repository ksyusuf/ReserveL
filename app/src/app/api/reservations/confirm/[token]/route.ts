import { NextResponse } from 'next/server';
import { connectDB, Reservation } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    await connectDB();
    
    const reservation = await Reservation.findOne({ confirmationToken: params.token });
    
    if (!reservation) {
      return NextResponse.json(
        { error: 'Rezervasyon bulunamadı' },
        { status: 404 }
      );
    }

    // Rezervasyon zaten onaylanmışsa hata döndür
    if (reservation.confirmationStatus === 'confirmed') {
      return NextResponse.json(
        { error: 'Bu rezervasyon zaten onaylanmış' },
        { status: 400 }
      );
    }

    // Rezervasyon iptal edilmişse hata döndür
    if (reservation.confirmationStatus === 'cancelled') {
      return NextResponse.json(
        { error: 'Bu rezervasyon iptal edilmiş' },
        { status: 400 }
      );
    }

    return NextResponse.json(reservation);
  } catch (error) {
    console.error('Rezervasyon getirme hatası:', error);
    return NextResponse.json(
      { error: 'Rezervasyon bilgileri alınırken bir hata oluştu' },
      { status: 500 }
    );
  }
} 