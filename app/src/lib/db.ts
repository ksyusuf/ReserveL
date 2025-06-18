import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not defined');
}

let isConnecting = false;

export const connectDB = async () => {
  try {
    // Eğer zaten bağlıysa, bağlantıyı yeniden kurmaya gerek yok
    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB zaten bağlı');
      return;
    }

    // Eğer bağlantı kuruluyorsa, bekle
    if (isConnecting) {
      console.log('MongoDB bağlantısı kuruluyor, bekleniyor...');
      return;
    }

    isConnecting = true;
    console.log('MongoDB bağlantısı başlatılıyor...');
    
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000,
      retryWrites: true,
      w: 'majority',
    });

    console.log('MongoDB bağlantı durumu:', mongoose.connection.readyState);
    console.log('MongoDB bağlantı host:', mongoose.connection.host);
    console.log('MongoDB bağlantı port:', mongoose.connection.port);
    console.log('MongoDB bağlantı database:', mongoose.connection.name);
  } catch (error) {
    console.error('MongoDB bağlantı hatası:', error);
    if (error instanceof Error) {
      console.error('Hata mesajı:', error.message);
      console.error('Hata stack:', error.stack);
    }
    throw error;
  } finally {
    isConnecting = false;
  }
};

// Bağlantı durumunu kontrol et
mongoose.connection.on('connected', () => {
  console.log('MongoDB bağlantısı başarılı');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB bağlantı hatası:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB bağlantısı kesildi');
});

const ReservationSchema = new mongoose.Schema({
  reservationId: {
    type: String,
    required: true,
    unique: true,
  },
  businessName: {
    type: String,
    required: true,
  },
  customerName: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  numberOfPeople: {
    type: Number,
    required: true,
    min: 1,
  },
  customerPhone: {
    type: String,
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
  },
  confirmationStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending',
  },
  loyaltyTokensSent: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt timestamp before saving
ReservationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const Reservation = mongoose.models.Reservation || mongoose.model('Reservation', ReservationSchema); 