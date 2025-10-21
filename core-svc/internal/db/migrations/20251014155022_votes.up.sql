CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    poll_id UUID NOT NULL REFERENCES poll(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES poll_option(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE votes ADD CONSTRAINT votes_unique_poll_user UNIQUE (poll_id, user_id);
CREATE INDEX votes_poll_created_idx ON votes (poll_id, created_at DESC);
CREATE INDEX votes_user_created_idx ON votes (user_id, created_at DESC);
CREATE INDEX votes_option_id_idx ON votes (option_id);
