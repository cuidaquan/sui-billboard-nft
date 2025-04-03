module sui_billboard_nft::factory {
    use sui::object::{UID, ID};
    use sui::tx_context::TxContext;
    use sui::transfer;
    use sui::table::{Self, Table};
    use sui::event;

    // 错误码
    const ENotAuthorized: u64 = 1;
    const EInvalidPlatformRatio: u64 = 2;

    // 工厂结构，用于管理广告位和分成比例
    public struct Factory has key {
        id: UID,
        admin: address,
        ad_spaces: Table<ID, address>,  // 广告位ID到创建者地址的映射
        platform_ratio: u8   // 平台分成比例，百分比
    }

    // 事件定义
    public struct FactoryCreated has copy, drop {
        admin: address,
        platform_ratio: u8
    }

    public struct AdSpaceRegistered has copy, drop {
        ad_space_id: ID,
        creator: address
    }

    public struct RatioUpdated has copy, drop {
        factory_id: ID,
        platform_ratio: u8
    }

    // 默认分成比例
    const DEFAULT_PLATFORM_RATIO: u8 = 10;  // 平台默认分成 10%

    // 初始化工厂
    public fun init_factory(ctx: &mut TxContext) {
        let factory = Factory {
            id: object::new(ctx),
            admin: tx_context::sender(ctx),
            ad_spaces: table::new<ID, address>(ctx),
            platform_ratio: DEFAULT_PLATFORM_RATIO
        };
        
        transfer::share_object(factory);
        
        event::emit(FactoryCreated {
            admin: tx_context::sender(ctx),
            platform_ratio: DEFAULT_PLATFORM_RATIO
        });
    }

    // 注册广告位
    public fun register_ad_space(
        factory: &mut Factory,
        ad_space_id: ID,
        creator: address
    ) {
        table::add(&mut factory.ad_spaces, ad_space_id, creator);

        event::emit(AdSpaceRegistered {
            ad_space_id,
            creator
        });
    }

    // 获取广告位创建者
    public fun get_ad_space_creator(factory: &Factory, ad_space_id: ID): address {
        *table::borrow(&factory.ad_spaces, ad_space_id)
    }

    // 获取管理员地址
    public fun get_admin(factory: &Factory): address {
        factory.admin
    }

    // 更新分成比例
    public fun update_ratios(
        factory: &mut Factory,
        platform_ratio: u8,
        ctx: &mut TxContext
    ) {
        // 只有管理员可以更新
        assert!(tx_context::sender(ctx) == factory.admin, ENotAuthorized);

        // 验证分成比例的有效性
        assert!(platform_ratio <= 100, EInvalidPlatformRatio);

        factory.platform_ratio = platform_ratio;

        event::emit(RatioUpdated {
            factory_id: object::id(factory),
            platform_ratio
        });
    }

    // 获取平台分成比例
    public fun get_platform_ratio(factory: &Factory): u8 {
        factory.platform_ratio
    }
} 