-- We use "uuid-ossp" to generate unique IDs for users
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    user_email VARCHAR(255) NOT NULL UNIQUE,
    
    user_password VARCHAR(255) NOT NULL
);
