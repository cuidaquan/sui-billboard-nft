/// 链上动态广告牌NFT系统权限管理模块
module sui_billboard_nft::permissions {
    use std::string::{Self, String};
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::clock::{Self, Clock};
    use sui::table::{Self, Table};
    use std::vector;

    // 错误码定义
    const ENotAuthorized: u64 = 1;
    const EPermissionExpired: u64 = 2;
    const EActionRestricted: u64 = 3;
    const EResourceRestricted: u64 = 4;
    const EPermissionInactive: u64 = 5;

    // 委托权限结构
    public struct DelegatedPermission has key, store {
        id: UID,
        granter: address,
        grantee: address,
        role: String,
        actions: vector<String>,
        resources: vector<ID>,
        expiration: u64,
        is_active: bool
    }

    // 委托权限给另一个地址
    public fun delegate_permission(
        role: String,
        actions: vector<String>,
        resources: vector<ID>,
        grantee: address,
        expiration: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ): DelegatedPermission {
        // 验证有效期
        let current_time = clock::timestamp_ms(clock) / 1000;
        assert!(expiration > current_time, EPermissionExpired);
        
        let permission = DelegatedPermission {
            id: object::new(ctx),
            granter: tx_context::sender(ctx),
            grantee,
            role,
            actions,
            resources,
            expiration,
            is_active: true
        };
        
        event::emit(PermissionDelegated {
            permission_id: object::id(&permission),
            granter: tx_context::sender(ctx),
            grantee,
            role,
            expiration
        });
        
        permission
    }

    // 撤销委托权限
    public fun revoke_delegated_permission(
        permission: &mut DelegatedPermission,
        ctx: &mut TxContext
    ) {
        // 验证撤销权限
        assert!(
            tx_context::sender(ctx) == permission.granter,
            ENotAuthorized
        );
        
        permission.is_active = false;
        
        event::emit(PermissionRevoked {
            permission_id: object::id(permission),
            revoked_by: tx_context::sender(ctx)
        });
    }

    // 执行权限操作
    public fun execute_permission(
        permission: &DelegatedPermission,
        action: String,
        resource_id: ID,
        clock: &Clock,
        ctx: &mut TxContext
    ): bool {
        // 验证权限是否激活
        assert!(permission.is_active, EPermissionInactive);
        
        // 验证执行者身份
        assert!(
            tx_context::sender(ctx) == permission.grantee,
            ENotAuthorized
        );
        
        // 验证有效期
        let current_time = clock::timestamp_ms(clock) / 1000;
        assert!(current_time <= permission.expiration, EPermissionExpired);
        
        // 验证操作权限
        let mut action_allowed = false;
        let mut i = 0;
        let actions_len = vector::length(&permission.actions);
        
        while (i < actions_len) {
            if (*vector::borrow(&permission.actions, i) == action) {
                action_allowed = true;
                break
            };
            i = i + 1;
        };
        
        assert!(action_allowed, EActionRestricted);
        
        // 验证资源权限
        let mut resource_allowed = false;
        let mut i = 0;
        let resources_len = vector::length(&permission.resources);
        
        while (i < resources_len) {
            if (*vector::borrow(&permission.resources, i) == resource_id) {
                resource_allowed = true;
                break
            };
            i = i + 1;
        };
        
        assert!(resource_allowed, EResourceRestricted);
        
        event::emit(PermissionExecuted {
            permission_id: object::id(permission),
            executor: tx_context::sender(ctx),
            action,
            resource_id,
            executed_at: current_time
        });
        
        true
    }

    // 转移权限给另一个地址
    #[allow(lint(custom_state_change))]
    public fun transfer_permission(
        permission: DelegatedPermission,
        recipient: address,
        ctx: &mut TxContext
    ) {
        // 验证转移权限
        assert!(
            tx_context::sender(ctx) == permission.grantee,
            ENotAuthorized
        );
        
        event::emit(PermissionTransferred {
            permission_id: object::id(&permission),
            from: tx_context::sender(ctx),
            to: recipient
        });
        
        transfer::transfer(permission, recipient);
    }
    
    // 用于测试的权限创建函数
    #[test_only]
    public fun create_permission_for_testing(
        granter: address,
        grantee: address,
        role: String,
        actions: vector<String>,
        resources: vector<ID>,
        expiration: u64,
        is_active: bool,
        ctx: &mut TxContext
    ): DelegatedPermission {
        DelegatedPermission {
            id: object::new(ctx),
            granter,
            grantee,
            role,
            actions,
            resources,
            expiration,
            is_active
        }
    }

    // 事件定义
    public struct PermissionDelegated has copy, drop {
        permission_id: ID,
        granter: address,
        grantee: address,
        role: String,
        expiration: u64
    }

    public struct PermissionRevoked has copy, drop {
        permission_id: ID,
        revoked_by: address
    }

    public struct PermissionExecuted has copy, drop {
        permission_id: ID,
        executor: address,
        action: String,
        resource_id: ID,
        executed_at: u64
    }

    public struct PermissionTransferred has copy, drop {
        permission_id: ID,
        from: address,
        to: address
    }

    // 检查是否具有指定操作的权限
    public fun has_permission(permission: &DelegatedPermission, action: String): bool {
        let allowed_actions = &permission.actions;
        
        let mut action_allowed = false;
        let mut i = 0;
        let actions_length = vector::length(allowed_actions);
        
        while (i < actions_length) {
            let current_action = vector::borrow(allowed_actions, i);
            if (string::to_ascii(*current_action) == string::to_ascii(action)) {
                action_allowed = true;
                break
            };
            i = i + 1;
        };
        
        action_allowed
    }
    
    // 检查是否具有对特定资源的操作权限
    public fun has_resource_permission(permission: &DelegatedPermission, resource_id: ID): bool {
        let allowed_resources = &permission.resources;
        
        let mut resource_allowed = false;
        let mut i = 0;
        let resources_length = vector::length(allowed_resources);
        
        while (i < resources_length) {
            let current_resource = vector::borrow(allowed_resources, i);
            if (*current_resource == resource_id) {
                resource_allowed = true;
                break
            };
            i = i + 1;
        };
        
        resource_allowed
    }
} 