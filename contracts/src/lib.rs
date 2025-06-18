#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, token, Address, Env, Map, Symbol,
}; // Removed IntoVal

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ReservationStatus {
    Pending,
    Confirmed,
    NoShow,
    Completed,
    Cancelled, // Gelecek için yer tutucu
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Reservation {
    pub business_id: Address,
    pub customer_id: Address,
    pub reservation_time: u64, // Unix timestamp
    pub party_size: u32,
    pub payment_amount: i128, // Amount in asset smallest unit (e.g., stroops for XLM, or 10^7 for USDC)
    pub payment_asset: Address, // Address of the asset contract (e.g., USDC)
    pub status: ReservationStatus,
    pub loyalty_issued: bool,
}

// Data Keys for storage
const RESERVATIONS: Symbol = symbol_short!("reserves");
const NEXT_RESERVATION_ID: Symbol = symbol_short!("next_id");
const LOYALTY_TOKEN_ID: Symbol = symbol_short!("loyalty"); // Address of the loyalty token contract
const OWNER: Symbol = symbol_short!("owner"); // Contract owner (deployer)

#[contract]
pub struct ReserveLContract;

#[contractimpl]
impl ReserveLContract {
    /// Initializes the contract with the business owner and loyalty token ID.
    /// This should be called only once after deployment.
    pub fn initialize(env: Env, owner: Address, loyalty_token_id: Address) {
        if env.storage().instance().has(&OWNER) {
            panic!("Contract already initialized");
        }
        env.storage().instance().set(&OWNER, &owner);
        env.storage().instance().set(&LOYALTY_TOKEN_ID, &loyalty_token_id);
    }

    /// Creates a new reservation record in the contract.
    /// This function is called by the business's backend.
    /// Returns the new reservation ID.
    pub fn create_reservation(
        env: Env,
        business_id: Address,
        customer_id: Address,
        reservation_time: u64,
        party_size: u32,
        payment_amount: i128,
        payment_asset: Address,
    ) -> u64 {
        business_id.require_auth(); // Only the business can create reservations for itself

        let mut reservations: Map<u64, Reservation> = env
            .storage()
            .persistent()
            .get(&RESERVATIONS)
            .unwrap_or_else(|| Map::new(&env)); // Corrected: Use unwrap_or_else with Map::new

        let next_id: u64 = env.storage().persistent().get(&NEXT_RESERVATION_ID).unwrap_or(0);

        let reservation = Reservation {
            business_id,
            customer_id,
            reservation_time,
            party_size,
            payment_amount,
            payment_asset,
            status: ReservationStatus::Pending,
            loyalty_issued: false,
        };

        reservations.set(next_id, reservation);
        env.storage().persistent().set(&RESERVATIONS, &reservations);
        env.storage().persistent().set(&NEXT_RESERVATION_ID, &(next_id + 1));

        next_id
    }

    /// Confirms a reservation by transferring the payment from the customer to the business.
    /// This function is called by the customer's frontend via API.
    pub fn confirm_reservation(env: Env, reservation_id: u64, customer_id: Address) {
        customer_id.require_auth();

        let mut reservations: Map<u64, Reservation> = env
            .storage()
            .persistent()
            .get(&RESERVATIONS)
            .unwrap_or_else(|| Map::new(&env)); // Corrected: Use unwrap_or_else with Map::new

        let mut reservation = reservations
            .get(reservation_id)
            .expect("Reservation not found");

        if reservation.status != ReservationStatus::Pending {
            panic!("Reservation is not in pending state");
        }
        if reservation.customer_id != customer_id {
            panic!("Unauthorized: Not the customer for this reservation");
        }

        // Perform the token transfer
        let token_client = token::Client::new(&env, &reservation.payment_asset);
        token_client.transfer(
            &customer_id,
            &reservation.business_id,
            &reservation.payment_amount,
        );

        reservation.status = ReservationStatus::Confirmed;
        reservations.set(reservation_id, reservation);
        env.storage().persistent().set(&RESERVATIONS, &reservations);
    }

    /// Updates the status of a reservation (e.g., "arrived" or "no-show").
    /// This function is called by the business's backend.
    pub fn update_reservation_status(env: Env, reservation_id: u64, new_status: ReservationStatus) {
        let mut reservations: Map<u64, Reservation> = env
            .storage()
            .persistent()
            .get(&RESERVATIONS)
            .unwrap_or_else(|| Map::new(&env)); // Corrected: Use unwrap_or_else with Map::new

        let mut reservation = reservations
            .get(reservation_id)
            .expect("Reservation not found");

        reservation.business_id.require_auth(); // Only the business owner can update their reservation status

        // Only allow status transitions from Confirmed
        if reservation.status != ReservationStatus::Confirmed {
            panic!("Cannot update status for a non-confirmed reservation");
        }

        match new_status {
            ReservationStatus::Completed => {
                // If customer arrived, issue loyalty tokens
                if !reservation.loyalty_issued {
                    let loyalty_token_id: Address = env.storage().instance().get(&LOYALTY_TOKEN_ID).expect("Loyalty token not set");
                    let loyalty_client = token::Client::new(&env, &loyalty_token_id);
                    let loyalty_amount: i128 = 100 * 10i128.pow(7); // Example: 100 loyalty tokens (assuming 7 decimals)
                    
                    let minter_address: Address = env.storage().instance().get(&OWNER).expect("Owner not set, cannot issue loyalty tokens");
                    minter_address.require_auth(); // Ensure the minter account authorizes this transfer

                    // Transfer loyalty tokens from the minter_address (which should have pre-minted tokens)
                    // to the customer.
                    loyalty_client.transfer(&minter_address, &reservation.customer_id, &loyalty_amount);

                    reservation.loyalty_issued = true;
                }
                reservation.status = new_status;
            }
            ReservationStatus::NoShow => {
                // If no-show, the initial payment remains with the business.
                // No loyalty tokens are issued.
                reservation.status = new_status;
            }
            _ => panic!("Invalid status update"), // Prevent other status changes
        }

        reservations.set(reservation_id, reservation);
        env.storage().persistent().set(&RESERVATIONS, &reservations);
    }

    /// Retrieves reservation details.
    pub fn get_reservation(env: Env, reservation_id: u64) -> Option<Reservation> {
        let reservations: Map<u64, Reservation> = env
            .storage()
            .persistent()
            .get(&RESERVATIONS)
            .unwrap_or_else(|| Map::new(&env)); // Corrected: Use unwrap_or_else with Map::new
        reservations.get(reservation_id)
    }

    /// Helper function to get the loyalty token ID
    pub fn get_loyalty_token_id(env: Env) -> Address {
        env.storage().instance().get(&LOYALTY_TOKEN_ID).expect("Loyalty token not set")
    }

    /// Helper function to get the contract owner
    pub fn get_owner(env: Env) -> Address {
        env.storage().instance().get(&OWNER).expect("Owner not set")
    }
}

// Unit tests for the contract (can be expanded)
#[cfg(test)]
mod test;