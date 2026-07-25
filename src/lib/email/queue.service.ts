// lib/email/queue.service.ts
type EmailJob = {
  to: string;
  name: string;
  email: string;
  slink: string;
  retries?: number;
};

class EmailQueue {
  private queue: EmailJob[] = [];
  private isProcessing = false;

  async add(job: EmailJob) {
    this.queue.push(job);
    if (!this.isProcessing) {
      this.process();
    }
  }

  private async process() {
    this.isProcessing = true;
    while (this.queue.length > 0) {
      const job = this.queue.shift();
      if (job) {
        try {
          await sendWelcomeEmail(job.to, job.name, job.email, job.slink);
          console.log(`Email sent to ${job.to}`);
        } catch (error) {
          console.error(`Failed to send email to ${job.to}:`, error);
          // Retry logic
          if (job.retries && job.retries < 3) {
            this.queue.push({ ...job, retries: (job.retries || 0) + 1 });
          }
        }
        // Add delay between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    this.isProcessing = false;
  }
}

export const emailQueue = new EmailQueue();