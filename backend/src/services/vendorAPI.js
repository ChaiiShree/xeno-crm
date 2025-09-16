const axios = require('axios');

class VendorAPI {
  constructor() {
    this.baseURL = process.env.VENDOR_API_URL || 'http://localhost:5000/api/campaigns';
    this.deliverySuccessRate = 0.9; // 90% success rate simulation
  }

  async sendMessage(customer, message, campaignId) {
    try {
      console.log(`📧 Sending message to ${customer.email} for campaign ${campaignId}`);

      // Simulate API call delay
      await this.simulateNetworkDelay();

      // Simulate success/failure based on configured rate
      const isSuccess = Math.random() < this.deliverySuccessRate;

      if (isSuccess) {
        console.log(`✅ Message sent successfully to ${customer.email}`);
        
        // Simulate delivery receipt callback
        setTimeout(() => {
          this.sendDeliveryReceipt(campaignId, customer.id, 'sent');
        }, Math.random() * 2000 + 500); // Random delay 0.5-2.5 seconds

        return {
          success: true,
          messageId: this.generateMessageId(),
          status: 'sent',
          timestamp: new Date().toISOString()
        };
      } else {
        const failureReason = this.getRandomFailureReason();
        console.log(`❌ Message failed to ${customer.email}: ${failureReason}`);
        
        // Send failure receipt
        setTimeout(() => {
          this.sendDeliveryReceipt(campaignId, customer.id, 'failed', failureReason);
        }, Math.random() * 1000 + 200);

        return {
          success: false,
          status: 'failed',
          reason: failureReason,
          timestamp: new Date().toISOString()
        };
      }

    } catch (error) {
      console.error(`❌ Vendor API error for ${customer.email}:`, error);
      
      // Send failure receipt for API errors
      setTimeout(() => {
        this.sendDeliveryReceipt(campaignId, customer.id, 'failed', 'API Error');
      }, 500);

      return {
        success: false,
        status: 'failed',
        reason: 'Vendor API Error',
        timestamp: new Date().toISOString()
      };
    }
  }

  async sendBulkMessages(customers, message, campaignId) {
    console.log(`📬 Sending bulk messages to ${customers.length} customers for campaign ${campaignId}`);

    const results = [];
    const batchSize = 10; // Process in batches to avoid overwhelming the system

    for (let i = 0; i < customers.length; i += batchSize) {
      const batch = customers.slice(i, i + batchSize);
      
      const batchPromises = batch.map(customer => 
        this.sendMessage(customer, message, campaignId)
      );

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        const customer = batch[index];
        if (result.status === 'fulfilled') {
          results.push({
            customerId: customer.id,
            email: customer.email,
            ...result.value
          });
        } else {
          results.push({
            customerId: customer.id,
            email: customer.email,
            success: false,
            status: 'failed',
            reason: 'Promise rejected',
            error: result.reason?.message
          });
        }
      });

      // Small delay between batches
      if (i + batchSize < customers.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    console.log(`📊 Bulk send completed: ${successCount} sent, ${failureCount} failed`);

    return {
      total: customers.length,
      sent: successCount,
      failed: failureCount,
      results
    };
  }

  async sendDeliveryReceipt(campaignId, customerId, status, failedReason = null) {
    try {
      const receiptData = {
        campaignId,
        customerId,
        status,
        failedReason,
        timestamp: new Date().toISOString()
      };

      // Call our own delivery receipt endpoint
      const response = await axios.post(
        `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/campaigns/delivery-status`,
        receiptData,
        {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'VendorAPI/1.0'
          }
        }
      );

      if (response.status === 200) {
        console.log(`📨 Delivery receipt sent: Campaign ${campaignId}, Customer ${customerId}, Status: ${status}`);
      }

    } catch (error) {
      console.error(`❌ Failed to send delivery receipt: ${error.message}`);
      // Don't throw error as this is a callback
    }
  }

  simulateNetworkDelay() {
    // Simulate realistic API response times (100-800ms)
    const delay = Math.random() * 700 + 100; 
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  getRandomFailureReason() {
    const reasons = [
      'Invalid email address',
      'Recipient not found',
      'Mailbox full',
      'Temporary delivery failure',
      'Blocked by spam filter',
      'Rate limit exceeded',
      'Network timeout',
      'Service temporarily unavailable'
    ];

    return reasons[Math.floor(Math.random() * reasons.length)];
  }

  // Method to customize success rate for testing
  setSuccessRate(rate) {
    if (rate >= 0 && rate <= 1) {
      this.deliverySuccessRate = rate;
      console.log(`📊 Vendor API success rate set to ${(rate * 100)}%`);
    }
  }

  // Get vendor API statistics
  getStats() {
    return {
      successRate: this.deliverySuccessRate,
      baseURL: this.baseURL,
      status: 'operational'
    };
  }

  // Health check for vendor API
  async healthCheck() {
    try {
      // In a real implementation, this would ping the actual vendor API
      await this.simulateNetworkDelay();
      
      return {
        status: 'healthy',
        responseTime: Math.random() * 200 + 50, // Simulated response time
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = new VendorAPI();
