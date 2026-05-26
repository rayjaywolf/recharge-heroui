-- Add TEST to Provider enum for simulated recharges (idempotent).
ALTER TYPE "Provider" ADD VALUE IF NOT EXISTS 'TEST';
