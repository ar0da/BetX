#![no_std]

multiversx_sc::imports!();
multiversx_sc::derive_imports!();

#[type_abi]
#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, Clone, PartialEq)]
pub enum BetStatus {
    Open,       
    Matched,    
    Resolved,   
    Cancelled,  
}

#[type_abi]
#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, Clone)]
pub struct Bet<M: ManagedTypeApi> {
    pub id: u64,
    pub creator: ManagedAddress<M>,
    pub description: ManagedBuffer<M>,
    pub status: BetStatus,
    pub creator_stake: BigUint<M>,
    pub challenger: Option<ManagedAddress<M>>,
    pub challenger_stake: BigUint<M>,
    pub winner: Option<ManagedAddress<M>>,
    pub result: Option<bool>,
    pub creation_timestamp: u64,
}

pub mod betting_module {
    use super::*;

    #[multiversx_sc::module]
    pub trait BettingModule {
        // Storage mappers
        #[view(getOwner)]
        #[storage_mapper("owner")]
        fn owner(&self) -> SingleValueMapper<ManagedAddress>;
        
        #[storage_mapper("betIdCounter")]
        fn bet_id_counter(&self) -> SingleValueMapper<u64>;
        
        #[storage_mapper("bet")]
        fn bet(&self, id: u64) -> SingleValueMapper<Bet<Self::Api>>;
        
        #[storage_mapper("activeBets")]
        fn active_bets(&self) -> VecMapper<u64>;
        
        #[storage_mapper("matchedBets")]
        fn matched_bets(&self) -> VecMapper<u64>;
        
        #[storage_mapper("userBets")]
        fn user_bets(&self, user: &ManagedAddress) -> VecMapper<u64>;
    }
}

/// An empty contract. To be used as a template when starting a new contract from scratch.
#[multiversx_sc::contract]
pub trait BettingContract: betting_module::BettingModule {
    #[init]
    fn init(&self) {
        let caller = self.blockchain().get_caller();
        self.owner().set(caller);
        self.bet_id_counter().set(0u64);
    }

    #[upgrade]
    fn upgrade(&self) {}

    #[payable("EGLD")]
    #[endpoint]
    fn create_bet(&self, description: ManagedBuffer) -> u64 {
        let creator = self.blockchain().get_caller();
        let payment = self.call_value().egld();
        
        require!(
            payment.clone_value() > BigUint::zero(),
            "Must deposit some EGLD to create a bet"
        );
        
        let bet_id = self.bet_id_counter().get() + 1;
        self.bet_id_counter().set(bet_id);
        
        let bet = Bet {
            id: bet_id,
            creator: creator.clone(),
            description: description.clone(),
            status: BetStatus::Open,
            creator_stake: payment.clone_value(),
            challenger: None,
            challenger_stake: BigUint::zero(),
            winner: None,
            result: None,
            creation_timestamp: self.blockchain().get_block_timestamp(),
        };
        
        self.bet(bet_id).set(bet);
        self.user_bets(&creator).push(&bet_id);
        self.active_bets().push(&bet_id);
        
        self.bet_created_event(bet_id, &creator, &description, &payment.clone_value());
        
        bet_id
    }

    #[payable("EGLD")]
    #[endpoint]
    fn accept_bet(&self, bet_id: u64) {
        let challenger = self.blockchain().get_caller();
        let payment = self.call_value().egld();
        
        require!(!self.bet(bet_id).is_empty(), "Bet does not exist");
        
        let mut bet = self.bet(bet_id).get();
        
        require!(bet.status == BetStatus::Open, "Bet is not open for acceptance");
        require!(bet.creator != challenger, "Cannot bet against yourself");
        require!(bet.challenger.is_none(), "Bet already has a challenger");
        require!(
            payment.clone_value() == bet.creator_stake,
            "Must match the creator's stake exactly"
        );
        
        bet.challenger = Some(challenger.clone());
        bet.challenger_stake = payment.clone_value();
        bet.status = BetStatus::Matched;
        
        self.bet(bet_id).set(&bet);
        self.user_bets(&challenger).push(&bet_id);
        
        let mut active_bets = self.active_bets();
        if let Some(index) = self.find_in_vec(&active_bets, &bet_id) {
            active_bets.swap_remove(index);
        }
        self.matched_bets().push(&bet_id);
        
        self.bet_accepted_event(bet_id, &challenger, &payment.clone_value());
    }

    #[endpoint]
    fn cancel_bet(&self, bet_id: u64) {
        let caller = self.blockchain().get_caller();
        
        require!(!self.bet(bet_id).is_empty(), "Bet does not exist");
        
        let bet = self.bet(bet_id).get();
        
        require!(bet.status == BetStatus::Open, "Bet is not open");
        require!(bet.creator == caller, "Only the creator can cancel the bet");
        
        self.send().direct_egld(&caller, &bet.creator_stake);
        
        let mut updated_bet = bet;
        updated_bet.status = BetStatus::Cancelled;
        self.bet(bet_id).set(&updated_bet);
        
        let mut active_bets = self.active_bets();
        if let Some(index) = self.find_in_vec(&active_bets, &bet_id) {
            active_bets.swap_remove(index);
        }
        
        self.bet_cancelled_event(bet_id, &caller);
    }

    #[endpoint]
    fn resolve_bet(&self, bet_id: u64, result: bool) {
        let caller = self.blockchain().get_caller();
        
        require!(self.owner().get() == caller, "Only the owner can resolve bets");
        require!(!self.bet(bet_id).is_empty(), "Bet does not exist");
        
        let bet = self.bet(bet_id).get();
        
        require!(bet.status == BetStatus::Matched, "Bet is not matched");
        require!(bet.challenger.is_some(), "Bet has no challenger");
        
        let total_pool = &bet.creator_stake + &bet.challenger_stake;
        let winner = if result {
            bet.creator.clone()
        } else {
            bet.challenger.clone().unwrap()
        };
        
        self.send().direct_egld(&winner, &total_pool);
        
        let mut updated_bet = bet;
        updated_bet.status = BetStatus::Resolved;
        updated_bet.winner = Some(winner.clone());
        updated_bet.result = Some(result);
        self.bet(bet_id).set(&updated_bet);
        
        let mut matched_bets = self.matched_bets();
        if let Some(index) = self.find_in_vec(&matched_bets, &bet_id) {
            matched_bets.swap_remove(index);
        }
        
        self.bet_resolved_event(bet_id, &winner, &total_pool, result);
    }

    // Helper functions
    fn find_in_vec(&self, vec: &VecMapper<u64>, item: &u64) -> Option<usize> {
        for (index, value) in vec.iter().enumerate() {
            if &value == item {
                return Some(index);
            }
        }
        None
    }

    // Events
    #[event("bet_created")]
    fn bet_created_event(
        &self,
        #[indexed] bet_id: u64,
        #[indexed] creator: &ManagedAddress,
        #[indexed] description: &ManagedBuffer,
        stake: &BigUint,
    );
    
    #[event("bet_accepted")]
    fn bet_accepted_event(
        &self,
        #[indexed] bet_id: u64,
        #[indexed] challenger: &ManagedAddress,
        stake: &BigUint,
    );
    
    #[event("bet_cancelled")]
    fn bet_cancelled_event(
        &self,
        #[indexed] bet_id: u64,
        #[indexed] creator: &ManagedAddress,
    );
    
    #[event("bet_resolved")]
    fn bet_resolved_event(
        &self,
        #[indexed] bet_id: u64,
        #[indexed] winner: &ManagedAddress,
        #[indexed] total_pool: &BigUint,
        result: bool,
    );
}
