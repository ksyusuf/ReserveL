import { NextResponse } from 'next/server';
import { connectDB, Reservation } from '@/lib/db';

// Bu route, rezervasyon onaylama işlemini blockchain entegrasyonu ile yapar:
// POST: Rezervasyonu onaylar ve blockchain bilgilerini (customerAddress, transactionHash) kaydeder
// Rezervasyonu farklı ID türlerinde arar: reservationId, contractReservationId, blockchainReservationId
// Sadece pending durumundaki rezervasyonlar onaylanabilir
// Onaylandığında confirmationStatus 'confirmed', status 'confirmed', attendanceStatus 'not_arrived' olur

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reservationId, customerAddress, transactionHash } = body;

    if (!reservationId || !customerAddress) {
      return NextResponse.json(
        { error: 'Rezervasyon ID ve müşteri adresi gerekli' },
        { status: 400 }
      );
    }

    // Veritabanına bağlan
    await connectDB();

    // Rezervasyonu farklı alanlarda ara
    let reservation = await Reservation.findOne({ reservationId: reservationId });
    
    if (!reservation) {
      console.log('reservationId ile bulunamadı, contractReservationId ile aranıyor...');
      reservation = await Reservation.findOne({ contractReservationId: reservationId });
    }
    
    if (!reservation) {
      console.log('contractReservationId ile bulunamadı, blockchainReservationId ile aranıyor...');
      reservation = await Reservation.findOne({ blockchainReservationId: reservationId });
    }
    
    if (!reservation) {
      console.log('Tüm arama yöntemleri başarısız oldu');
      console.log('Aranan reservationId:', reservationId);
      console.log('Aranan reservationId tipi:', typeof reservationId);
      return NextResponse.json(
        { error: 'Rezervasyon bulunamadı' },
        { status: 404 }
      );
    }

    // Rezervasyon durumunu kontrol et
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

    // Rezervasyon durumunu güncelle
    const updatedReservation = await Reservation.findOneAndUpdate(
      { _id: reservation._id },
      {
        $set: {
          confirmationStatus: 'confirmed',
          attendanceStatus: 'not_arrived',
          status: 'confirmed',
          customerId: customerAddress,
          customerAddress: customerAddress,
          transactionHash: transactionHash,
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    return NextResponse.json({
      message: 'Rezervasyon başarıyla onaylandı',
      reservation: updatedReservation,
      status: 'confirmed'
    });

  } catch (error) {
    console.error('Rezervasyon onaylama hatası:', error);
    return NextResponse.json(
      { error: 'Rezervasyon onaylanırken bir hata oluştu' },
      { status: 500 }
    );
  }
} 