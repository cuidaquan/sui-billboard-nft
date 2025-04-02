/// 链上动态广告牌NFT系统服务费管理模块
module sui_billboard_nft::service_fee {
    use std::string::String;
    use std::option::{Self, Option};
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::clock::{Self, Clock};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::dynamic_field as df;
    use std::vector;
    use sui_billboard_nft::billboard_nft::{PlatformCap, AdBoardNFT};
    use sui::table::{Self, Table};

    // 错误码定义
    const ENotAuthorized: u64 = 1;
    const EInsufficientFunds: u64 = 3;
    const EInvalidFeeConfig: u64 = 4;

    // 服务费配置
    public struct ServiceFeeConfig has key, store {
        id: UID,
        platform_admin: address,
        monthly_base_fee: u64,
        storage_fee_per_kb: u64,
        content_update_fee: u64,
        platform_fee_percent: u64,
        dev_fee_percent: u64,
        created_at: u64,
        last_updated: u64
    }

    // 收费记录
    public struct FeeRecord has store, drop {
        nft_id: ID,
        amount: u64,
        charge_time: u64,
        next_charge_time: u64,
        storage_size: u64,
        update_count: u64
    }

    // 服务费收取历史
    public struct FeeHistory has key, store {
        id: UID,
        records: Table<ID, vector<FeeRecord>>
    }

    // 创建服务费配置
    public fun create_fee_config(
        platform_cap: &PlatformCap,
        base_monthly_fee: u64,
        storage_fee_per_kb: u64,
        content_update_fee: u64,
        platform_fee_percentage: u64,
        dev_fee_percentage: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ): ServiceFeeConfig {
        // 验证平台权限，确保调用者是平台管理员
        assert!(tx_context::sender(ctx) == sui_billboard_nft::billboard_nft::get_admin(platform_cap), ENotAuthorized);
        
        // 验证配置合法性
        assert!(platform_fee_percentage + dev_fee_percentage <= 100, EInvalidFeeConfig);
        
        let config = ServiceFeeConfig {
            id: object::new(ctx),
            platform_admin: sui_billboard_nft::billboard_nft::get_admin(platform_cap),
            monthly_base_fee: base_monthly_fee,
            storage_fee_per_kb,
            content_update_fee,
            platform_fee_percent: platform_fee_percentage,
            dev_fee_percent: dev_fee_percentage,
            created_at: clock::timestamp_ms(clock) / 1000,
            last_updated: clock::timestamp_ms(clock) / 1000
        };
        
        event::emit(FeeConfigCreated {
            config_id: object::id(&config),
            monthly_base_fee: base_monthly_fee,
            storage_fee_per_kb,
            content_update_fee,
            platform_fee_percent: platform_fee_percentage,
            dev_fee_percent: dev_fee_percentage,
            created_at: clock::timestamp_ms(clock) / 1000
        });
        
        config
    }

    // 更新服务费配置
    public fun update_fee_config(
        config: &mut ServiceFeeConfig,
        platform_cap: &PlatformCap,
        base_monthly_fee: u64,
        storage_fee_per_kb: u64,
        content_update_fee: u64,
        platform_fee_percentage: u64,
        dev_fee_percentage: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // 验证平台权限
        assert!(tx_context::sender(ctx) == sui_billboard_nft::billboard_nft::get_admin(platform_cap), ENotAuthorized);
        
        // 验证配置合法性
        assert!(platform_fee_percentage + dev_fee_percentage <= 100, EInvalidFeeConfig);
        
        // 保存旧配置
        let old_base_fee = config.monthly_base_fee;
        let old_platform_percentage = config.platform_fee_percent;
        let old_dev_percentage = config.dev_fee_percent;
        
        // 更新配置
        config.monthly_base_fee = base_monthly_fee;
        config.storage_fee_per_kb = storage_fee_per_kb;
        config.content_update_fee = content_update_fee;
        config.platform_fee_percent = platform_fee_percentage;
        config.dev_fee_percent = dev_fee_percentage;
        config.last_updated = clock::timestamp_ms(clock) / 1000;
        
        event::emit(FeeConfigUpdated {
            config_id: object::id(config),
            old_base_fee,
            new_base_fee: base_monthly_fee,
            old_platform_percentage,
            new_platform_percentage: platform_fee_percentage,
            old_dev_percentage,
            new_dev_percentage: dev_fee_percentage
        });
    }

    // 计算月服务费
    public fun calculate_monthly_fee(
        _nft: &AdBoardNFT,
        config: &ServiceFeeConfig,
        updates_count: u64,
        storage_size: u64
    ): u64 {
        // 基础月费
        let base_fee = config.monthly_base_fee;
        
        // 存储费用
        let storage_fee = config.storage_fee_per_kb * (storage_size / 1024 + 1);
        
        // 更新费用
        let update_fee = config.content_update_fee * updates_count;
        
        // 总费用
        base_fee + storage_fee + update_fee
    }

    // 收取服务费
    public fun charge_service_fee(
        nft: &AdBoardNFT,
        config: &ServiceFeeConfig,
        platform_cap: &PlatformCap,
        mut payment: Coin<SUI>,
        updates_count: u64,
        storage_size: u64,
        platform_address: address,
        dev_address: address,
        fee_history: &mut FeeHistory,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // 验证平台权限
        assert!(tx_context::sender(ctx) == sui_billboard_nft::billboard_nft::get_admin(platform_cap), ENotAuthorized);
        
        // 获取当前时间
        let current_time = clock::timestamp_ms(clock) / 1000;
        
        // 计算应收费用
        let total_fee = calculate_monthly_fee(nft, config, updates_count, storage_size);
        
        // 检查支付金额
        assert!(coin::value(&payment) >= total_fee, EInsufficientFunds);
        
        // 计算平台和开发商分成
        let platform_fee = total_fee * config.platform_fee_percent / 100;
        let dev_fee = total_fee * config.dev_fee_percent / 100;
        
        // 转账给平台
        if (platform_fee > 0) {
            let platform_payment = coin::split(&mut payment, platform_fee, ctx);
            transfer::public_transfer(platform_payment, platform_address);
        };
        
        // 转账给开发商
        if (dev_fee > 0) {
            let dev_payment = coin::split(&mut payment, dev_fee, ctx);
            transfer::public_transfer(dev_payment, dev_address);
        };
        
        // 如果还有剩余，退还给用户
        if (coin::value(&payment) > 0) {
            transfer::public_transfer(payment, sui_billboard_nft::billboard_nft::get_nft_owner(nft));
        } else {
            coin::destroy_zero(payment);
        };
        
        // 创建收费记录
        let fee_record = FeeRecord {
            nft_id: object::id(nft),
            amount: total_fee,
            charge_time: current_time,
            next_charge_time: current_time + 30 * 24 * 3600, // 30天后
            storage_size,
            update_count: updates_count
        };
        
        event::emit(ServiceFeeCharged {
            nft_id: object::id(nft),
            owner: sui_billboard_nft::billboard_nft::get_nft_owner(nft),
            amount: total_fee,
            platform_fee,
            dev_fee,
            charged_at: current_time,
            next_charge_at: current_time + 30 * 24 * 3600
        });
        
        // 添加到历史记录
        let records = table::borrow_mut(&mut fee_history.records, object::id(nft));
        vector::push_back(records, fee_record);
    }

    // 获取下一次收费时间
    public fun get_next_charge_time(fee_history: &FeeHistory, nft_id: ID): u64 {
        if (!table::contains(&fee_history.records, nft_id)) {
            return 0
        };
        
        let records = table::borrow(&fee_history.records, nft_id);
        let len = vector::length(records);
        if (len == 0) {
            return 0
        };
        
        let last_record = vector::borrow(records, len - 1);
        last_record.next_charge_time
    }

    // 事件定义
    public struct FeeConfigCreated has copy, drop {
        config_id: ID,
        monthly_base_fee: u64,
        storage_fee_per_kb: u64,
        content_update_fee: u64,
        platform_fee_percent: u64,
        dev_fee_percent: u64,
        created_at: u64
    }

    public struct FeeConfigUpdated has copy, drop {
        config_id: ID,
        old_base_fee: u64,
        new_base_fee: u64,
        old_platform_percentage: u64,
        new_platform_percentage: u64,
        old_dev_percentage: u64,
        new_dev_percentage: u64
    }

    public struct ServiceFeeCharged has copy, drop {
        nft_id: ID,
        owner: address,
        amount: u64,
        platform_fee: u64,
        dev_fee: u64,
        charged_at: u64,
        next_charge_at: u64
    }
} 