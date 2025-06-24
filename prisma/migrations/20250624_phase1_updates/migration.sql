-- Phase 1 Core Features Migration
-- This migration adds missing fields and models for the chat and orders systems

-- Add missing fields to Agency table
ALTER TABLE agencies ADD COLUMN maxOrders INTEGER DEFAULT 50;

-- Add missing fields to Conversation table
ALTER TABLE conversations ADD COLUMN settings TEXT;
ALTER TABLE conversations ADD COLUMN deletedAt DATETIME;

-- Update Order table with new fields
ALTER TABLE orders ADD COLUMN userId TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN priority TEXT DEFAULT 'medium';
ALTER TABLE orders ADD COLUMN keywords TEXT;
ALTER TABLE orders ADD COLUMN targetUrl TEXT;
ALTER TABLE orders ADD COLUMN wordCount INTEGER;
ALTER TABLE orders ADD COLUMN startedAt DATETIME;
ALTER TABLE orders ADD COLUMN deletedAt DATETIME;

-- Change deliverables column from JSON to TEXT for SQLite compatibility
-- (SQLite stores JSON as TEXT anyway)
UPDATE orders SET deliverables = CAST(deliverables AS TEXT) WHERE deliverables IS NOT NULL;

-- Create OrderMessage table
CREATE TABLE IF NOT EXISTS order_messages (
    id TEXT PRIMARY KEY,
    orderId TEXT NOT NULL,
    agencyId TEXT NOT NULL,
    userId TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'comment',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (agencyId) REFERENCES agencies(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for OrderMessage
CREATE INDEX idx_order_messages_orderId ON order_messages(orderId);
CREATE INDEX idx_order_messages_agencyId_orderId ON order_messages(agencyId, orderId);

-- Update AuditLog to use userId instead of userEmail
ALTER TABLE audit_logs ADD COLUMN userId TEXT;

-- Update role values to use uppercase
UPDATE users SET role = 'USER' WHERE role = 'user';
UPDATE users SET role = 'ADMIN' WHERE role = 'admin';
UPDATE users SET role = 'VIEWER' WHERE role = 'viewer';

UPDATE user_invites SET role = 'USER' WHERE role = 'user';
UPDATE user_invites SET role = 'ADMIN' WHERE role = 'admin';
UPDATE user_invites SET role = 'SUPER_ADMIN' WHERE role = 'super_admin';

-- Update Message role values to uppercase
UPDATE messages SET role = 'USER' WHERE role = 'user';
UPDATE messages SET role = 'ASSISTANT' WHERE role = 'assistant';
UPDATE messages SET role = 'SYSTEM' WHERE role = 'system';

-- Add indexes for soft deletes
CREATE INDEX idx_conversations_deletedAt ON conversations(deletedAt);
CREATE INDEX idx_orders_deletedAt ON orders(deletedAt);