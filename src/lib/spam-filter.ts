/**
 * Chat Spam Filter for SnapUp
 * 
 * Provides:
 * 1. Rate limiting (5 messages/min per user, sliding window)
 * 2. Content blocking (phone numbers, emails, URLs)
 * 3. Suspicious pattern flagging (all caps, repeated chars, scam phrases)
 * 4. Message reporting API
 */

import { supabase } from '@/lib/supabase';

// ============ TYPES ============

export type SpamCheckSeverity = 'block' | 'warn' | 'clean';

export interface SpamCheckResult {
  allowed: boolean;
  severity: SpamCheckSeverity;
  reason: string | null;
  /** Human-readable explanation shown to the user */
  userMessage: string | null;
  /** Which rule triggered */
  rule: 'rate_limit' | 'blocked_content' | 'suspicious_pattern' | null;
  /** Details about what was detected */
  details?: string;
}

export interface ReportMessageParams {
  messageId: string;
  reporterId: string;
  reason: 'spam' | 'scam' | 'harassment' | 'inappropriate' | 'contact_info' | 'other';
  details?: string;
}

// ============ RATE LIMITING ============

/**
 * Sliding window rate limiter.
 * Stores timestamps of recent messages per user in memory.
 * Max 5 messages per 60 seconds.
 */
const MESSAGE_TIMESTAMPS: Map<string, number[]> = new Map();
const MAX_MESSAGES_PER_MINUTE = 5;
const WINDOW_MS = 60_000; // 60 seconds

function checkRateLimit(userId: string): SpamCheckResult {
  const now = Date.now();
  const timestamps = MESSAGE_TIMESTAMPS.get(userId) || [];
  
  // Remove timestamps outside the sliding window
  const recentTimestamps = timestamps.filter(t => now - t < WINDOW_MS);
  MESSAGE_TIMESTAMPS.set(userId, recentTimestamps);
  
  if (recentTimestamps.length >= MAX_MESSAGES_PER_MINUTE) {
    const oldestInWindow = recentTimestamps[0];
    const waitSeconds = Math.ceil((WINDOW_MS - (now - oldestInWindow)) / 1000);
    return {
      allowed: false,
      severity: 'block',
      reason: 'rate_limit',
      userMessage: `You're sending messages too quickly. Please wait ${waitSeconds} second${waitSeconds !== 1 ? 's' : ''} before sending another message.`,
      rule: 'rate_limit',
      details: `${recentTimestamps.length}/${MAX_MESSAGES_PER_MINUTE} messages in last 60s`,
    };
  }
  
  return { allowed: true, severity: 'clean', reason: null, userMessage: null, rule: null };
}

function recordMessageSent(userId: string): void {
  const timestamps = MESSAGE_TIMESTAMPS.get(userId) || [];
  timestamps.push(Date.now());
  MESSAGE_TIMESTAMPS.set(userId, timestamps);
}

// ============ CONTENT BLOCKING ============

// Regex patterns for blocked content
const PHONE_PATTERNS = [
  // SA phone numbers: 0XX XXX XXXX, +27XX XXX XXXX, 27XXXXXXXXX
  /(?:\+?27|0)\s*[6-8]\d[\s.-]?\d{3}[\s.-]?\d{4}/g,
  // Generic phone patterns: 10+ digits
  /\b\d[\s.-]?\d[\s.-]?\d[\s.-]?\d[\s.-]?\d[\s.-]?\d[\s.-]?\d[\s.-]?\d[\s.-]?\d[\s.-]?\d\b/g,
  // Patterns like "zero eight two" written out
  /\b(?:zero|one|two|three|four|five|six|seven|eight|nine)[\s,]+(?:zero|one|two|three|four|five|six|seven|eight|nine)[\s,]+(?:zero|one|two|three|four|five|six|seven|eight|nine)/gi,
];

const EMAIL_PATTERNS = [
  // Standard email
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  // Obfuscated email: "name at domain dot com"
  /\b\w+[\s]*(?:@|at|AT)[\s]*\w+[\s]*(?:\.|dot|DOT)[\s]*(?:com|co\.za|net|org|gmail|yahoo|hotmail|outlook)\b/gi,
];

const URL_PATTERNS = [
  // Standard URLs
  /https?:\/\/[^\s<>]+/gi,
  // www URLs
  /www\.[^\s<>]+/gi,
  // Common domains without protocol
  /\b\w+\.(?:com|co\.za|net|org|io|app|me|za|africa)\b/gi,
  // Shortened URLs
  /\b(?:bit\.ly|tinyurl|goo\.gl|t\.co|is\.gd|buff\.ly|ow\.ly|rebrand\.ly)\/\w+/gi,
];

function checkBlockedContent(content: string): SpamCheckResult {
  const normalizedContent = content.toLowerCase().replace(/\s+/g, ' ');
  
  // Check phone numbers
  for (const pattern of PHONE_PATTERNS) {
    pattern.lastIndex = 0; // Reset regex state
    if (pattern.test(content) || pattern.test(normalizedContent)) {
      return {
        allowed: false,
        severity: 'block',
        reason: 'blocked_content',
        userMessage: 'Phone numbers are not allowed in messages. For your safety, please keep all transactions on SnapUp.',
        rule: 'blocked_content',
        details: 'Phone number detected',
      };
    }
  }
  
  // Check email addresses
  for (const pattern of EMAIL_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(content) || pattern.test(normalizedContent)) {
      return {
        allowed: false,
        severity: 'block',
        reason: 'blocked_content',
        userMessage: 'Email addresses are not allowed in messages. For your protection, please communicate through SnapUp.',
        rule: 'blocked_content',
        details: 'Email address detected',
      };
    }
  }
  
  // Check URLs
  for (const pattern of URL_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(content) || pattern.test(normalizedContent)) {
      return {
        allowed: false,
        severity: 'block',
        reason: 'blocked_content',
        userMessage: 'Links and URLs are not allowed in messages. This helps protect you from phishing and scams.',
        rule: 'blocked_content',
        details: 'URL/link detected',
      };
    }
  }
  
  return { allowed: true, severity: 'clean', reason: null, userMessage: null, rule: null };
}

// ============ SUSPICIOUS PATTERN DETECTION ============

const SCAM_PHRASES = [
  'send money to',
  'transfer money',
  'whatsapp me',
  'whatsapp number',
  'call me on',
  'text me on',
  'sms me',
  'pay me directly',
  'pay directly',
  'outside the app',
  'off the platform',
  'off platform',
  'western union',
  'money gram',
  'moneygram',
  'bitcoin',
  'crypto wallet',
  'gift card',
  'gift voucher',
  'send gift',
  'bank transfer direct',
  'eft me',
  'eft directly',
  'pay into my account',
  'my bank details',
  'account number is',
  'branch code is',
  'deposit into',
  'send to my',
  'wire transfer',
  'cashapp',
  'cash app',
  'venmo',
  'zelle',
  'telegram me',
  'signal me',
  'dm me on',
  'inbox me on',
  'contact me outside',
  'meet me alone',
  'come alone',
  'dont tell anyone',
  "don't tell anyone",
  'keep this between us',
  'advance payment',
  'advance fee',
  'pay upfront',
  'pay before',
  'nigerian prince',
  'congratulations you won',
  'you have won',
  'claim your prize',
  'lottery winner',
  'inheritance fund',
];

function checkSuspiciousPatterns(content: string): SpamCheckResult {
  const normalizedContent = content.toLowerCase().trim();
  
  // Check for scam phrases
  for (const phrase of SCAM_PHRASES) {
    if (normalizedContent.includes(phrase)) {
      return {
        allowed: false,
        severity: 'warn',
        reason: 'suspicious_pattern',
        userMessage: `Your message contains a phrase that may indicate off-platform communication ("${phrase}"). For your safety, all transactions should stay on SnapUp where you're protected by buyer/seller guarantees.`,
        rule: 'suspicious_pattern',
        details: `Scam phrase detected: "${phrase}"`,
      };
    }
  }
  
  // Check for ALL CAPS (more than 80% uppercase, minimum 20 chars)
  if (content.length >= 20) {
    const letters = content.replace(/[^a-zA-Z]/g, '');
    if (letters.length >= 15) {
      const uppercaseCount = (content.match(/[A-Z]/g) || []).length;
      const uppercaseRatio = uppercaseCount / letters.length;
      if (uppercaseRatio > 0.8) {
        return {
          allowed: true, // Allow but warn
          severity: 'warn',
          reason: 'suspicious_pattern',
          userMessage: 'Your message appears to be in ALL CAPS. This can come across as shouting. Consider rewriting it in normal case.',
          rule: 'suspicious_pattern',
          details: `${Math.round(uppercaseRatio * 100)}% uppercase`,
        };
      }
    }
  }
  
  // Check for excessive repeated characters (e.g., "hellooooooo" or "!!!!!!!")
  const repeatedCharPattern = /(.)\1{5,}/g;
  if (repeatedCharPattern.test(content)) {
    return {
      allowed: true, // Allow but warn
      severity: 'warn',
      reason: 'suspicious_pattern',
      userMessage: 'Your message contains excessive repeated characters. This may be flagged as spam.',
      rule: 'suspicious_pattern',
      details: 'Excessive character repetition',
    };
  }
  
  // Check for excessive special characters (potential spam)
  const specialCharCount = (content.match(/[!?$#@*&^%]{3,}/g) || []).length;
  if (specialCharCount >= 3) {
    return {
      allowed: true,
      severity: 'warn',
      reason: 'suspicious_pattern',
      userMessage: 'Your message contains many special characters. This may be flagged as spam.',
      rule: 'suspicious_pattern',
      details: 'Excessive special characters',
    };
  }
  
  return { allowed: true, severity: 'clean', reason: null, userMessage: null, rule: null };
}

// ============ MAIN VALIDATION FUNCTION ============

/**
 * Validate a chat message before sending.
 * Checks rate limit, blocked content, and suspicious patterns.
 * 
 * @param userId - The sender's user ID
 * @param content - The message text content
 * @returns SpamCheckResult with allowed/blocked status and reason
 */
export function validateMessage(userId: string, content: string): SpamCheckResult {
  // Skip validation for empty messages (image-only)
  if (!content || content.trim().length === 0) {
    return { allowed: true, severity: 'clean', reason: null, userMessage: null, rule: null };
  }
  
  // 1. Check rate limit first (cheapest check)
  const rateLimitResult = checkRateLimit(userId);
  if (!rateLimitResult.allowed) {
    return rateLimitResult;
  }
  
  // 2. Check for blocked content (phone, email, URLs)
  const blockedResult = checkBlockedContent(content);
  if (!blockedResult.allowed) {
    return blockedResult;
  }
  
  // 3. Check for suspicious patterns
  const suspiciousResult = checkSuspiciousPatterns(content);
  // Suspicious patterns may warn but still allow
  if (suspiciousResult.severity !== 'clean') {
    return suspiciousResult;
  }
  
  return { allowed: true, severity: 'clean', reason: null, userMessage: null, rule: null };
}

/**
 * Record that a message was successfully sent (for rate limiting).
 * Call this AFTER the message is sent successfully.
 */
export function recordSentMessage(userId: string): void {
  recordMessageSent(userId);
}

/**
 * Get the number of messages remaining in the current rate limit window.
 */
export function getRateLimitRemaining(userId: string): number {
  const now = Date.now();
  const timestamps = MESSAGE_TIMESTAMPS.get(userId) || [];
  const recentTimestamps = timestamps.filter(t => now - t < WINDOW_MS);
  return Math.max(0, MAX_MESSAGES_PER_MINUTE - recentTimestamps.length);
}

// ============ MESSAGE REPORTING ============

/**
 * Report a message as spam/scam/inappropriate.
 * Records the report in the message_reports table.
 */
export async function reportMessage(params: ReportMessageParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('message_reports')
      .insert({
        message_id: params.messageId,
        reporter_id: params.reporterId,
        reason: params.reason,
        details: params.details || null,
      });
    
    if (error) {
      // Handle duplicate report
      if (error.code === '23505' || error.message?.includes('unique') || error.message?.includes('duplicate')) {
        return { success: false, error: 'You have already reported this message.' };
      }
      console.error('Report message error:', error);
      return { success: false, error: error.message || 'Failed to submit report' };
    }
    
    return { success: true };
  } catch (err: any) {
    console.error('Report message exception:', err);
    return { success: false, error: err.message || 'Failed to submit report' };
  }
}

/**
 * Check if a message has already been reported by this user.
 */
export async function hasReportedMessage(messageId: string, reporterId: string): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('message_reports')
      .select('*', { count: 'exact', head: true })
      .eq('message_id', messageId)
      .eq('reporter_id', reporterId);
    
    if (error) return false;
    return (count || 0) > 0;
  } catch {
    return false;
  }
}
