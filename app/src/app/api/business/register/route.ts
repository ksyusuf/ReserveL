import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Business } from '@/lib/db';
import { BusinessRegistrationData } from '@/types/Business';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body: BusinessRegistrationData = await request.json();
    const { businessName, walletAddress, registrationHash, email, phone, address, description } = body;

    // Validasyon
    if (!businessName || !walletAddress || !registrationHash) {
      return NextResponse.json(
        { message: 'İşletme adı, cüzdan adresi ve kayıt hash\'i gereklidir' },
        { status: 400 }
      );
    }

    // İşletme adı kontrolü
    const existingBusinessByName = await Business.findOne({ businessName });
    if (existingBusinessByName) {
      return NextResponse.json(
        { message: 'Bu işletme adı zaten kullanılıyor' },
        { status: 400 }
      );
    }

    // Cüzdan adresi kontrolü
    const existingBusinessByWallet = await Business.findOne({ walletAddress });
    if (existingBusinessByWallet) {
      return NextResponse.json(
        { message: 'Bu cüzdan adresi zaten kayıtlı' },
        { status: 400 }
      );
    }

    // Kayıt hash kontrolü
    const existingBusinessByHash = await Business.findOne({ registrationHash });
    if (existingBusinessByHash) {
      return NextResponse.json(
        { message: 'Bu kayıt hash\'i zaten kullanılmış' },
        { status: 400 }
      );
    }

    // Yeni işletme oluştur (şifre olmadan)
    const newBusiness = new Business({
      businessName,
      walletAddress,
      registrationHash,
      email,
      phone,
      address,
      description,
    });

    await newBusiness.save();

    return NextResponse.json(
      { 
        message: 'İşletme başarıyla kaydedildi',
        businessId: newBusiness._id,
        businessName: newBusiness.businessName
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('İşletme kayıt hatası:', error);
    return NextResponse.json(
      { message: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
} 