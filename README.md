# Sistema de Autenticação

Sistema web com backend e frontend separados, focado em autenticação JWT.

## Estrutura

```
projeto-auth/
├── backend/
│   ├── src/
│   │   ├── config/        # Configuração do banco
│   │   ├── controllers/   # Controllers
│   │   ├── middlewares/   # Middleware de auth
│   │   ├── models/        # Models
│   │   ├── routes/        # Rotas
│   │   ├── services/      # Regras de negócio
│   │   └── server.js      # Entry point
│   ├── scripts/           # Migrate e seed
│   └── package.json
└── frontend/
    ├── src/
    │   ├── contexts/      # AuthContext
    │   ├── pages/         # Login, Home
    │   ├── services/      # API axios
    │   └── App.jsx
    └── package.json
```

## Configuração

### 1. Banco de Dados

Crie o banco PostgreSQL:

```sql
CREATE DATABASE auth_db;
```

### 2. Backend

```bash
cd backend

# Copie o .env.example e configure
cp .env.example .env

# Instale dependências
npm install

# Execute a migração
npm run migrate

# Execute o seed (usuários de teste)
npm run seed

# Inicie o servidor
npm run dev
```

### 3. Frontend

```bash
cd frontend

# Instale dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | /api/login | Login com email/senha |
| POST | /api/definir-senha | Definir senha (primeiro acesso) |
| GET | /api/me | Dados do usuário autenticado |
| GET | /api/health | Health check |

## Usuários de Teste

Após rodar o seed:

| Email | Senha | Observação |
|-------|-------|------------|
| admin@teste.com | 123456 | Acesso normal |
| novo@teste.com | (nenhuma) | Primeiro acesso |

## Fluxo de Primeiro Acesso

1. Usuário tenta login com email (senha vazia ou qualquer)
2. Backend detecta `senha_hash = null`
3. Retorna `{ primeiroAcesso: true, usuarioId }`
4. Frontend exibe formulário para definir senha
5. POST /api/definir-senha atualiza a senha
6. Usuário recebe token e é logado
