/// 链上动态广告牌NFT系统核心模块
module sui_billboard_nft::billboard_nft {
    // 导入标准库和Sui框架
    use std::string::{Self, String};
    use std::option::{Self, Option};
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::table::{Self, Table};
    use sui::clock::{Self, Clock};
    use sui::event;
    use sui::package;
    use std::vector;
    
    use sui::display;
    
    use sui_billboard_nft::permissions;
    use sui_billboard_nft::service_fee;

    // 定义错误码   
    const EInvalidLeaseDuration: u64 = 1;
    const EInvalidAdContent: u64 = 2;
    const EInvalidPlatform: u64 = 4;
    const EInvalidBrand: u64 = 5;
    const EInvalidAdSpace: u64 = 6;
    const ENotOwner: u64 = 8;
    const EInvalidGame: u64 = 11;
    const EAdSpaceNotAvailable: u64 = 10;
    const EInsufficientPayment: u64 = 3;
    const ELeaseExpired: u64 = 9;
    const ENotAuthorized: u64 = 7;
    const ENotGameDev: u64 = 9;
    const EInvalidAdSize: u64 = 10;

    // 定义租期常量
    const SECONDS_PER_DAY: u64 = 24 * 60 * 60;
    const MAX_LEASE_DAYS: u64 = 365; // 最大租期365天
    const MIN_LEASE_DAYS: u64 = 1;   // 最小租期1天

    // NFT系统发布者标识
    public struct BILLBOARD_NFT has drop {}

    // 平台能力结构，用于授权和管理广告位
    public struct PlatformCap has key, store {
        id: UID,
        admin: address,
        capabilities: vector<String>
    }

    // 游戏开发者能力结构，用于创建广告位
    public struct GameDevCap has key, store {
        id: UID,
        game_ids: vector<String>,
        developer: address,
    }

    // 广告位结构
    public struct AdSpace has key, store {
        id: UID,
        game_id: String,          // 游戏ID
        location: String,         // 位置信息
        size: String,            // 广告尺寸
        is_available: bool,        // 是否可购买
        creator: address,          // 创建者地址
        created_at: u64,           // 创建时间
        fixed_price: u64,          // 基础固定价格(以SUI为单位)
    }

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

    // 模块初始化函数
    fun init(otw: BILLBOARD_NFT, ctx: &mut TxContext) {
        // 创建平台能力并转移给部署者
        let platform_cap = PlatformCap {
            id: object::new(ctx),
            admin: tx_context::sender(ctx),
            capabilities: vector[
                string::utf8(b"CREATE_GAME_DEV"),
                string::utf8(b"UPDATE_CONFIG"),
                string::utf8(b"MANAGE_FEES")
            ]
        };
        
        transfer::transfer(platform_cap, tx_context::sender(ctx));
        
        // 创建Display信息，用于展示NFT的元数据
        let publisher = package::claim(otw, ctx);
        
        let keys = vector[
            string::utf8(b"name"), 
            string::utf8(b"description"),
            string::utf8(b"image_url"),
            string::utf8(b"link"),
            string::utf8(b"brand"),
            string::utf8(b"game"),
            string::utf8(b"location")
        ];
        
        let values = vector[
            string::utf8(b"{brand_name} Billboard"),
            string::utf8(b"A dynamic advertisement billboard NFT for {brand_name} in {game_id} at {location}"),
            string::utf8(b"{content_url}"),
            string::utf8(b"{content_url}"),
            string::utf8(b"{brand_name}"),
            string::utf8(b"{game_id}"),
            string::utf8(b"{location}")
        ];
        
        // 创建NFT的Display配置
        let mut display = display::new_with_fields<AdBoardNFT>(
            &publisher, keys, values, ctx
        );
        
        display::update_version(&mut display);
        
        transfer::public_transfer(publisher, tx_context::sender(ctx));
        transfer::public_transfer(display, tx_context::sender(ctx));
        
        event::emit(SystemInitialized {
            admin: tx_context::sender(ctx)
        });
    }

    // 创建游戏开发者能力
    public entry fun create_game_dev_cap(
        _platform_cap: &PlatformCap,
        game_ids: vector<String>,
        developer: address,
        ctx: &mut TxContext
    ) {
        let game_dev_cap = GameDevCap {
            id: object::new(ctx),
            game_ids,
            developer,
        };
        
        transfer::transfer(game_dev_cap, developer);
        
        event::emit(GameDevCapCreated {
            developer,
            game_ids
        });
    }

    // 创建广告位，只有游戏开发者能调用
    public entry fun create_ad_space(
        game_dev_cap: &GameDevCap,
        game_id: String,
        location: String,
        size: String,
        fixed_price: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // 确认游戏ID在开发者能力中
        let mut contains_game = false;
        let mut i = 0;
        let game_ids_len = vector::length(&game_dev_cap.game_ids);
        
        while (i < game_ids_len) {
            if (*vector::borrow(&game_dev_cap.game_ids, i) == game_id) {
                contains_game = true;
                break
            };
            i = i + 1;
        };
        
        assert!(contains_game, EInvalidGame);
        assert!(tx_context::sender(ctx) == game_dev_cap.developer, ENotGameDev);
        
        // 验证广告尺寸格式 (例如: "300x250")
        let size_bytes = *string::as_bytes(&size);
        let mut has_x = false;
        let size_len = vector::length(&size_bytes);
        
        let mut i = 0;
        while (i < size_len) {
            if (*vector::borrow(&size_bytes, i) == 120) { // ASCII 'x'
                has_x = true;
                break
            };
            i = i + 1;
        };
        
        assert!(has_x, EInvalidAdSize);
        
        let current_time = clock::timestamp_ms(clock) / 1000;
        
        // 创建广告位
        let ad_space = AdSpace {
            id: object::new(ctx),
            game_id,
            location,
            size,
            is_available: true,
            creator: tx_context::sender(ctx),
            created_at: current_time,
            fixed_price,
        };
        
        // 获取ID用于事件
        let ad_space_id = object::id(&ad_space);
        
        // 将广告位对象共享到链上
        transfer::share_object(ad_space);
        
        event::emit(AdSpaceCreated {
            ad_space_id,
            game_id,
            location,
            size,
            creator: tx_context::sender(ctx)
        });
    }
    
    // 更新广告位价格
    public entry fun update_ad_space_price(
        ad_space: &mut AdSpace,
        new_price: u64,
        ctx: &mut TxContext
    ) {
        // 仅允许广告位创建者更新价格
        assert!(tx_context::sender(ctx) == ad_space.creator, ENotAuthorized);
        
        ad_space.fixed_price = new_price;
        
        event::emit(AdSpacePriceUpdated {
            ad_space_id: object::id(ad_space),
            new_price,
            updated_by: tx_context::sender(ctx)
        });
    }

    // 购买广告位并创建NFT
    public entry fun purchase_ad_space(
        ad_space: &mut AdSpace,
        mut payment: Coin<SUI>,
        lease_duration: u64,
        ad_content: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // 验证广告位是否可购买
        assert!(ad_space.is_available, EAdSpaceNotAvailable);
        
        // 获取当前时间
        let current_time = clock::timestamp_ms(clock) / 1000;
        
        // 验证租期在1-365天之间
        assert!(lease_duration >= MIN_LEASE_DAYS && lease_duration <= MAX_LEASE_DAYS, EInvalidLeaseDuration);
        
        // 计算价格
        let price = calculate_price(ad_space, lease_duration);
        
        // 确保支付足够
        assert!(coin::value(&payment) >= price, EInsufficientPayment);
        
        // 分割支付,返还多余金额
        let paid = coin::split(&mut payment, price, ctx);
        transfer::public_transfer(paid, ad_space.creator);
        transfer::public_transfer(payment, tx_context::sender(ctx));
        
        // 创建NFT
        let nft = AdBoardNFT {
            id: object::new(ctx),
            ad_space_id: object::id(ad_space),
            owner: tx_context::sender(ctx),
            brand_name: string::utf8(b"Brand Name"),
            content_hash: ad_content,
            content_url: string::utf8(b"Content URL"),
            lease_start: current_time,
            lease_end: current_time + (lease_duration * SECONDS_PER_DAY),
            is_active: true,
        };
        
        // 设置广告位为不可用
        ad_space.is_available = false;
        
        // 获取ID用于事件
        let nft_id = object::id(&nft);
        
        // 转移NFT给购买者
        transfer::public_transfer(nft, tx_context::sender(ctx));
        
        event::emit(AdSpacePurchased {
            ad_space_id: object::id(ad_space),
            nft_id,
            buyer: tx_context::sender(ctx),
            price,
            lease_end: current_time + (lease_duration * SECONDS_PER_DAY),
            is_permanent: false
        });
    }

    /// 计算广告位租金
    fun calculate_price(ad_space: &AdSpace, duration_days: u64): u64 {
        // 检查租期限制：最少1天，最多365天
        assert!(duration_days >= MIN_LEASE_DAYS && duration_days <= MAX_LEASE_DAYS, EInvalidLeaseDuration);
        
        // fixed_price 现在代表1年的价格
        let yearly_price = ad_space.fixed_price;
        
        // 1天的价格是年租金的1/100
        let daily_min_price = yearly_price / 100;

        // 使用指数函数计算价格
        // 调整base值使得364天时价格为年租金的99.9%
        // 使用base = 99900 (0.999)，这样增长会更加平缓
        let mut price = daily_min_price;
        let base = 99900; // e^(-0.001) ≈ 0.999
        let mut factor = 100000; // 初始因子 (1.0)
        
        let mut i = 0;
        while (i < duration_days) {
            factor = factor * base / 100000;
            i = i + 1;
        };
        
        // 计算最终价格
        let price_range = yearly_price - daily_min_price;
        price = daily_min_price + price_range * (100000 - factor) / 100000;
        
        price
    }

    // 设置广告位可用性
    public entry fun set_ad_space_availability(
        ad_space: &mut AdSpace,
        is_available: bool,
        ctx: &mut TxContext
    ) {
        // 仅允许广告位创建者更新
        assert!(tx_context::sender(ctx) == ad_space.creator, ENotAuthorized);
        
        ad_space.is_available = is_available;
        
        event::emit(AdSpaceAvailabilityUpdated {
            ad_space_id: object::id(ad_space),
            is_available,
            updated_by: tx_context::sender(ctx)
        });
    }

    // 更新广告内容
    public entry fun update_ad_content(
        nft: &mut AdBoardNFT,
        content_hash: vector<u8>,
        content_url: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // 仅允许NFT所有者更新
        assert!(tx_context::sender(ctx) == nft.owner, ENotOwner);
        
        // 检查租约是否有效
        let current_time = clock::timestamp_ms(clock) / 1000;
        assert!(current_time <= nft.lease_end, ELeaseExpired);
        
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
    public entry fun set_ad_active_status(
        nft: &mut AdBoardNFT,
        is_active: bool,
        ctx: &mut TxContext
    ) {
        // 仅允许NFT所有者更新
        assert!(tx_context::sender(ctx) == nft.owner, ENotOwner);
        
        nft.is_active = is_active;
        
        event::emit(AdStatusUpdated {
            nft_id: object::id(nft),
            is_active,
            updated_by: tx_context::sender(ctx)
        });
    }

    // 释放过期的广告位
    public entry fun release_expired_ad_space(
        nft: &AdBoardNFT,
        ad_space: &mut AdSpace,
        clock: &Clock,
        _ctx: &mut TxContext
    ) {
        // 验证NFT对应的广告位ID
        assert!(object::id(ad_space) == nft.ad_space_id, EInvalidGame);
        
        // 检查租约是否已过期
        let current_time = clock::timestamp_ms(clock) / 1000;
        assert!(current_time > nft.lease_end, ELeaseExpired);
        
        // 设置广告位为可用
        ad_space.is_available = true;
        
        event::emit(AdSpaceReleased {
            ad_space_id: object::id(ad_space),
            nft_id: object::id(nft),
            released_at: current_time
        });
    }

    // 获取广告位ID
    public fun get_ad_space_id(nft: &AdBoardNFT): ID {
        nft.ad_space_id
    }

    // 获取NFT所有者
    public fun get_nft_owner(nft: &AdBoardNFT): address {
        nft.owner
    }

    // 获取广告位状态
    public fun is_ad_space_available(ad_space: &AdSpace): bool {
        ad_space.is_available
    }

    // 获取广告NFT状态
    public fun is_ad_active(nft: &AdBoardNFT): bool {
        nft.is_active
    }

    // 获取广告租约状态
    public fun get_lease_status(nft: &AdBoardNFT, clock: &Clock): bool {
        let current_time = clock::timestamp_ms(clock) / 1000;
        current_time <= nft.lease_end
    }

    // 获取广告位元数据
    public fun get_ad_space_metadata(ad_space: &AdSpace): (String, String, String) {
        (ad_space.game_id, ad_space.location, ad_space.size)
    }
    
    // 获取平台管理员地址
    public fun get_admin(cap: &PlatformCap): address {
        cap.admin
    }

    // 用于测试的初始化函数
    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        // 创建平台能力并转移给部署者
        let platform_cap = PlatformCap {
            id: object::new(ctx),
            admin: tx_context::sender(ctx),
            capabilities: vector[
                string::utf8(b"CREATE_GAME_DEV"),
                string::utf8(b"UPDATE_CONFIG"),
                string::utf8(b"MANAGE_FEES")
            ]
        };
        
        transfer::transfer(platform_cap, tx_context::sender(ctx));

        // 创建游戏开发者能力并转移给部署者
        let game_dev_cap = GameDevCap {
            id: object::new(ctx),
            game_ids: vector[string::utf8(b"Test Game")],
            developer: tx_context::sender(ctx),
        };
        
        transfer::transfer(game_dev_cap, tx_context::sender(ctx));
    }

    // 事件定义
    public struct SystemInitialized has copy, drop {
        admin: address
    }

    public struct GameDevCapCreated has copy, drop {
        developer: address,
        game_ids: vector<String>
    }

    public struct AdSpaceCreated has copy, drop {
        ad_space_id: ID,
        game_id: String,
        location: String,
        size: String,
        creator: address
    }

    public struct AdSpacePriceUpdated has copy, drop {
        ad_space_id: ID,
        new_price: u64,
        updated_by: address
    }

    public struct AdSpaceAvailabilityUpdated has copy, drop {
        ad_space_id: ID,
        is_available: bool,
        updated_by: address
    }

    public struct AdSpacePurchased has copy, drop {
        ad_space_id: ID,
        nft_id: ID,
        buyer: address,
        price: u64,
        lease_end: u64,
        is_permanent: bool
    }

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

    public struct AdSpaceReleased has copy, drop {
        ad_space_id: ID,
        nft_id: ID,
        released_at: u64
    }

    // 检查游戏开发者权限中是否包含指定游戏ID
    public fun is_game_dev_for(cap: &GameDevCap, game_id: String): bool {
        let game_ids = &cap.game_ids;
        let mut contains_game = false;
        let mut i = 0;
        let length = vector::length(game_ids);
        
        while (i < length) {
            if (string::to_ascii(*vector::borrow(game_ids, i)) == string::to_ascii(game_id)) {
                contains_game = true;
                break
            };
            i = i + 1;
        };
        
        contains_game
    }
    
    // 检查平台管理权限是否具有指定能力
    public fun has_platform_capability(cap: &PlatformCap, capability: String): bool {
        let capabilities = &cap.capabilities;
        let mut has_x = false;
        let mut i = 0;
        let length = vector::length(capabilities);
        
        while (i < length) {
            if (string::to_ascii(*vector::borrow(capabilities, i)) == string::to_ascii(capability)) {
                has_x = true;
                break
            };
            i = i + 1;
        };
        
        has_x
    }

    // 续租广告位
    public entry fun renew_lease(
        nft: &mut AdBoardNFT,
        ad_space: &AdSpace,
        mut payment: Coin<SUI>,
        lease_duration: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // 验证NFT所有权
        assert!(tx_context::sender(ctx) == nft.owner, ENotOwner);
        
        // 验证租期在1-365天之间
        assert!(lease_duration >= MIN_LEASE_DAYS && lease_duration <= MAX_LEASE_DAYS, EInvalidLeaseDuration);
        
        // 验证广告位ID匹配
        assert!(object::id(ad_space) == nft.ad_space_id, EInvalidAdSpace);
        
        // 获取当前时间
        let current_time = clock::timestamp_ms(clock) / 1000;
        
        // 计算价格
        let price = calculate_price(ad_space, lease_duration);
        
        // 确保支付足够
        assert!(coin::value(&payment) >= price, EInsufficientPayment);
        
        // 分割支付,返还多余金额
        let paid = coin::split(&mut payment, price, ctx);
        transfer::public_transfer(paid, ad_space.creator);
        transfer::public_transfer(payment, tx_context::sender(ctx));
        
        // 更新租约结束时间
        nft.lease_end = nft.lease_end + (lease_duration * SECONDS_PER_DAY);
        
        event::emit(LeaseRenewed {
            nft_id: object::id(nft),
            renewed_by: tx_context::sender(ctx),
            lease_end: nft.lease_end,
            price
        });
    }

    // 事件定义
    public struct LeaseRenewed has copy, drop {
        nft_id: ID,
        renewed_by: address,
        lease_end: u64,
        price: u64
    }

    // 获取广告位固定价格
    public fun get_fixed_price(ad_space: &AdSpace): u64 {
        ad_space.fixed_price
    }
}


