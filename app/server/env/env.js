// config/env.js
import { config } from 'dotenv';

config({ path: '.env' });

export const {
    PORT,
    JWT_SECRET,
    FRONT_URL,
    DB_HOST,
    DB_USER,
    DB_PASSWORD,
    DB_NAME,
    STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET
} = process.env