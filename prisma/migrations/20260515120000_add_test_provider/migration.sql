-- Add TEST to Provider enum for simulated recharges
ALTER TYPE "Provider" ADD VALUE IF NOT EXISTS 'TEST';
