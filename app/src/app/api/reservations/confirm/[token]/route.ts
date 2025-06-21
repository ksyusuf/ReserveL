import { NextResponse } from 'next/server';
// import { connectDB, Reservation } from '@/lib/db';

export async function GET(request: Request, { params }: { params: { token: string } }) {
  try {
    console.log('Rezervasyon onaylama başladı, token:', params.token);
    // await connectDB();
    
    // const reservation = await Reservation.findOne({ confirmationToken: params.token });
    const reservation = null; // MongoDB devre dışı
    
    if (!reservation) {
      return NextResponse.json(
        { error: 'Rezervasyon bulunamadı' },
        { status: 404 }
      );
    }

    // if (reservation.confirmationStatus === 'confirmed') {
    //   return NextResponse.json(
    //     { error: 'Rezervasyon zaten onaylanmış' },
    //     { status: 400 }
    //   );
    // }

    // if (reservation.confirmationStatus === 'cancelled') {
    //   return NextResponse.json(
    //     { error: 'Rezervasyon iptal edilmiş' },
    //     { status: 400 }
    //   );
    // }

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
    // await connectDB();
    
    const body = await request.json();
    const { action } = body; // 'confirm' veya 'cancel'
    
    // const reservation = await Reservation.findOne({ confirmationToken: params.token });
    const reservation = null; // MongoDB devre dışı
    
    if (!reservation) {
      return NextResponse.json(
        { error: 'Rezervasyon bulunamadı' },
        { status: 404 }
      );
    }

    // if (reservation.confirmationStatus === 'confirmed') {
    //   return NextResponse.json(
    //     { error: 'Rezervasyon zaten onaylanmış' },
    //     { status: 400 }
    //   );
    // }

    // if (reservation.confirmationStatus === 'cancelled') {
    //   return NextResponse.json(
    //     { error: 'Rezervasyon iptal edilmiş' },
    //     { status: 400 }
    //   );
    // }

    // const newStatus = action === 'confirm' ? 'confirmed' : 'cancelled';
    // reservation.confirmationStatus = newStatus;
    // await reservation.save();

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