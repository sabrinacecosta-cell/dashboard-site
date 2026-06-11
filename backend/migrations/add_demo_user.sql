-- Migração: adiciona coluna is_demo e cria o usuário demo
-- Execute no Railway: Settings > Database > Connect > psql
-- ou via Railway CLI: railway run psql $DATABASE_URL -f migrations/add_demo_user.sql

-- 1. Adiciona coluna is_demo (segura de rodar mais de uma vez)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Cria o usuário demo (senha: Demo@2026)
--    ON CONFLICT garante idempotência
INSERT INTO usuarios (id, nome, email, senha_hash, is_demo)
VALUES (
  gen_random_uuid(),
  'Usuário Demo',
  'demo@jtdkinvest.com',
  '$2b$10$T1P8RjZ0Vm/STzKr8jrw4e26GzAw.IAFP.SruN3mvAqAJmlsLMof.',
  TRUE
)
ON CONFLICT (email) DO UPDATE
  SET is_demo    = TRUE,
      senha_hash = '$2b$10$T1P8RjZ0Vm/STzKr8jrw4e26GzAw.IAFP.SruN3mvAqAJmlsLMof.',
      nome       = 'Usuário Demo';
