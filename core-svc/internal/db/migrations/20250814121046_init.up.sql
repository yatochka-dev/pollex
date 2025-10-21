create EXTENSION if not exists "uuid-ossp";

-- USERS --------------------------------------------------------------------
create table app_user (
                          id          uuid primary key default uuid_generate_v4(),
                          name        text not null,
                          email       text unique not null,
                          password_hash    text not null,
                          created_at  timestamptz default now()
);


