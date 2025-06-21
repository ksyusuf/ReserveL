import { NextResponse } from 'next/server';
import { connectDB, Reservation } from '@/lib/db';

// Bu route, e-posta ile gönderilen onay token'ı ile rezervasyon onaylama/iptal işlemlerini yapar:
// GET: Token ile rezervasyonu bulur ve onaylama sayfası için rezervasyon bilgilerini döndürür
// POST: Token ile rezervasyonu bulur ve action parametresine göre onaylar ('confirm') veya iptal eder ('cancel')
// Sadece pending durumundaki rezervasyonlar işlenebilir
// Onaylandığında confirmationStatus 'confirmed', iptal edildiğinde 'cancelled' olur

export async function GET(request: Request, { params }: { params: { token: string } }) {
  try {
    console.log('Rezervasyon onaylama başladı, token:', params.token);
    await connectDB();
    
    const reservation = await Reservation.findOne({ confirmationToken: params.token });
    
    if (!reservation) {
      return NextResponse.json(
        { error: 'Rezervasyon bulunamadı' },
        { status: 404 }
      );
    }

    if (reservation.confirmationStatus === 'confirmed') {
      return NextResponse.json(
        { error: 'Rezervasyon zaten onaylanmış' },
        { status: 400 }
      );
    }

    if (reservation.confirmationStatus === 'cancelled') {
      return NextResponse.json(
        { error: 'Rezervasyon iptal edilmiş' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'Rezervasyon bulundu',
      reservation: reservation
    });
  } catch (error) {
    console.error('Rezervasyon onaylama hatası:', error);
    return NextResponse.json(
      { error: 'Rezervasyon onaylanırken bir hata oluştu' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: { params: { token: string } }) {
  try {
    console.log('Rezervasyon onaylama işlemi başladı, token:', params.token);
    await connectDB();
    
    const body = await request.json();
    const { action } = body; // 'confirm' veya 'cancel'
    
    const reservation = await Reservation.findOne({ confirmationToken: params.token });
    
    if (!reservation) {
      return NextResponse.json(
        { error: 'Rezervasyon bulunamadı' },
        { status: 404 }
      );
    }

    if (reservation.confirmationStatus === 'confirmed') {
      return NextResponse.json(
        { error: 'Rezervasyon zaten onaylanmış' },
        { status: 400 }
      );
    }

    if (reservation.confirmationStatus === 'cancelled') {
      return NextResponse.json(
        { error: 'Rezervasyon iptal edilmiş' },
        { status: 400 }
      );
    }

    const newStatus = action === 'confirm' ? 'confirmed' : 'cancelled';
    reservation.confirmationStatus = newStatus;
    await reservation.save();

    return NextResponse.json({
      message: `Rezervasyon ${action === 'confirm' ? 'onaylandı' : 'iptal edildi'}`,
      reservation: reservation
    });
  } catch (error) {
    console.error('Rezervasyon onaylama hatası:', error);
    return NextResponse.json(
      { error: 'Rezervasyon onaylanırken bir hata oluştu' },
      { status: 500 }
    );
  }
} 