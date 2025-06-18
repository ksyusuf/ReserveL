import { NextResponse } from 'next/server';
import { connectDB, Reservation } from '@/lib/db';
import { issueLoyaltyToken } from '@/lib/stellar';
import { calculateLoyaltyTokens } from '@/lib/utils';

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const { reservationId, issuerSecretKey } = body;

    if (!reservationId || !issuerSecretKey) {
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

    if (reservation.loyaltyTokensSent) {
      return NextResponse.json(
        { error: 'Loyalty tokens already sent' },
        { status: 400 }
      );
    }

    // TODO: Replace with actual customer public key
    const customerPublicKey = process.env.CUSTOMER_PUBLIC_KEY || '';
    const amount = calculateLoyaltyTokens(100).toString(); // Example amount

    const issuanceResult = await issueLoyaltyToken(
      issuerSecretKey,
      customerPublicKey,
      amount,
      'LOYALTY'
    );

    // Update reservation loyalty token status
    reservation.loyaltyTokensSent = true;
    await reservation.save();

    return NextResponse.json({
      message: 'Loyalty tokens issued successfully',
      transactionHash: issuanceResult.hash,
      amount,
    });
  } catch (error) {
    console.error('Loyalty token issuance error:', error);
    return NextResponse.json(
      { error: 'Failed to issue loyalty tokens' },
      { status: 500 }
    );
  }
} 