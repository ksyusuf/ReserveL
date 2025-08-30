import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Business } from '@/lib/db';
import { BusinessLoginData } from '@/types/Business';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body: BusinessLoginData = await request.json();
    const { businessName } = body;

    // Validasyon
    if (!businessName) {
      return NextResponse.json(
        { message: 'İşletme adı gereklidir' },
        { status: 400 }
      );
    }

    // İşletmeyi bul
    const business = await Business.findOne({ businessName });
    if (!business) {
      return NextResponse.json(
        { message: 'İşletme adı veya şifre hatalı' },
        { status: 401 }
      );
    }

    // Not: Kontrat kontrolü client-side yapılıyor
    console.log('🔍 İşletme girişi:', business.businessName);
    console.log('🔍 Cüzdan adresi:', business.walletAddress);

    // Session oluştur (gerçek uygulamada JWT veya session kullanılabilir)
    const sessionData = {
      businessId: business._id,
      businessName: business.businessName,
      walletAddress: business.walletAddress,
      loginTime: new Date().toISOString()
    };

    // Response header'ına session bilgisi ekle (gerçek uygulamada cookie kullanılabilir)
    const response = NextResponse.json(
      { 
        message: 'Giriş başarılı',
        business: {
          id: business._id,
          name: business.businessName,
          walletAddress: business.walletAddress
        }
      },
      { status: 200 }
    );

    // Session bilgisini header'a ekle (gerçek uygulamada cookie kullanılabilir)
    response.headers.set('X-Business-Session', JSON.stringify(sessionData));

    return response;

  } catch (error) {
    console.error('İşletme giriş hatası:', error);
    return NextResponse.json(
      { message: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
} 