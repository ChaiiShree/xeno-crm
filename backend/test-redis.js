const Redis = require('ioredis');

async function testRedis() {
  try {
    const redis = new Redis({
      host: 'localhost',
      port: 6379,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    });

    console.log('🔄 Testing Redis connection...');
    
    // Test ping
    const pong = await redis.ping();
    console.log('✅ Redis ping response:', pong);
    
    // Test set/get
    await redis.set('test_key', 'Hello from Xeno CRM!');
    const value = await redis.get('test_key');
    console.log('📝 Test set/get - value:', value);
    
    // Clean up
    await redis.del('test_key');
    console.log('🧹 Cleaned up test data');
    
    await redis.disconnect();
    console.log('🎉 Redis test completed successfully!');
    console.log('✅ Redis is ready for your Xeno CRM application!');
    
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
  }
}

testRedis();
