import Redis from 'ioredis';

export class CacheService {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, value);
      } else {
        await this.redis.set(key, value);
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('Cache del error:', error);
    }
  }

  async invalidateChatList(agentId: number): Promise<void> {
    await this.del(CacheService.chatListKey(agentId));
  }

  async invalidateRecentMessages(agentId: number, customerId: number): Promise<void> {
    await this.del(CacheService.recentMessagesKey(agentId, customerId));
  }

  async invalidateBotContext(agentId: number, customerId: number): Promise<void> {
    await this.del(CacheService.botContextKey(agentId, customerId));
  }

  // Cache keys
  static chatListKey(agentId: number): string {
    return `chat_list:${agentId}`;
  }

  static recentMessagesKey(agentId: number, customerId: number): string {
    return `recent_messages:${agentId}:${customerId}`;
  }

  static botContextKey(agentId: number, customerId: number): string {
    return `bot_context:${agentId}:${customerId}`;
  }
}