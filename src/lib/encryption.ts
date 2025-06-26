import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-for-development-use-only-32'
const ALGORITHM = 'aes-256-gcm'

/**
 * Encrypt a string using AES-256-GCM
 */
export function encryptToken(text: string): string {
  try {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY)
    
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    return iv.toString('hex') + ':' + encrypted
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt token')
  }
}

/**
 * Decrypt a string using AES-256-GCM
 */
export function decryptToken(encryptedText: string): string {
  try {
    const parts = encryptedText.split(':')
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted text format')
    }
    
    const iv = Buffer.from(parts[0], 'hex')
    const encrypted = parts[1]
    
    const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error('Failed to decrypt token')
  }
}

/**
 * Hash a string using SHA-256
 */
export function hashString(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex')
}

/**
 * Generate a random encryption key
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex')
}