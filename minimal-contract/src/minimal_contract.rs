#![no_std]

multiversx_sc::imports!();
multiversx_sc::derive_imports!();

#[type_abi]
#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, Clone, PartialEq)]
pub enum BetStatus {
    Open,
    Matched,
    Resolved,
    Cancelled
}

#[type_abi]
#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, Clone, PartialEq)]
pub struct Bet<M: ManagedTypeApi> {
    pub id: u64,
    pub creator: ManagedAddress<M>,
    pub ipfs_cid: ManagedBuffer<M>,
    pub status: BetStatus,
    pub creator_stake: BigUint<M>,
    pub challenger: Option<ManagedAddress<M>>,
    pub challenger_stake: BigUint<M>,
    pub winner: Option<ManagedAddress<M>>,
    pub result: Option<bool>,
    pub creation_timestamp: u64,
}

#[multiversx_sc::contract]
pub trait BettingContract {
    #[init]
    fn init(&self) {
        let caller = self.blockchain().get_caller();
        self.owner().set(caller);
        self.bet_id_counter().set(0u64);
    }

    #[upgrade]
    fn upgrade(&self) {}

    // Storage mappers
    #[storage_mapper("owner")]
    fn owner(&self) -> SingleValueMapper<ManagedAddress>;

    #[storage_mapper("betIdCounter")]
    fn bet_id_counter(&self) -> SingleValueMapper<u64>;

    #[storage_mapper("bet")]
    fn bet(&self, id: u64) -> SingleValueMapper<Bet<Self::Api>>;

    #[storage_mapper("activeBets")]
    fn active_bets(&self) -> VecMapper<u64>;

    // Bet Creation
    #[payable("EGLD")]
    #[endpoint(createBet)]
    fn create_bet(&self, ipfs_cid: ManagedBuffer) -> u64 {
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
            ipfs_cid: ipfs_cid.clone(),
            status: BetStatus::Open,
            creator_stake: payment.clone_value(),
            challenger: None,
            challenger_stake: BigUint::zero(),
            winner: None,
            result: None,
            creation_timestamp: self.blockchain().get_block_timestamp(),
        };
        
        self.bet(bet_id).set(bet);
        self.active_bets().push(&bet_id);
        
        bet_id
    }

    // Accept Bet
    #[payable("EGLD")]
    #[endpoint(acceptBet)]
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
        
        let mut active_bets = self.active_bets();
        if let Some(index) = self.find_in_vec(&active_bets, &bet_id) {
            active_bets.swap_remove(index);
        }
    }

    // Cancel Bet
    #[endpoint(cancelBet)]
    fn cancel_bet(&self, bet_id: u64) {
        let caller = self.blockchain().get_caller();
        
        require!(!self.bet(bet_id).is_empty(), "Bet does not exist");
        
        let mut bet = self.bet(bet_id).get();
        
        require!(bet.status == BetStatus::Open, "Bet is not open");
        require!(bet.creator == caller, "Only the creator can cancel the bet");
        
        self.send().direct_egld(&caller, &bet.creator_stake);
        
        bet.status = BetStatus::Cancelled;
        self.bet(bet_id).set(&bet);
        
        let mut active_bets = self.active_bets();
        if let Some(index) = self.find_in_vec(&active_bets, &bet_id) {
            active_bets.swap_remove(index);
        }
    }

    // Resolve Bet
    #[endpoint(resolveBet)]
    fn resolve_bet(&self, bet_id: u64, result: bool) {
        let caller = self.blockchain().get_caller();
        
        require!(self.owner().get() == caller, "Only the owner can resolve bets");
        require!(!self.bet(bet_id).is_empty(), "Bet does not exist");
        
        let mut bet = self.bet(bet_id).get();
        
        require!(bet.status == BetStatus::Matched, "Bet is not matched");
        require!(bet.challenger.is_some(), "Bet has no challenger");
        
        let total_pool = &bet.creator_stake + &bet.challenger_stake;
        let winner = if result {
            bet.creator.clone()
        } else {
            bet.challenger.clone().unwrap()
        };
        
        self.send().direct_egld(&winner, &total_pool);
        
        bet.status = BetStatus::Resolved;
        bet.winner = Some(winner);
        bet.result = Some(result);
        self.bet(bet_id).set(&bet);
    }

    // Helper function to find index in a vector
    fn find_in_vec(&self, vec: &VecMapper<u64>, item: &u64) -> Option<usize> {
        for (index, value) in vec.iter().enumerate() {
            if value == *item {
                return Some(index);
            }
        }
        None
    }

    // View functions
    #[view(getTotalBetCount)]
    fn get_total_bet_count(&self) -> u64 {
        self.bet_id_counter().get()
    }

    #[view(getBetById)]
    fn get_bet_by_id(&self, bet_id: u64) -> ManagedBuffer {
        require!(!self.bet(bet_id).is_empty(), "Bet does not exist");
        let bet = self.bet(bet_id).get();
        
        // Return IPFS CID for frontend to fetch details
        bet.ipfs_cid
    }
}
