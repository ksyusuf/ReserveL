# ReserveL Next.js Application

This is the frontend/backend application for the ReserveL project, built with Next.js 14.

## Getting Started

First, install the dependencies:

```bash
npm install
# or
yarn install
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `/src/app` - Next.js App Router pages and API routes
- `/src/components` - React components
- `/src/lib` - Utility functions and shared code

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
MONGODB_URI=your_mongodb_uri
STELLAR_NETWORK=testnet
```

## Contract Initialization

To initialize the smart contract (required for loyalty token functionality), follow these steps:

1. **Open Browser Developer Tools:**
   - Press `F12` or right-click and select "Inspect"
   - Go to the "Console" tab

2. **Navigate to Business Dashboard:**
   - Go to `http://localhost:3000/business-dashboard`

3. **Initialize Contract:**
   - In the console, simply run:
   ```javascript
   initializeReserveLContract()
   ```

4. **Check Results:**
   - The function will show success/error messages in the console
   - A popup will also display the transaction hash if successful
   - You can view the transaction on Stellar Expert using the provided link

**Note:** Contract initialization is only needed once per deployment. After initialization, the loyalty token system will work automatically for all reservations.

## Learn More

To learn more about the technologies used in this project:

- [Next.js Documentation](https://nextjs.org/docs)
- [Stellar Documentation](https://developers.stellar.org/docs)
- [Soroban Documentation](https://soroban.stellar.org/docs) 