import { NextResponse } from 'next/server';
import { connectDB, Reservation } from '@/lib/db';

// Bu route, bildirim sistemi için kullanılır:
// GET: Onay bekleyen (pending) rezervasyonları bildirim olarak listeler
// POST: Yeni bildirim oluşturur ve gönderir (şu anda sadece log kaydı tutar)
// Bildirim sistemi için temel altyapıyı sağlar

interface Notification {
  id: string;
  userId: string;
  type: string;
  message: string;
  reservationId?: string;
  createdAt: Date;
}

export async function GET(request: Request) {
  try {
    console.log('Bildirimler getiriliyor...');
    await connectDB();
    
    const notifications = await Reservation.find({ confirmationStatus: 'pending' });
    
    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Notification retrieval error:', error);
    return NextResponse.json(
      { error: 'Bildirimler yüklenirken bir hata oluştu' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    console.log('=== Bildirim Gönderme Başladı ===');
    console.log('Veritabanına bağlanılıyor...');
    await connectDB();
    console.log('Veritabanı bağlantısı başarılı');
    
    const body = await request.json();
    console.log('Gelen bildirim verisi:', JSON.stringify(body, null, 2));
    
    // Bildirim gönderme işlemi burada yapılacak
    console.log('Bildirim başarıyla gönderildi');
    console.log('=== Bildirim Gönderme Tamamlandı ===');
    
    return NextResponse.json({
      message: 'Bildirim başarıyla gönderildi',
      data: body
    }, { status: 201 });
  } catch (error) {
    console.error('=== Bildirim Gönderme Hatası ===');
    console.error('Hata detayı:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Bildirim gönderilirken bir hata oluştu'
      },
      { status: 500 }
    );
  }
} 