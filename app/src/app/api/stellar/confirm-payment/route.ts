import { NextResponse } from 'next/server';
import { connectDB, Reservation } from '@/lib/db';
import { transferStablecoin } from '@/lib/stellar';

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const { reservationId, sourceSecretKey, amount } = body;

    if (!reservationId || !sourceSecretKey || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const reservation = await Reservation.findOne({ reservationId });
    if (!reservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      );
    }

    // TODO: Replace with actual business public key
    const businessPublicKey = process.env.BUSINESS_PUBLIC_KEY || '';
    const issuerPublicKey = process.env.ISSUER_PUBLIC_KEY || '';

    const transferResult = await transferStablecoin(
      sourceSecretKey,
      businessPublicKey,
      amount,
      'USDC',
      issuerPublicKey
    );

    // Update reservation payment status
    reservation.paymentStatus = 'completed';
    await reservation.save();

    return NextResponse.json({
      message: 'Payment confirmed successfully',
      transactionHash: transferResult.hash,
    });
  } catch (error) {
    console.error('Payment confirmation error:', error);
    return NextResponse.json(
      { error: 'Failed to confirm payment' },
      { status: 500 }
    );
  }
} 