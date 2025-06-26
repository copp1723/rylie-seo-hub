const nodemailer = require('nodemailer')

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

class EmailService {
  private transporter: any

  constructor() {
    // Mailgun SMTP configuration
    this.transporter = nodemailer.createTransport({
      host: 'smtp.mailgun.org',
      port: 587,
      secure: false,
      auth: {
        user: process.env.MAILGUN_SMTP_USER || `postmaster@${process.env.MAILGUN_DOMAIN}`,
        pass: process.env.MAILGUN_SMTP_PASSWORD || process.env.MAILGUN_API_KEY,
      },
    })
  }

  async sendEmail({ to, subject, html, text }: EmailOptions) {
    try {
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || `"Rylie SEO Hub" <noreply@${process.env.MAILGUN_DOMAIN}>`,
        to,
        subject,
        html,
        text: text || this.stripHtml(html),
      })

      console.log('Email sent successfully:', info.messageId)
      return { success: true, messageId: info.messageId }
    } catch (error) {
      console.error('Email sending failed:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  async sendWelcomeEmail(userEmail: string, userName: string, companyName?: string) {
    const subject = `Welcome to ${companyName || 'Rylie SEO Hub'}!`
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to ${companyName || 'Rylie SEO Hub'}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #3b82f6;">Welcome to ${companyName || 'Rylie SEO Hub'}!</h1>
            
            <p>Hi ${userName},</p>
            
            <p>Welcome to your AI-powered SEO assistant! We're excited to help you optimize your automotive dealership's online presence.</p>
            
            <h2>What you can do:</h2>
            <ul>
              <li>🤖 Chat with AI for SEO strategies and advice</li>
              <li>📊 Get personalized recommendations for your dealership</li>
              <li>💡 Discover content ideas that drive traffic</li>
              <li>🔧 Receive technical SEO guidance</li>
            </ul>
            
            <p>
              <a href="${process.env.NEXTAUTH_URL}/chat" 
                 style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Start Your First Conversation
              </a>
            </p>
            
            <p>If you have any questions, just reply to this email or start a conversation in the app.</p>
            
            <p>Best regards,<br>The ${companyName || 'Rylie SEO Hub'} Team</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #666;">
              This email was sent from ${companyName || 'Rylie SEO Hub'}. 
              If you didn't sign up for this service, please ignore this email.
            </p>
          </div>
        </body>
      </html>
    `

    return this.sendEmail({ to: userEmail, subject, html })
  }

  async sendSEOReport(
    userEmail: string,
    reportData: Record<string, unknown>,
    companyName?: string
  ) {
    const subject = `Your SEO Report from ${companyName || 'Rylie SEO Hub'}`
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>SEO Report</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #3b82f6;">Your SEO Report</h1>
            
            <p>Here's your latest SEO analysis and recommendations:</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2>Key Insights:</h2>
              <p>${reportData.summary || 'Your SEO analysis has been completed.'}</p>
            </div>
            
            <h3>Recommendations:</h3>
            <ul>
              ${
                Array.isArray(reportData.recommendations)
                  ? reportData.recommendations.map((rec: string) => `<li>${rec}</li>`).join('')
                  : '<li>Continue optimizing your content for better search visibility.</li>'
              }
            </ul>
            
            <p>
              <a href="${process.env.NEXTAUTH_URL}/chat" 
                 style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Discuss These Results
              </a>
            </p>
            
            <p>Best regards,<br>The ${companyName || 'Rylie SEO Hub'} Team</p>
          </div>
        </body>
      </html>
    `

    return this.sendEmail({ to: userEmail, subject, html })
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  async sendInviteEmail(
    to: string,
    inviterName: string,
    inviterEmail: string,
    role: string,
    isSuperAdmin: boolean,
    inviteUrl: string
  ) {
    const roleDisplay = isSuperAdmin
      ? 'Super Admin'
      : role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
    const subject = `You've been invited to join Rylie SEO Hub as ${roleDisplay}`

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Invitation to Rylie SEO Hub</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #3b82f6;">You're invited to Rylie SEO Hub!</h1>
            
            <p>${inviterName} (${inviterEmail}) has invited you to join as a <strong>${roleDisplay}</strong>.</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 15px 0;">Click the button below to accept your invitation:</p>
              <a href="${inviteUrl}" 
                 style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Accept Invitation
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              This invitation will expire in 7 days. If the button doesn't work, copy and paste this link into your browser:
              <br><a href="${inviteUrl}" style="color: #3b82f6;">${inviteUrl}</a>
            </p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #666;">
              This email was sent from Rylie SEO Hub. 
              If you didn't expect this invitation, please ignore this email.
            </p>
          </div>
        </body>
      </html>
    `

    return this.sendEmail({ to, subject, html })
  }
}

export const emailService = new EmailService()
