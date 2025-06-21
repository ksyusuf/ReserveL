import { NextResponse } from 'next/server';
import { connectDB, Reservation } from '@/lib/db';
import { generateReservationId, generateConfirmationToken, getRandomBusinessName } from '@/lib/utils';

// Bu route, rezervasyon sisteminin ana CRUD işlemlerini yönetir:
// POST: Yeni rezervasyon oluşturur (müşteri adı, telefon, tarih, saat, kişi sayısı, işletme ID gibi bilgilerle)
// GET: Tüm rezervasyonları listeler veya ID ile tek rezervasyon getirir
// PUT: Mevcut rezervasyonu günceller (sadece pending durumundaki rezervasyonları iptal edebilir)
// DELETE: Rezervasyonu kalıcı olarak siler

export async function POST(request: Request) {
  try {
    console.log('=== Rezervasyon Oluşturma Başladı ===');
    console.log('Veritabanına bağlanılıyor...');
    await connectDB();
    console.log('Veritabanı bağlantısı başarılı');
    
    const body = await request.json();
    console.log('Gelen rezervasyon verisi:', JSON.stringify(body, null, 2));
    
    // Gerekli alanların kontrolü
    const requiredFields = ['customerName', 'customerPhone', 'date', 'time', 'numberOfPeople', 'businessId', 'customerId'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      console.error('Eksik alanlar:', missingFields);
      return NextResponse.json(
        { error: `Eksik alanlar: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Veri doğrulama ve temizleme
    const reservationData = {
      customerName: body.customerName?.trim() || 'Müşteri Adı',
      customerPhone: body.customerPhone?.trim() || 'Telefon',
      date: body.date?.trim() || '',
      time: body.time?.trim() || '',
      numberOfPeople: parseInt(body.numberOfPeople) || 1,
      businessId: body.businessId?.trim() || '',
      customerId: body.customerId?.trim() || 'anonymous',
      notes: body.notes?.trim() || '',
      blockchainReservationId: body.blockchainReservationId || null,
      status: body.status || 'pending',
      attendanceStatus: body.attendanceStatus || 'not_arrived',
      confirmationStatus: body.confirmationStatus || 'pending',
      loyaltyTokensSent: body.loyaltyTokensSent || false,
      customerAddress: body.customerAddress || null,
      transactionHash: body.transactionHash || null,
    };

    console.log('Gelen body verisi:', JSON.stringify(body, null, 2));
    console.log('İşlenmiş reservationData:', JSON.stringify(reservationData, null, 2));

    // Tarih ve saat doğrulama
    if (reservationData.date) {
      const dateObj = new Date(reservationData.date);
      if (isNaN(dateObj.getTime())) {
        return NextResponse.json(
          { error: 'Geçersiz tarih formatı' },
          { status: 400 }
        );
      }
    }

    if (reservationData.time) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(reservationData.time)) {
        return NextResponse.json(
          { error: 'Geçersiz saat formatı (HH:MM olmalı)' },
          { status: 400 }
        );
      }
    }

    const confirmationToken = generateConfirmationToken();
    const confirmationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/confirm/${confirmationToken}`;
    
    // Rastgele işletme adı seç
    const randomBusinessName = getRandomBusinessName();
    
    const reservation = new Reservation({
      ...reservationData,
      reservationId: generateReservationId(),
      confirmationToken,
      businessName: randomBusinessName,
    });
    
    console.log('Oluşturulan rezervasyon objesi:', JSON.stringify(reservation, null, 2));
    console.log('Seçilen işletme adı:', randomBusinessName);
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
      { 
        error: error instanceof Error ? error.message : 'Rezervasyon oluşturulurken bir hata oluştu',
        details: error instanceof Error ? error.stack : undefined
      },
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
    
    // attendanceStatus alanını da dahil et
    const formattedReservations = reservations.map(reservation => ({
      reservationId: reservation.reservationId,
      customerName: reservation.customerName,
      customerPhone: reservation.customerPhone,
      date: reservation.date,
      time: reservation.time,
      numberOfPeople: reservation.numberOfPeople,
      attendanceStatus: reservation.attendanceStatus || 'not_arrived',
      confirmationStatus: reservation.confirmationStatus,
      loyaltyTokensSent: reservation.loyaltyTokensSent,
      businessId: reservation.businessId,
      customerId: reservation.customerId,
      notes: reservation.notes,
      status: reservation.status,
      createdAt: reservation.createdAt,
      updatedAt: reservation.updatedAt
    }));
    
    return NextResponse.json(formattedReservations);
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
    const updateData: any = {};
    
    // Mevcut rezervasyonu al
    const existingReservation = await Reservation.findOne({ reservationId: id });
    if (!existingReservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      );
    }
    
    // İptal işlemi - sadece pending durumundaki rezervasyonlar için
    if (body.confirmationStatus === 'cancelled') {
      // Sadece pending durumundaki rezervasyonları iptal et
      if (existingReservation.confirmationStatus === 'pending') {
        updateData.confirmationStatus = 'cancelled';
        updateData.status = 'cancelled';
      } else {
        return NextResponse.json(
          { error: 'Sadece onay bekleyen rezervasyonlar iptal edilebilir' },
          { status: 400 }
        );
      }
    }
    
    // Diğer alanları ekle
    Object.keys(body).forEach(key => {
      if (key !== 'confirmationStatus') {
        updateData[key] = body[key];
      }
    });
    
    // updatedAt alanını güncelle
    updateData.updatedAt = new Date();
    
    const reservation = await Reservation.findOneAndUpdate(
      { reservationId: id },
      { $set: updateData },
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