#[test_only]
module sui_billboard_nft::billboard_nft_tests {
    use sui::test_scenario as ts;
    use sui::clock::{Self, Clock};
    use sui::coin::{Self};
    use sui::sui::SUI;
    use std::string::{Self, String};
    use std::vector;
    
    use sui_billboard_nft::billboard_nft::{Self, AdSpace, AdBoardNFT, PlatformCap, GameDevCap};
    
    // 测试常量
    const PLATFORM_ADDR: address = @0x1;
    const GAME_DEVELOPER_ADDR: address = @0x2;
    const BRAND_ADDR: address = @0x3;
    const GAME_NAME: vector<u8> = b"Test Game";
    const LOCATION: vector<u8> = b"Main Menu";
    const SIZE: vector<u8> = b"800x600";
    const BRAND_NAME: vector<u8> = b"Cool Brand";
    const CONTENT_URL: vector<u8> = b"https://example.com/ad.png";
    const CONTENT_HASH: vector<u8> = x"1234567890";
    const FIXED_PRICE: u64 = 1000;
    const LEASE_DURATION: u64 = 30;
    const NEW_CONTENT_HASH: vector<u8> = x"5678";
    const NEW_CONTENT_URL: vector<u8> = b"https://example.com/new_ad.png";
    const DAILY_VIEWS: u64 = 1000;
    const DAILY_MIN_PRICE: u64 = 100;

    #[test]
    fun test_create_ad_space() {
        let mut scenario = ts::begin(@0x1);
        {
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            
            ts::next_tx(&mut scenario, @0x1);
            {
                billboard_nft::init_for_testing(ts::ctx(&mut scenario));
            };
            
            ts::next_tx(&mut scenario, @0x1);
            {
                let game_dev_cap = ts::take_from_sender<GameDevCap>(&scenario);
                billboard_nft::create_ad_space(
                    &game_dev_cap,
                    string::utf8(b"Test Game"),
                    string::utf8(b"Main Menu"),
                    string::utf8(b"800x600"),
                    1000,
                    &clock,
                    ts::ctx(&mut scenario)
                );
                ts::return_to_sender(&scenario, game_dev_cap);
            };

            ts::next_tx(&mut scenario, @0x1);
            {
                let ad_space = ts::take_shared<AdSpace>(&scenario);
                assert!(billboard_nft::get_fixed_price(&ad_space) == 1000, 0);
                ts::return_shared(ad_space);
            };

            clock::destroy_for_testing(clock);
        };
        ts::end(scenario);
    }

    #[test]
    fun test_purchase_ad_space() {
        let mut scenario = ts::begin(@0x1);
        {
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            
            ts::next_tx(&mut scenario, @0x1);
            {
                billboard_nft::init_for_testing(ts::ctx(&mut scenario));
            };
            
            ts::next_tx(&mut scenario, @0x1);
            {
                let game_dev_cap = ts::take_from_sender<GameDevCap>(&scenario);
                billboard_nft::create_ad_space(
                    &game_dev_cap,
                    string::utf8(b"Test Game"),
                    string::utf8(b"Main Menu"),
                    string::utf8(b"800x600"),
                    1000,
                    &clock,
                    ts::ctx(&mut scenario)
                );
                ts::return_to_sender(&scenario, game_dev_cap);
            };

            ts::next_tx(&mut scenario, @0x1);
            {
                let mut ad_space = ts::take_shared<AdSpace>(&scenario);
                let payment = coin::mint_for_testing<SUI>(1000, ts::ctx(&mut scenario));
                billboard_nft::purchase_ad_space(
                    &mut ad_space,
                    payment,
                    30,
                    b"https://example.com/ad.png",
                    &clock,
                    ts::ctx(&mut scenario)
                );
                ts::return_shared(ad_space);
            };

            clock::destroy_for_testing(clock);
        };
        ts::end(scenario);
    }

    #[test]
    fun test_update_ad_content() {
        let mut scenario = ts::begin(@0x1);
        {
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            
            ts::next_tx(&mut scenario, @0x1);
            {
                billboard_nft::init_for_testing(ts::ctx(&mut scenario));
            };
            
            ts::next_tx(&mut scenario, @0x1);
            {
                let game_dev_cap = ts::take_from_sender<GameDevCap>(&scenario);
                billboard_nft::create_ad_space(
                    &game_dev_cap,
                    string::utf8(b"Test Game"),
                    string::utf8(b"Main Menu"),
                    string::utf8(b"800x600"),
                    1000,
                    &clock,
                    ts::ctx(&mut scenario)
                );
                ts::return_to_sender(&scenario, game_dev_cap);
            };

            ts::next_tx(&mut scenario, @0x1);
            {
                let mut ad_space = ts::take_shared<AdSpace>(&scenario);
                let payment = coin::mint_for_testing<SUI>(1000, ts::ctx(&mut scenario));
                billboard_nft::purchase_ad_space(
                    &mut ad_space,
                    payment,
                    30,
                    b"https://example.com/ad.png",
                    &clock,
                    ts::ctx(&mut scenario)
                );
                ts::return_shared(ad_space);
            };

            ts::next_tx(&mut scenario, @0x1);
            {
                let mut nft = ts::take_from_sender<AdBoardNFT>(&scenario);
                billboard_nft::update_ad_content(
                    &mut nft,
                    x"5678",
                    string::utf8(b"https://example.com/new_ad.png"),
                    &clock,
                    ts::ctx(&mut scenario)
                );
                ts::return_to_sender(&scenario, nft);
            };

            clock::destroy_for_testing(clock);
        };
        ts::end(scenario);
    }

    #[test]
    fun test_renew_lease() {
        let mut scenario = ts::begin(@0x1);
        {
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            
            ts::next_tx(&mut scenario, @0x1);
            {
                billboard_nft::init_for_testing(ts::ctx(&mut scenario));
            };
            
            ts::next_tx(&mut scenario, @0x1);
            {
                let game_dev_cap = ts::take_from_sender<GameDevCap>(&scenario);
                billboard_nft::create_ad_space(
                    &game_dev_cap,
                    string::utf8(b"Test Game"),
                    string::utf8(b"Main Menu"),
                    string::utf8(b"800x600"),
                    1000,
                    &clock,
                    ts::ctx(&mut scenario)
                );
                ts::return_to_sender(&scenario, game_dev_cap);
            };

            ts::next_tx(&mut scenario, @0x1);
            {
                let mut ad_space = ts::take_shared<AdSpace>(&scenario);
                let payment = coin::mint_for_testing<SUI>(1000, ts::ctx(&mut scenario));
                billboard_nft::purchase_ad_space(
                    &mut ad_space,
                    payment,
                    30,
                    b"https://example.com/ad.png",
                    &clock,
                    ts::ctx(&mut scenario)
                );
                ts::return_shared(ad_space);
            };

            ts::next_tx(&mut scenario, @0x1);
            {
                let mut nft = ts::take_from_sender<AdBoardNFT>(&scenario);
                let ad_space = ts::take_shared<AdSpace>(&scenario);
                let payment = coin::mint_for_testing<SUI>(1000, ts::ctx(&mut scenario));
                billboard_nft::renew_lease(
                    &mut nft,
                    &ad_space,
                    payment,
                    30,
                    &clock,
                    ts::ctx(&mut scenario)
                );
                ts::return_to_sender(&scenario, nft);
                ts::return_shared(ad_space);
            };

            clock::destroy_for_testing(clock);
        };
        ts::end(scenario);
    }
} 