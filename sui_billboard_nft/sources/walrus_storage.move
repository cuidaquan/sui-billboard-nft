/// 链上动态广告牌NFT系统Walrus存储集成模块
module sui_billboard_nft::walrus_storage {
    use std::string::{Self, String};
    use std::option::{Self, Option};
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::clock::{Self, Clock};
    use sui::hash::{Self, blake2b256};
    use sui::bcs;
    use sui::table::{Self, Table};
    use std::vector;
    
    use sui_billboard_nft::billboard_nft::{Self, AdBoardNFT};

    // 错误码定义
    const ENotAuthorized: u64 = 1;
    const EInvalidContent: u64 = 2;
    const EContentTooLarge: u64 = 4;

    // 广告内容模拟Walrus存储结构
    public struct AdContent has key, store {
        id: UID,
        owner: address,
        image_url: Option<String>,
        video_url: Option<String>,
        text_content: Option<String>,
        click_action: Option<String>,
        content_hash: vector<u8>,
        size_bytes: u64,
        created_at: u64,
        last_updated: u64
    }

    // 内容存储仓库
    public struct ContentRepository has key {
        id: UID,
        contents: Table<ID, ID>
    }

    // 在模块初始化时创建内容仓库
    fun init(ctx: &mut TxContext) {
        let repo = ContentRepository {
            id: object::new(ctx),
            contents: table::new(ctx)
        };
        transfer::share_object(repo);
    }
    
    // 测试初始化函数
    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx)
    }

    // 创建广告内容
    public fun create_content(
        image_url: Option<String>,
        video_url: Option<String>,
        text_content: Option<String>,
        click_action: Option<String>,
        clock: &Clock,
        ctx: &mut TxContext
    ): AdContent {
        // 验证内容有效性
        assert!(
            option::is_some(&image_url) || 
            option::is_some(&video_url) || 
            option::is_some(&text_content), 
            EInvalidContent
        );
        
        // 计算内容大小（简化版）
        let mut size_bytes = if (option::is_some(&image_url)) {
            string::length(option::borrow(&image_url))
        } else {
            0
        };
        
        size_bytes = size_bytes + if (option::is_some(&video_url)) {
            string::length(option::borrow(&video_url))
        } else {
            0
        };
        
        size_bytes = size_bytes + if (option::is_some(&text_content)) {
            string::length(option::borrow(&text_content))
        } else {
            0
        };
        
        size_bytes = size_bytes + if (option::is_some(&click_action)) {
            string::length(option::borrow(&click_action))
        } else {
            0
        };
        
        // 限制内容大小
        assert!(size_bytes <= 1024 * 1024, EContentTooLarge); // 最大1MB
        
        // 创建内容
        let current_time = clock::timestamp_ms(clock) / 1000;
        
        // 计算内容哈希
        let mut mut_content = bcs::to_bytes(&image_url);
        vector::append(&mut mut_content, bcs::to_bytes(&video_url));
        vector::append(&mut mut_content, bcs::to_bytes(&text_content));
        vector::append(&mut mut_content, bcs::to_bytes(&click_action));
        let content_hash = blake2b256(&mut_content);
        
        let content = AdContent {
            id: object::new(ctx),
            owner: tx_context::sender(ctx),
            image_url,
            video_url,
            text_content,
            click_action,
            content_hash,
            size_bytes,
            created_at: current_time,
            last_updated: current_time
        };
        
        event::emit(ContentCreated {
            content_id: object::id(&content),
            owner: tx_context::sender(ctx),
            size_bytes,
            created_at: current_time
        });
        
        content
    }

    // 存储广告内容到仓库
    #[allow(lint(custom_state_change, share_owned))]
    public fun store_content(
        content: AdContent,
        repo: &mut ContentRepository,
        ctx: &mut TxContext
    ): ID {
        // 获取内容ID
        let content_id = object::id(&content);
        
        // 检查是否是内容所有者
        assert!(tx_context::sender(ctx) == content.owner, ENotAuthorized);
        
        // 共享内容对象
        let shared_id = object::id(&content);
        transfer::share_object(content);
        
        // 将内容ID添加到仓库
        table::add(&mut repo.contents, content_id, shared_id);
        
        event::emit(ContentStored {
            content_id,
            repository_id: object::id(repo),
            stored_by: tx_context::sender(ctx)
        });
        
        content_id
    }

    // 更新广告内容
    public fun update_content(
        content: &mut AdContent,
        image_url: Option<String>,
        video_url: Option<String>,
        text_content: Option<String>,
        click_action: Option<String>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // 验证内容所有权
        assert!(tx_context::sender(ctx) == content.owner, ENotAuthorized);
        
        // 验证内容有效性
        assert!(
            option::is_some(&image_url) || 
            option::is_some(&video_url) || 
            option::is_some(&text_content), 
            EInvalidContent
        );
        
        // 计算内容大小（简化版）
        let mut size_bytes = if (option::is_some(&image_url)) {
            string::length(option::borrow(&image_url))
        } else {
            0
        };
        
        size_bytes = size_bytes + if (option::is_some(&video_url)) {
            string::length(option::borrow(&video_url))
        } else {
            0
        };
        
        size_bytes = size_bytes + if (option::is_some(&text_content)) {
            string::length(option::borrow(&text_content))
        } else {
            0
        };
        
        size_bytes = size_bytes + if (option::is_some(&click_action)) {
            string::length(option::borrow(&click_action))
        } else {
            0
        };
        
        // 限制内容大小
        assert!(size_bytes <= 1024 * 1024, EContentTooLarge); // 最大1MB
        
        // 更新内容
        content.image_url = image_url;
        content.video_url = video_url;
        content.text_content = text_content;
        content.click_action = click_action;
        content.size_bytes = size_bytes;
        content.last_updated = clock::timestamp_ms(clock) / 1000;
        
        // 计算新的内容哈希
        let mut mut_content = bcs::to_bytes(&content.image_url);
        vector::append(&mut mut_content, bcs::to_bytes(&content.video_url));
        vector::append(&mut mut_content, bcs::to_bytes(&content.text_content));
        vector::append(&mut mut_content, bcs::to_bytes(&content.click_action));
        content.content_hash = blake2b256(&mut_content);
        
        event::emit(ContentUpdated {
            content_id: object::id(content),
            updated_by: tx_context::sender(ctx),
            size_bytes,
            updated_at: content.last_updated
        });
    }

    // 获取内容哈希
    public fun get_content_hash(content: &AdContent): vector<u8> {
        content.content_hash
    }

    // 获取内容大小
    public fun get_content_size(content: &AdContent): u64 {
        content.size_bytes
    }

    // 从存储库中查找内容
    public fun find_content(repo: &ContentRepository, content_id: ID): Option<ID> {
        if (table::contains(&repo.contents, content_id)) {
            option::some(*table::borrow(&repo.contents, content_id))
        } else {
            option::none()
        }
    }

    // 更新NFT的内容指针
    public fun update_nft_content(
        nft: &mut AdBoardNFT,
        content: &AdContent,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // 验证NFT所有权
        assert!(tx_context::sender(ctx) == billboard_nft::get_nft_owner(nft), ENotAuthorized);
        
        // 验证内容所有权
        assert!(tx_context::sender(ctx) == content.owner, ENotAuthorized);
        
        // 创建内容指针字符串
        let mut content_id_str = string::utf8(b"walrus://");
        let id_bytes = object::id_to_bytes(&object::id(content));
        let hex_str = to_hex_string(&id_bytes);
        string::append(&mut content_id_str, hex_str);
        
        // 更新NFT内容
        billboard_nft::update_ad_content(
            nft, 
            content.content_hash,
            content_id_str,
            clock,
            ctx
        );
        
        event::emit(NFTContentUpdated {
            nft_id: object::id(nft),
            content_id: object::id(content),
            updated_by: tx_context::sender(ctx)
        });
    }
    
    // 辅助函数：将字节数组转换为十六进制字符串
    fun to_hex_string(bytes: &vector<u8>): String {
        let hex_digits = b"0123456789abcdef";
        let mut result = string::utf8(b"");
        let mut i = 0;
        let len = vector::length(bytes);
        
        while (i < len) {
            let byte = *vector::borrow(bytes, i);
            let high = byte >> 4;
            let low = byte & 0xF;
            
            string::append_utf8(&mut result, vector::singleton(*vector::borrow(&hex_digits, (high as u64))));
            string::append_utf8(&mut result, vector::singleton(*vector::borrow(&hex_digits, (low as u64))));
            
            i = i + 1;
        };
        
        result
    }

    // 事件定义
    public struct ContentCreated has copy, drop {
        content_id: ID,
        owner: address,
        size_bytes: u64,
        created_at: u64
    }

    public struct ContentStored has copy, drop {
        content_id: ID,
        repository_id: ID,
        stored_by: address
    }

    public struct ContentUpdated has copy, drop {
        content_id: ID,
        updated_by: address,
        size_bytes: u64,
        updated_at: u64
    }

    public struct NFTContentUpdated has copy, drop {
        nft_id: ID,
        content_id: ID,
        updated_by: address
    }
}