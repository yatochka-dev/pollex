CREATE TABLE IF NOT EXISTS poll (
    id          uuid primary key default uuid_generate_v4(),
    question    text not null,

    created_at  timestamptz default now()
);

CREATE TABLE IF NOT EXISTS poll_option (
    id          uuid primary key default uuid_generate_v4(),
    poll_id     uuid not null references poll(id),
    label      text not null,

    created_at  timestamptz default now()
);
