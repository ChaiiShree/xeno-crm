const vendorAPI = require('./vendorAPI');
const redisService = require('./redisService');
const { pool } = require('../config/database');

class EmailService {
  constructor() {
    this.isProcessing = false;
    this.processingQueue = [];
  }

  async sendCampaignEmails(campaignId, customers, message) {
    try {
      console.log(`📧 Starting email campaign delivery: ${campaignId} to ${customers.length} customers`);

      // Add to processing queue to avoid concurrent processing
      if (this.isProcessing) {
        console.log('📋 Campaign queued - another campaign is currently processing');
        this.processingQueue.push({ campaignId, customers, message });
        return { queued: true };
      }

      this.isProcessing = true;

      // Update campaign status to active
      await pool.query(
        'UPDATE campaigns SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['active', campaignId]
      );

      // Send emails using vendor API
      const result = await vendorAPI.sendBulkMessages(customers, message, campaignId);

      // Update campaign with final counts
      await pool.query(
        `UPDATE campaigns 
         SET status = $1, sent_count = $2, failed_count = $3, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $4`,
        ['completed', result.sent, result.failed, campaignId]
      );

      console.log(`✅ Campaign ${campaignId} completed: ${result.sent} sent, ${result.failed} failed`);

      // Process next item in queue
      this.isProcessing = false;
      await this.processNextInQueue();

      return {
        success: true,
        campaignId,
        totalCustomers: customers.length,
        sent: result.sent,
        failed: result.failed,
        details: result.results
      };

    } catch (error) {
      console.error(`❌ Email campaign delivery failed for ${campaignId}:`, error);

      // Update campaign status to failed
      await pool.query(
        'UPDATE campaigns SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['failed', campaignId]
      );

      this.isProcessing = false;
      await this.processNextInQueue();

      throw error;
    }
  }

  async processNextInQueue() {
    if (this.processingQueue.length > 0) {
      const nextCampaign = this.processingQueue.shift();
      console.log(`📋 Processing next queued campaign: ${nextCampaign.campaignId}`);
      
      // Process with a small delay to prevent overwhelming the system
      setTimeout(() => {
        this.sendCampaignEmails(
          nextCampaign.campaignId, 
          nextCampaign.customers, 
          nextCampaign.message
        );
      }, 1000);
    }
  }

  async sendSingleEmail(customer, message, campaignId) {
    try {
      console.log(`📧 Sending single email to ${customer.email}`);

      const result = await vendorAPI.sendMessage(customer, message, campaignId);

      if (result.success) {
        // Log successful delivery
        await pool.query(
          `UPDATE communication_log 
           SET status = 'sent', sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
           WHERE campaign_id = $1 AND customer_id = $2`,
          [campaignId, customer.id]
        );
      } else {
        // Log failed delivery
        await pool.query(
          `UPDATE communication_log 
           SET status = 'failed', failed_reason = $1, updated_at = CURRENT_TIMESTAMP
           WHERE campaign_id = $2 AND customer_id = $3`,
          [result.reason, campaignId, customer.id]
        );
      }

      return result;

    } catch (error) {
      console.error(`❌ Single email delivery failed:`, error);
      throw error;
    }
  }

  async retryFailedEmails(campaignId) {
    try {
      console.log(`🔄 Retrying failed emails for campaign ${campaignId}`);

      // Get failed communication logs
      const failedLogs = await pool.query(`
        SELECT cl.*, c.name, c.email, c.phone, cam.message
        FROM communication_log cl
        JOIN customers c ON cl.customer_id = c.id
        JOIN campaigns cam ON cl.campaign_id = cam.id
        WHERE cl.campaign_id = $1 AND cl.status = 'failed'
      `, [campaignId]);

      if (failedLogs.rows.length === 0) {
        return { message: 'No failed emails to retry', retried: 0 };
      }

      console.log(`🔄 Found ${failedLogs.rows.length} failed emails to retry`);

      let retrySuccessCount = 0;
      let retryFailureCount = 0;

      for (const log of failedLogs.rows) {
        const customer = {
          id: log.customer_id,
          name: log.name,
          email: log.email,
          phone: log.phone
        };

        try {
          const result = await vendorAPI.sendMessage(customer, log.message, campaignId);

          if (result.success) {
            // Update log to sent
            await pool.query(
              `UPDATE communication_log 
               SET status = 'sent', sent_at = CURRENT_TIMESTAMP, 
                   failed_reason = NULL, updated_at = CURRENT_TIMESTAMP
               WHERE id = $1`,
              [log.id]
            );
            retrySuccessCount++;
          } else {
            // Update with new failure reason
            await pool.query(
              `UPDATE communication_log 
               SET failed_reason = $1, updated_at = CURRENT_TIMESTAMP
               WHERE id = $2`,
              [result.reason, log.id]
            );
            retryFailureCount++;
          }

          // Small delay between retries
          await new Promise(resolve => setTimeout(resolve, 200));

        } catch (error) {
          console.error(`❌ Retry failed for customer ${customer.email}:`, error);
          retryFailureCount++;
        }
      }

      // Update campaign counters
      await pool.query(
        `UPDATE campaigns 
         SET sent_count = sent_count + $1, failed_count = failed_count - $2
         WHERE id = $3`,
        [retrySuccessCount, retrySuccessCount, campaignId]
      );

      console.log(`✅ Retry completed: ${retrySuccessCount} succeeded, ${retryFailureCount} still failed`);

      return {
        retried: failedLogs.rows.length,
        succeeded: retrySuccessCount,
        stillFailed: retryFailureCount
      };

    } catch (error) {
      console.error(`❌ Retry failed emails error:`, error);
      throw error;
    }
  }

  async pauseCampaign(campaignId) {
    try {
      await pool.query(
        'UPDATE campaigns SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['paused', campaignId]
      );

      console.log(`⏸️  Campaign ${campaignId} paused`);
      return { success: true, status: 'paused' };

    } catch (error) {
      console.error(`❌ Failed to pause campaign ${campaignId}:`, error);
      throw error;
    }
  }

  async resumeCampaign(campaignId) {
    try {
      // Get pending emails for this campaign
      const pendingLogs = await pool.query(`
        SELECT cl.*, c.name, c.email, c.phone, cam.message
        FROM communication_log cl
        JOIN customers c ON cl.customer_id = c.id
        JOIN campaigns cam ON cl.campaign_id = cam.id
        WHERE cl.campaign_id = $1 AND cl.status = 'pending'
      `, [campaignId]);

      if (pendingLogs.rows.length === 0) {
        await pool.query(
          'UPDATE campaigns SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['completed', campaignId]
        );
        return { success: true, status: 'completed', message: 'No pending emails' };
      }

      await pool.query(
        'UPDATE campaigns SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['active', campaignId]
      );

      console.log(`▶️  Campaign ${campaignId} resumed with ${pendingLogs.rows.length} pending emails`);

      // Continue sending pending emails
      const customers = pendingLogs.rows.map(row => ({
        id: row.customer_id,
        name: row.name,
        email: row.email,
        phone: row.phone
      }));

      // Queue for processing
      this.processingQueue.push({
        campaignId,
        customers,
        message: pendingLogs.rows[0].message
      });

      if (!this.isProcessing) {
        await this.processNextInQueue();
      }

      return { success: true, status: 'active', pending: pendingLogs.rows.length };

    } catch (error) {
      console.error(`❌ Failed to resume campaign ${campaignId}:`, error);
      throw error;
    }
  }

  async getEmailTemplates() {
    return {
      welcome: {
        subject: "Welcome to our platform, [NAME]!",
        body: "Hi [NAME], welcome to our platform! We're excited to have you join us."
      },
      promotion: {
        subject: "Exclusive offer for you, [NAME]!",
        body: "Hi [NAME], we have an exclusive offer just for you! Don't miss out."
      },
      winback: {
        subject: "We miss you, [NAME]!",
        body: "Hi [NAME], we noticed you haven't been active lately. Come back and see what's new!"
      },
      anniversary: {
        subject: "Happy anniversary, [NAME]!",
        body: "Hi [NAME], it's been a year since you joined us! Thank you for your loyalty."
      }
    };
  }

  async personalizeMessage(message, customer) {
    return message
      .replace(/\[NAME\]/g, customer.name)
      .replace(/\[EMAIL\]/g, customer.email)
      .replace(/\[PHONE\]/g, customer.phone || '')
      .replace(/\[TOTAL_SPEND\]/g, customer.totalSpend || '0')
      .replace(/\[VISIT_COUNT\]/g, customer.visitCount || '0');
  }

  getProcessingStatus() {
    return {
      isProcessing: this.isProcessing,
      queueLength: this.processingQueue.length,
      queuedCampaigns: this.processingQueue.map(item => item.campaignId)
    };
  }
}

module.exports = new EmailService();
