import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Business } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { businessName, walletAddress } = body;

    // Validasyon: businessName veya walletAddress'ten en az biri gerekli
    if (!businessName && !walletAddress) {
      return NextResponse.json(
        { message: 'İşletme adı veya cüzdan adresi gereklidir' },
        { status: 400 }
      );
    }

    // İşletmeyi bul (şifre hariç)
    const query: any = {};
    if (businessName) query.businessName = businessName;
    if (walletAddress) query.walletAddress = walletAddress;
    const business = await Business.findOne(query).select('-password');
    if (!business) {
      return NextResponse.json(
        { message: 'İşletme bulunamadı' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      _id: business._id,
      businessName: business.businessName,
      walletAddress: business.walletAddress,
      email: business.email,
      phone: business.phone,
      address: business.address,
      description: business.description
    });

  } catch (error) {
    console.error('İşletme bilgileri alma hatası:', error);
    return NextResponse.json(
      { message: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
} 