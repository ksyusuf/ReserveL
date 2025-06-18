#![no_std]

use soroban_sdk::{
    contractimpl, contracttype, symbol_short,
    Address, Env, IntoVal, TryFromVal,
    Vec, Map, Symbol,
};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Reservation {
    pub id: Symbol,
    pub customer: Address,
    pub business: Address,
    pub timestamp: u64,
    pub status: Symbol,
    pub payment_status: Symbol,
    pub loyalty_tokens_sent: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Payment {
    pub amount: i128,
    pub asset: Symbol,
    pub timestamp: u64,
}

#[contractimpl]
pub struct Contract;

impl Contract {
    // Contract initialization
    pub fn initialize(env: &Env) {
        // Initialize contract storage
        env.storage().set(&symbol_short!("initialized"), &true);
    }

    // Create a new reservation
    pub fn create_reservation(
        env: &Env,
        customer: Address,
        business: Address,
    ) -> Reservation {
        let id = symbol_short!("temp"); // TODO: Generate unique ID
        let reservation = Reservation {
            id,
            customer,
            business,
            timestamp: env.ledger().timestamp(),
            status: symbol_short!("pending"),
            payment_status: symbol_short!("pending"),
            loyalty_tokens_sent: false,
        };
        
        // Store reservation
        env.storage().set(&id, &reservation);
        
        reservation
    }

    // Get reservation by ID
    pub fn get_reservation(env: &Env, id: Symbol) -> Option<Reservation> {
        env.storage().get(&id)
    }

    // Update reservation status
    pub fn update_reservation_status(
        env: &Env,
        id: Symbol,
        status: Symbol,
    ) -> bool {
        if let Some(mut reservation) = env.storage().get(&id) {
            reservation.status = status;
            env.storage().set(&id, &reservation);
            true
        } else {
            false
        }
    }

    // Process payment for reservation
    pub fn process_payment(
        env: &Env,
        id: Symbol,
        amount: i128,
        asset: Symbol,
    ) -> bool {
        if let Some(mut reservation) = env.storage().get(&id) {
            // Create payment record
            let payment = Payment {
                amount,
                asset,
                timestamp: env.ledger().timestamp(),
            };
            
            // Store payment
            env.storage().set(&symbol_short!("payment"), &payment);
            
            // Update reservation status
            reservation.payment_status = symbol_short!("completed");
            env.storage().set(&id, &reservation);
            
            true
        } else {
            false
        }
    }

    // Issue loyalty tokens
    pub fn issue_loyalty_tokens(
        env: &Env,
        id: Symbol,
        amount: i128,
    ) -> bool {
        if let Some(mut reservation) = env.storage().get(&id) {
            // Check if reservation is confirmed and payment is completed
            if reservation.status == symbol_short!("confirmed") 
                && reservation.payment_status == symbol_short!("completed")
                && !reservation.loyalty_tokens_sent {
                
                // TODO: Implement actual token issuance logic
                // This would typically involve calling the token contract
                
                // Update reservation
                reservation.loyalty_tokens_sent = true;
                env.storage().set(&id, &reservation);
                
                true
            } else {
                false
            }
        } else {
            false
        }
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    #[test]
    fn test_initialize() {
        let env = Env::default();
        let contract = Contract;
        contract.initialize(&env);
        
        assert!(env.storage().get(&symbol_short!("initialized")).unwrap());
    }

    #[test]
    fn test_create_reservation() {
        let env = Env::default();
        let contract = Contract;
        let customer = Address::generate(&env);
        let business = Address::generate(&env);

        let reservation = contract.create_reservation(&env, customer, business);
        assert_eq!(reservation.customer, customer);
        assert_eq!(reservation.business, business);
        assert_eq!(reservation.status, symbol_short!("pending"));
        assert_eq!(reservation.payment_status, symbol_short!("pending"));
        assert!(!reservation.loyalty_tokens_sent);
    }

    #[test]
    fn test_process_payment() {
        let env = Env::default();
        let contract = Contract;
        let customer = Address::generate(&env);
        let business = Address::generate(&env);

        let reservation = contract.create_reservation(&env, customer, business);
        let success = contract.process_payment(&env, reservation.id, 100, symbol_short!("USDC"));
        
        assert!(success);
        
        let updated_reservation = contract.get_reservation(&env, reservation.id).unwrap();
        assert_eq!(updated_reservation.payment_status, symbol_short!("completed"));
    }

    #[test]
    fn test_issue_loyalty_tokens() {
        let env = Env::default();
        let contract = Contract;
        let customer = Address::generate(&env);
        let business = Address::generate(&env);

        let reservation = contract.create_reservation(&env, customer, business);
        
        // Process payment
        contract.process_payment(&env, reservation.id, 100, symbol_short!("USDC"));
        
        // Update status to confirmed
        contract.update_reservation_status(&env, reservation.id, symbol_short!("confirmed"));
        
        // Issue loyalty tokens
        let success = contract.issue_loyalty_tokens(&env, reservation.id, 10);
        
        assert!(success);
        
        let updated_reservation = contract.get_reservation(&env, reservation.id).unwrap();
        assert!(updated_reservation.loyalty_tokens_sent);
    }
} 