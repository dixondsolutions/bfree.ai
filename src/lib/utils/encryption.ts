import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key-here!!'
const IV_LENGTH = 16 // For AES, this is always 16

/**
 * Encrypt sensitive data using AES-256-CBC
 */
export function encrypt(text: string): string {
  if (!text) return text
  
  try {
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv)
    
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    // Combine IV and encrypted data
    return iv.toString('hex') + ':' + encrypted
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt data')
  }
}

/**
 * Decrypt sensitive data using AES-256-CBC
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) return encryptedData
  
  try {
    const parts = encryptedData.split(':')
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format')
    }
    
    const iv = Buffer.from(parts[0], 'hex')
    const encrypted = parts[1]
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error('Failed to decrypt data')
  }
}

/**
 * Hash data using SHA-256 (one-way, for passwords or tokens)
 */
export function hash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex')
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Verify that encryption is working properly
 */
export function testEncryption(): boolean {
  try {
    const testData = 'test-encryption-data-123'
    const encrypted = encrypt(testData)
    const decrypted = decrypt(encrypted)
    return testData === decrypted
  } catch {
    return false
  }
}