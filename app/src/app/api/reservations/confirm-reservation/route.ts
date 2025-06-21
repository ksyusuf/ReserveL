import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reservationId, customerAddress } = body;

    if (!reservationId || !customerAddress) {
      return NextResponse.json(
        { error: 'Rezervasyon ID ve müşteri adresi gerekli' },
        { status: 400 }
      );
    }

    // Bu endpoint şimdilik sadece başarılı yanıt döndürüyor
    // Gerçek implementasyonda Soroban contract çağrısı yapılacak
    console.log('Rezervasyon onaylama isteği:', {
      reservationId,
      customerAddress
    });

    // TODO: Soroban contract'ı ile confirm_reservation metodunu çağır
    // Bu işlem için:
    // 1. Soroban SDK kullanarak contract'ı çağır
    // 2. Customer authentication kontrolü yap
    // 3. Token transferini gerçekleştir
    // 4. Rezervasyon durumunu güncelle

    return NextResponse.json({
      message: 'Rezervasyon onaylama isteği alındı',
      reservationId,
      customerAddress,
      status: 'pending_confirmation'
    });

  } catch (error) {
    console.error('Rezervasyon onaylama hatası:', error);
    return NextResponse.json(
      { error: 'Rezervasyon onaylanırken bir hata oluştu' },
      { status: 500 }
    );
  }
} 