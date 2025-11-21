-- Migration: Create messages table for chat system
-- This table stores all chat messages (both space and private)

CREATE TABLE IF NOT EXISTS messages (
    message_id UUID PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('space', 'private')),
    content TEXT NOT NULL CHECK (LENGTH(content) > 0 AND LENGTH(content) <= 5000),
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT space_message_check CHECK (
        (message_type = 'space' AND space_id IS NOT NULL) OR
        (message_type = 'private' AND receiver_id IS NOT NULL)
    )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_space ON messages(space_id) WHERE space_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id) WHERE receiver_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_messages_space_timestamp ON messages(space_id, timestamp DESC) WHERE space_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_private_participants ON messages(sender_id, receiver_id, timestamp DESC) WHERE message_type = 'private';

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_messages_updated_at();

-- Comments
COMMENT ON TABLE messages IS 'Stores all chat messages (space and private)';
COMMENT ON COLUMN messages.message_id IS 'Unique message identifier (UUID)';
COMMENT ON COLUMN messages.sender_id IS 'User who sent the message';
COMMENT ON COLUMN messages.message_type IS 'Type of message: space or private';
COMMENT ON COLUMN messages.content IS 'Message content (1-5000 characters)';
COMMENT ON COLUMN messages.timestamp IS 'When the message was sent';
COMMENT ON COLUMN messages.space_id IS 'Space ID for space messages';
COMMENT ON COLUMN messages.receiver_id IS 'Receiver ID for private messages';
COMMENT ON COLUMN messages.status IS 'Processing status: pending, validated, cached, broadcast, persisted, failed, rolled_back';

