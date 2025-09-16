const { getRedisClient } = require('../config/redis');

class RedisService {
  constructor() {
    this.client = null;
    this.initClient();
  }

  initClient() {
    try {
      this.client = getRedisClient();
    } catch (error) {
      console.warn('⚠️  Redis not available, running without pub-sub features');
      this.client = null;
    }
  }

  async publish(channel, message) {
    try {
      if (!this.client) {
        console.warn('⚠️  Redis not available, skipping publish to', channel);
        return false;
      }

      const messageString = typeof message === 'string' ? message : JSON.stringify(message);
      await this.client.publish(channel, messageString);
      console.log(`📤 Published message to ${channel}`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to publish to ${channel}:`, error);
      return false;
    }
  }

  async set(key, value, expireSeconds = null) {
    try {
      if (!this.client) {
        console.warn('⚠️  Redis not available, skipping cache set for', key);
        return false;
      }

      const valueString = typeof value === 'string' ? value : JSON.stringify(value);
      
      if (expireSeconds) {
        await this.client.setex(key, expireSeconds, valueString);
      } else {
        await this.client.set(key, valueString);
      }

      return true;

    } catch (error) {
      console.error(`❌ Failed to set cache key ${key}:`, error);
      return false;
    }
  }

  async get(key) {
    try {
      if (!this.client) {
        return null;
      }

      const value = await this.client.get(key);
      
      if (!value) {
        return null;
      }

      try {
        return JSON.parse(value);
      } catch {
        return value; // Return as string if not JSON
      }

    } catch (error) {
      console.error(`❌ Failed to get cache key ${key}:`, error);
      return null;
    }
  }

  async delete(key) {
    try {
      if (!this.client) {
        return false;
      }

      await this.client.del(key);
      return true;

    } catch (error) {
      console.error(`❌ Failed to delete cache key ${key}:`, error);
      return false;
    }
  }

  async cacheAudienceSize(segmentId, rules, audienceSize) {
    const cacheKey = `audience_size:${segmentId}:${JSON.stringify(rules)}`;
    const cacheExpire = 5 * 60; // 5 minutes
    
    await this.set(cacheKey, { audienceSize, timestamp: Date.now() }, cacheExpire);
  }

  async getCachedAudienceSize(segmentId, rules) {
    const cacheKey = `audience_size:${segmentId}:${JSON.stringify(rules)}`;
    const cached = await this.get(cacheKey);
    
    if (cached && cached.audienceSize !== undefined) {
      console.log(`📋 Using cached audience size for segment ${segmentId}: ${cached.audienceSize}`);
      return cached.audienceSize;
    }
    
    return null;
  }

  async cacheCustomerSegmentation(customerId, segments) {
    const cacheKey = `customer_segments:${customerId}`;
    const cacheExpire = 10 * 60; // 10 minutes
    
    await this.set(cacheKey, segments, cacheExpire);
  }

  async getCachedCustomerSegmentation(customerId) {
    const cacheKey = `customer_segments:${customerId}`;
    return await this.get(cacheKey);
  }

  async incrementCounter(key, expireSeconds = 3600) {
    try {
      if (!this.client) {
        return 1;
      }

      const current = await this.client.incr(key);
      
      if (current === 1) {
        // Set expiration only when creating new key
        await this.client.expire(key, expireSeconds);
      }

      return current;

    } catch (error) {
      console.error(`❌ Failed to increment counter ${key}:`, error);
      return 1;
    }
  }

  async rateLimitCheck(identifier, maxRequests = 100, windowSeconds = 3600) {
    const key = `rate_limit:${identifier}`;
    const current = await this.incrementCounter(key, windowSeconds);
    
    return {
      allowed: current <= maxRequests,
      current,
      remaining: Math.max(0, maxRequests - current),
      resetTime: Date.now() + (windowSeconds * 1000)
    };
  }

  async queueCampaignDelivery(campaignData) {
    const queueKey = 'campaign_delivery_queue';
    
    try {
      if (!this.client) {
        console.warn('⚠️  Redis not available, cannot queue campaign delivery');
        return false;
      }

      await this.client.lpush(queueKey, JSON.stringify({
        ...campaignData,
        queuedAt: Date.now()
      }));

      console.log(`📬 Queued campaign delivery: ${campaignData.campaignId}`);
      return true;

    } catch (error) {
      console.error('❌ Failed to queue campaign delivery:', error);
      return false;
    }
  }

  async dequeueCampaignDelivery() {
    const queueKey = 'campaign_delivery_queue';
    
    try {
      if (!this.client) {
        return null;
      }

      const item = await this.client.brpop(queueKey, 5); // 5 second timeout
      
      if (item && item[1]) {
        return JSON.parse(item[1]);
      }

      return null;

    } catch (error) {
      console.error('❌ Failed to dequeue campaign delivery:', error);
      return null;
    }
  }

  async getHealth() {
    try {
      if (!this.client) {
        return { status: 'disconnected', message: 'Redis client not initialized' };
      }

      await this.client.ping();
      return { status: 'connected', message: 'Redis connection healthy' };

    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }
}

module.exports = new RedisService();
