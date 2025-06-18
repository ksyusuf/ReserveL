import { NextResponse } from 'next/server';
import { connectDB, Reservation } from '@/lib/db';
import { generateReservationId, generateConfirmationToken } from '@/lib/utils';

export async function POST(request: Request) {
  try {
    console.log('=== Rezervasyon Oluşturma Başladı ===');
    console.log('Veritabanına bağlanılıyor...');
    await connectDB();
    console.log('Veritabanı bağlantısı başarılı');
    
    const body = await request.json();
    console.log('Gelen rezervasyon verisi:', JSON.stringify(body, null, 2));
    
    const confirmationToken = generateConfirmationToken();
    const confirmationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/confirm/${confirmationToken}`;
    
    const reservation = new Reservation({
      ...body,
      reservationId: generateReservationId(),
      confirmationToken,
    });
    
    console.log('Oluşturulan rezervasyon objesi:', JSON.stringify(reservation, null, 2));
    console.log('Rezervasyon kaydediliyor...');
    
    await reservation.save();
    
    console.log('Rezervasyon başarıyla kaydedildi');
    console.log('=== Rezervasyon Oluşturma Tamamlandı ===');
    
    return NextResponse.json({
      ...reservation.toObject(),
      confirmationUrl,
    }, { status: 201 });
  } catch (error) {
    console.error('=== Rezervasyon Oluşturma Hatası ===');
    console.error('Hata detayı:', error);
    console.error('Hata stack:', error instanceof Error ? error.stack : 'Stack trace yok');
    console.error('=== Hata Detayları Sonu ===');
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Rezervasyon oluşturulurken bir hata oluştu' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    console.log('Connecting to database for GET request...'); // Debug için
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (id) {
      console.log('Fetching reservation with ID:', id); // Debug için
      const reservation = await Reservation.findOne({ reservationId: id });
      if (!reservation) {
        return NextResponse.json(
          { error: 'Rezervasyon bulunamadı' },
          { status: 404 }
        );
      }
      return NextResponse.json(reservation);
    }
    
    console.log('Fetching all reservations...'); // Debug için
    const reservations = await Reservation.find().sort({ createdAt: -1 });
    console.log('Found reservations:', reservations.length); // Debug için
    
    return NextResponse.json(reservations);
  } catch (error) {
    console.error('Reservation retrieval error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Rezervasyonlar yüklenirken bir hata oluştu' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Reservation ID is required' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const reservation = await Reservation.findOneAndUpdate(
      { reservationId: id },
      { $set: body },
      { new: true }
    );
    
    if (!reservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(reservation);
  } catch (error) {
    console.error('Reservation update error:', error);
    return NextResponse.json(
      { error: 'Failed to update reservation' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Reservation ID is required' },
        { status: 400 }
      );
    }
    
    const reservation = await Reservation.findOneAndDelete({ reservationId: id });
    
    if (!reservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Reservation deleted successfully' });
  } catch (error) {
    console.error('Reservation deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete reservation' },
      { status: 500 }
    );
  }
} 