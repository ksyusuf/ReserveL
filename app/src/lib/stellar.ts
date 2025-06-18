import StellarSdk from '@stellar/stellar-sdk';
const { Server, Networks, TransactionBuilder, Operation, Asset, Keypair } = StellarSdk;

const STELLAR_NETWORK = process.env.STELLAR_NETWORK || 'testnet';
const server = new Server(STELLAR_NETWORK === 'testnet' ? 'https://horizon-testnet.stellar.org' : 'https://horizon.stellar.org');

export const transferStablecoin = async (
  sourceSecretKey: string,
  destinationPublicKey: string,
  amount: string,
  assetCode: string = 'USDC',
  issuerPublicKey: string
) => {
  try {
    const sourceKeypair = Keypair.fromSecret(sourceSecretKey);
    const sourceAccount = await server.loadAccount(sourceKeypair.publicKey());
    
    const asset = new Asset(assetCode, issuerPublicKey);
    
    const transaction = new TransactionBuilder(sourceAccount, {
      fee: '100',
      networkPassphrase: STELLAR_NETWORK === 'testnet' ? Networks.TESTNET : Networks.PUBLIC,
    })
      .addOperation(
        Operation.payment({
          destination: destinationPublicKey,
          asset: asset,
          amount: amount,
        })
      )
      .setTimeout(30)
      .build();

    transaction.sign(sourceKeypair);
    
    const result = await server.submitTransaction(transaction);
    return result;
  } catch (error) {
    console.error('Stellar transfer error:', error);
    throw error;
  }
};

export const issueLoyaltyToken = async (
  issuerSecretKey: string,
  destinationPublicKey: string,
  amount: string,
  assetCode: string
) => {
  try {
    const issuerKeypair = Keypair.fromSecret(issuerSecretKey);
    const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());
    
    const asset = new Asset(assetCode, issuerKeypair.publicKey());
    
    const transaction = new TransactionBuilder(issuerAccount, {
      fee: '100',
      networkPassphrase: STELLAR_NETWORK === 'testnet' ? Networks.TESTNET : Networks.PUBLIC,
    })
      .addOperation(
        Operation.payment({
          destination: destinationPublicKey,
          asset: asset,
          amount: amount,
        })
      )
      .setTimeout(30)
      .build();

    transaction.sign(issuerKeypair);
    
    const result = await server.submitTransaction(transaction);
    return result;
  } catch (error) {
    console.error('Loyalty token issuance error:', error);
    throw error;
  }
}; 