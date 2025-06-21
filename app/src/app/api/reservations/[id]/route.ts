import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Rezervasyon ID gerekli' },
        { status: 400 }
      );
    }

    // TODO: Gerçek implementasyonda veritabanından rezervasyon bilgilerini getir
    // Şimdilik mock data döndürüyoruz
    const mockReservation = {
      reservationId: id,
      businessName: 'Örnek Restoran',
      customerName: 'Ahmet Yılmaz',
      date: '2024-01-15',
      time: '19:00',
      numberOfPeople: 4,
      paymentStatus: 'pending' as const,
      confirmationStatus: 'pending' as const,
    };

    // Rezervasyon bulunamadı durumu için
    if (id === 'not-found') {
      return NextResponse.json(
        { error: 'Rezervasyon bulunamadı' },
        { status: 404 }
      );
    }

    return NextResponse.json(mockReservation);
  } catch (error) {
    console.error('Rezervasyon getirme hatası:', error);
    return NextResponse.json(
      { error: 'Rezervasyon bilgileri yüklenirken bir hata oluştu' },
      { status: 500 }
    );
  }
} 