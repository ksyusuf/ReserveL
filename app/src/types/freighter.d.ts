interface Freighter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): Promise<boolean>;
  getPublicKey(): Promise<string>;
  signAndSubmitTransaction(transaction: any): Promise<{ hash: string }>;
  signTransaction(transaction: any): Promise<any>;
}

declare global {
  interface Window {
    freighter?: Freighter;
  }
} 