const Redis = require('ioredis');

let redisClient;

const connectRedis = async () => {
  try {
    // Use Redis Cloud or local Redis
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redisClient = new Redis(redisUrl, {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });
    
    redisClient.on('connect', () => {
      console.log('✅ Redis Connected Successfully');
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis connection error:', err.message);
    });

    redisClient.on('ready', () => {
      console.log('🔄 Redis ready for operations');
    });

    // Test connection
    await redisClient.connect();
    await redisClient.ping();
    
    // Subscribe to channels for pub-sub
    await setupSubscribers();
    
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    // Don't throw error to allow app to work without Redis
    console.warn('⚠️  App will continue without Redis pub-sub functionality');
  }
};

const setupSubscribers = async () => {
  try {
    const subscriber = redisClient.duplicate();
    
    await subscriber.subscribe('customer_ingestion', 'bulk_customer_ingestion', 'campaign_delivery');
    
    subscriber.on('message', async (channel, message) => {
      console.log(`📨 Received message on ${channel}:`, message);
      
      try {
        const data = JSON.parse(message);
        
        switch (channel) {
          case 'customer_ingestion':
            await processCustomerIngestion(data);
            break;
          case 'bulk_customer_ingestion':
            await processBulkCustomerIngestion(data);
            break;
          case 'campaign_delivery':
            await processCampaignDelivery(data);
            break;
        }
      } catch (error) {
        console.error(`❌ Error processing ${channel} message:`, error);
      }
    });
    
    console.log('🎧 Redis subscribers set up successfully');
  } catch (error) {
    console.error('❌ Error setting up Redis subscribers:', error);
  }
};

const processCustomerIngestion = async (data) => {
  const { pool } = require('./database');
  
  try {
    await pool.query(
      `INSERT INTO customers (name, email, phone, total_spend, visit_count, last_visit)
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (email) DO NOTHING`,
      [data.name, data.email, data.phone, data.totalSpend, data.visitCount, new Date()]
    );
    console.log('✅ Customer processed via Redis:', data.email);
  } catch (error) {
    console.error('❌ Error processing customer:', error);
  }
};

const processBulkCustomerIngestion = async (data) => {
  const { pool } = require('./database');
  
  try {
    const client = await pool.connect();
    await client.query('BEGIN');
    
    for (const customer of data.customers) {
      await client.query(
        `INSERT INTO customers (name, email, phone, total_spend, visit_count, last_visit)
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (email) DO NOTHING`,
        [customer.name, customer.email, customer.phone || null, customer.totalSpend || 0, customer.visitCount || 0, new Date()]
      );
    }
    
    await client.query('COMMIT');
    client.release();
    console.log(`✅ Bulk processed ${data.customers.length} customers via Redis`);
  } catch (error) {
    console.error('❌ Error processing bulk customers:', error);
  }
};

const processCampaignDelivery = async (data) => {
  console.log('📧 Processing campaign delivery:', data);
  // Implementation for campaign delivery processing
};

const getRedisClient = () => {
  if (!redisClient) {
    console.warn('⚠️  Redis client not initialized');
    return null;
  }
  return redisClient;
};

const publishMessage = async (channel, message) => {
  try {
    if (redisClient) {
      await redisClient.publish(channel, JSON.stringify(message));
      console.log(`📤 Published message to ${channel}`);
    }
  } catch (error) {
    console.error(`❌ Error publishing to ${channel}:`, error);
  }
};

module.exports = { 
  connectRedis, 
  getRedisClient, 
  publishMessage 
};
