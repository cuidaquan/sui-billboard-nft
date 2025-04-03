module sui_billboard_nft::nft {
    use std::string::String;
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::clock::{Self, Clock};
    use sui::display;
    use sui::package;

    use sui_billboard_nft::ad_space::{Self, AdSpace};

    // 错误码
    const ENotOwner: u64 = 1;
    const ELeaseExpired: u64 = 2;
    const EInvalidLeaseDuration: u64 = 3;

    // 定义租期常量
    const SECONDS_PER_DAY: u64 = 24 * 60 * 60;
    const MAX_LEASE_DAYS: u64 = 365; // 最大租期365天
    const MIN_LEASE_DAYS: u64 = 1;   // 最小租期1天


    // 广告牌NFT结构
    public struct AdBoardNFT has key, store {
        id: UID,
        ad_space_id: ID,           // 对应的广告位ID
        owner: address,            // 当前所有者
        brand_name: String,        // 品牌名称
        content_hash: vector<u8>,  // 内容哈希
        content_url: String,       // 内容URL或指针
        lease_start: u64,          // 租约开始时间
        lease_end: u64,            // 租约结束时间
        is_active: bool,           // 是否激活
    }

    // 事件定义
    public struct AdContentUpdated has copy, drop {
        nft_id: ID,
        content_hash: vector<u8>,
        content_url: String,
        updated_by: address
    }

    public struct AdStatusUpdated has copy, drop {
        nft_id: ID,
        is_active: bool,
        updated_by: address
    }

    public struct LeaseRenewed has copy, drop {
        nft_id: ID,
        renewed_by: address,
        lease_end: u64,
        price: u64
    }

    // 创建NFT
    public fun create_nft(
        ad_space: &AdSpace,
        brand_name: String,
        content_url: String,
        lease_duration: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ): AdBoardNFT {
        assert!(lease_duration >= MIN_LEASE_DAYS && lease_duration <= MAX_LEASE_DAYS, EInvalidLeaseDuration);
        
        let nft = AdBoardNFT {
            id: object::new(ctx),
            owner: tx_context::sender(ctx),
            ad_space_id: object::id(ad_space),
            brand_name,
            content_hash: vector::empty(),
            content_url,
            lease_start: clock::timestamp_ms(clock) / 1000,
            lease_end: (clock::timestamp_ms(clock) / 1000) + (lease_duration * SECONDS_PER_DAY),
            is_active: true
        };

        nft
    }

    // 更新广告内容
    public fun update_content(
        nft: &mut AdBoardNFT,
        content_hash: vector<u8>,
        content_url: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == nft.owner, ENotOwner);
        assert!(clock::timestamp_ms(clock) / 1000 <= nft.lease_end, ELeaseExpired);
        
        nft.content_hash = content_hash;
        nft.content_url = content_url;
        
        event::emit(AdContentUpdated {
            nft_id: object::id(nft),
            content_hash,
            content_url,
            updated_by: tx_context::sender(ctx)
        });
    }

    // 设置广告活跃状态
    public fun set_active_status(
        nft: &mut AdBoardNFT,
        is_active: bool,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == nft.owner, ENotOwner);
        
        nft.is_active = is_active;
        
        event::emit(AdStatusUpdated {
            nft_id: object::id(nft),
            is_active,
            updated_by: tx_context::sender(ctx)
        });
    }

    // 续租广告位
    public fun renew_lease(
        nft: &mut AdBoardNFT,
        lease_duration: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == nft.owner, ENotOwner);
        assert!(lease_duration >= MIN_LEASE_DAYS && lease_duration <= MAX_LEASE_DAYS, EInvalidLeaseDuration);
        
        nft.lease_end = nft.lease_end + (lease_duration * SECONDS_PER_DAY);
        
        event::emit(LeaseRenewed {
            nft_id: object::id(nft),
            renewed_by: tx_context::sender(ctx),
            lease_end: nft.lease_end,
            price: lease_duration * SECONDS_PER_DAY
        });
    }

    // Getter 函数
    public fun is_active(nft: &AdBoardNFT): bool {
        nft.is_active
    }

    public fun get_lease_status(nft: &AdBoardNFT, clock: &Clock): bool {
        clock::timestamp_ms(clock) / 1000 <= nft.lease_end
    }

    public fun get_owner(nft: &AdBoardNFT): address {
        nft.owner
    }

    public fun get_ad_space_id(nft: &AdBoardNFT): ID {
        nft.ad_space_id
    }

    // 转移NFT
    public fun transfer_nft(nft: AdBoardNFT, recipient: address) {
        transfer::transfer(nft, recipient)
    }
} 