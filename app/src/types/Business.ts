export interface Business {
  _id?: string;
  businessName: string;
  walletAddress: string;
  password: string;
  registrationHash: string;
  email?: string;
  phone?: string;
  address?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessLoginData {
  businessName: string;
}

export interface BusinessRegistrationData {
  businessName: string;
  walletAddress: string;
  registrationHash: string;
  email?: string;
  phone?: string;
  address?: string;
  description?: string;
} 