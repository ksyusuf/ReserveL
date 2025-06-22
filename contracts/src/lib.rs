#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, token, Address, Env, Map, Symbol, log,
};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ReservationStatus {
    Pending,
    Confirmed,
    NoShow,
    Completed,
    Cancelled,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Reservation {
    pub business_id: Address,
    pub customer_id: Option<Address>,
    pub reservation_time: u64,
    pub party_size: u32,
    pub payment_amount: i128,
    pub payment_asset: Option<Address>,
    pub status: ReservationStatus,
    pub loyalty_issued: bool,
}

#[contract]
pub struct ReserveLContract;

#[contractimpl]
impl ReserveLContract {
    pub fn initialize(env: Env, owner: Address, loyalty_token_id: Address) {
        let owner_key = Symbol::new(&env, "owner");
        let loyalty_key = Symbol::new(&env, "loyalty");

        if env.storage().instance().has(&owner_key) {
            panic!("Contract already initialized");
        }

        env.storage().instance().set(&owner_key, &owner);
        env.storage().instance().set(&loyalty_key, &loyalty_token_id);
    }

    pub fn create_loyalty_token(env: Env, business_id: Address, amount: i128) {
        // Admin olarak business_id'nin yetkili olduğundan emin olalım
        let owner_key = Symbol::new(&env, "owner");
        let admin_address: Address = env.storage().instance().get(&owner_key).expect(" Admin not set");

        if business_id != admin_address {
            panic!(" Only the admin (business owner) can create loyalty tokens.");
        }

        // Sadakat token'larını yaratmak için token_id'yi alalım
        let loyalty_key = Symbol::new(&env, "loyalty");
        let loyalty_token_id: Address = env.storage().instance().get(&loyalty_key).expect(" Loyalty token not set");
        
        // Token client'ını oluşturalım
        let loyalty_client = token::Client::new(&env, &loyalty_token_id);

        // Belirtilen miktarda loyalty token'ı admin adresinden transfer edelim
        loyalty_client.transfer(&business_id, &business_id, &amount);

        log!(&env, " Successfully created {} loyalty tokens for business_id {}", amount, business_id);
    }

    pub fn create_reservation(
        env: Env,
        business_id: Address,
        reservation_time: u64,
        party_size: u32,
        payment_amount: i128,
        _payment_asset: Option<Address>,
    ) -> u64 {
        business_id.require_auth();

        let reserves_key = Symbol::new(&env, "reserves");
        let next_id_key = Symbol::new(&env, "next_id");

        let mut reservations: Map<u64, Reservation> = env
            .storage()
            .persistent()
            .get(&reserves_key)
            .unwrap_or(Map::new(&env));

        let next_id: u64 = env.storage().persistent().get(&next_id_key).unwrap_or(0);

        let reservation = Reservation {
            business_id,
            customer_id: None,
            reservation_time,
            party_size,
            payment_amount,
            payment_asset: None,
            status: ReservationStatus::Pending,
            loyalty_issued: false,
        };

        reservations.set(next_id, reservation);
        env.storage().persistent().set(&reserves_key, &reservations);
        env.storage().persistent().set(&next_id_key, &(next_id + 1));

        next_id
    }

    pub fn confirm_reservation(env: Env, reservation_id: u64, customer_id: Address) {
        customer_id.require_auth();

        let reserves_key = Symbol::new(&env, "reserves");
        let mut reservations: Map<u64, Reservation> = env
            .storage()
            .persistent()
            .get(&reserves_key)
            .unwrap_or(Map::new(&env));

        let mut reservation = reservations.get(reservation_id).expect("Reservation not found");

        if reservation.status != ReservationStatus::Pending {
            panic!("Reservation is not in pending state");
        }

        match &reservation.customer_id {
            Some(assigned_id) if *assigned_id != customer_id => {
                panic!("Unauthorized: Not the customer for this reservation");
            }
            None => {
                reservation.customer_id = Some(customer_id.clone());
            }
            _ => {}
        }

        match &reservation.payment_asset {
            Some(asset_addr) => {
                let token_client = token::Client::new(&env, asset_addr);
                token_client.transfer(&customer_id, &reservation.business_id, &reservation.payment_amount);
            }
            None => {
                // JS tarafından XLM gönderildiği varsayılıyor.
                // Burada sadece reservation logic işlenir.
            }
        }

        reservation.status = ReservationStatus::Confirmed;
        reservations.set(reservation_id, reservation);
        env.storage().persistent().set(&reserves_key, &reservations);
    }

    pub fn update_reservation_status(env: Env, reservation_id: u64, new_status_str: Symbol) {
        let reserves_key = Symbol::new(&env, "reserves");
        let mut reservations: Map<u64, Reservation> = env
            .storage()
            .persistent()
            .get(&reserves_key)
            .unwrap_or(Map::new(&env));

        let mut reservation = reservations.get(reservation_id).expect(" Reservation with ID not found");


        // String değerini enum'a çevir
        let new_status = match new_status_str {
            s if s == Symbol::new(&env, "Completed") => ReservationStatus::Completed,
            s if s == Symbol::new(&env, "NoShow") => ReservationStatus::NoShow,
            _ => panic!("Invalid status: "),
        };

        if reservation.status != ReservationStatus::Confirmed {
            panic!("Cannot update status for a non-confirmed reservation");
        }

        match new_status {
            ReservationStatus::Completed => {
                if !reservation.loyalty_issued {
                    let loyalty_key = Symbol::new(&env, "loyalty");
                    let loyalty_token_id: Address = env.storage().instance().get(&loyalty_key).expect(" Loyalty token not set");

                    // Token client'ını oluştur
                    let loyalty_client = token::Client::new(&env, &loyalty_token_id);

                    // Miktar belirle
                    let loyalty_amount: i128 = 100 * 10i128.pow(7); // 100 token

                    let business = reservation.business_id.clone();
                    business.require_auth();

                    // Müşteri adresini kontrol et
                    let customer = reservation.customer_id.clone();

                    let customer = customer.unwrap();

                    // Sadakat token'larını müşteriye aktar
                    loyalty_client.transfer(&business, &customer, &loyalty_amount);
                    reservation.loyalty_issued = true;
                }

                reservation.status = new_status.clone();
            }
            ReservationStatus::NoShow => {
                log!(&env, "🔍 Marking reservation ID {} as 'NoShow'.", reservation_id);
                reservation.status = new_status.clone();
            }
            _ => {
                log!(&env, " Invalid status update for reservation ID {}. The status must be either 'Completed' or 'NoShow'.", reservation_id);
                panic!(" Invalid status update for reservation ID {}. The status must be either 'Completed' or 'NoShow'.", reservation_id);
            }
        }

        // Rezervasyonu güncelle
        reservations.set(reservation_id, reservation);
        env.storage().persistent().set(&reserves_key, &reservations);
    }

    pub fn get_reservation(env: Env, reservation_id: u64) -> Option<Reservation> {
        let reserves_key = Symbol::new(&env, "reserves");
        let reservations: Map<u64, Reservation> = env
            .storage()
            .persistent()
            .get(&reserves_key)
            .unwrap_or(Map::new(&env));
        reservations.get(reservation_id)
    }

    pub fn get_loyalty_token_id(env: Env) -> Address {
        let loyalty_key = Symbol::new(&env, "loyalty");
        env.storage().instance().get(&loyalty_key).expect("Loyalty token not set")
    }

    pub fn get_owner(env: Env) -> Address {
        let owner_key = Symbol::new(&env, "owner");
        env.storage().instance().get(&owner_key).expect("Owner not set")
    }
}
