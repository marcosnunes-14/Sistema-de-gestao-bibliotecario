# Contexto do Projeto

## Propósito

Sistema administrativo para uma biblioteca escolar de pequeno/médio porte, com API FastAPI e front-end React para operação local.

## Stack

- Python 3.12+
- FastAPI e Uvicorn
- SQLAlchemy 2
- SQLite por padrão, configurado por `DATABASE_URL`
- Alembic para migrations
- JWT com PyJWT
- Hash de senha Argon2 via `pwdlib[argon2]`
- pytest para testes

## Estrutura

- `app/api/routes/`: endpoints separados por módulo
- `app/api/dependencies.py`: parâmetros comuns de paginação
- `app/core/`: configuração e segurança
- `app/db/`: engine, sessões e criação/migração compatível do banco
- `app/models/`: entidades SQLAlchemy
- `app/schemas/`: contratos Pydantic
- `app/services/`: regras de negócio e transações
- `tests/`: testes unitários de API e integração
- `alembic/`: configuração e revisões de banco
- `scripts/backup_database.py`: backup consistente do SQLite

## Módulos implementados

- Health check público
- Alunos com cadastro, busca, edição e status
- Livros, autores, categorias e editoras
- Exemplares físicos
- Prateleiras e seções de localização física, existentes desde etapa anterior
- Empréstimos, devoluções, atrasos derivados, renovações, cancelamentos e históricos
- Usuários, login, perfis e autorização

## Regras importantes

- Alunos, livros, usuários e entidades administrativas são preservados por status quando apropriado.
- Empréstimos sempre apontam para um exemplar físico, nunca apenas para um livro.
- Um exemplar não pode possuir dois empréstimos ativos; há índice único parcial no banco.
- Empréstimo, devolução e cancelamento atualizam empréstimo e exemplar no mesmo commit.
- `atrasado` é calculado quando o empréstimo está ativo e a data prevista passou.
- Exemplar devolvido danificado passa para manutenção; os demais voltam a disponível.
- Não há limite de empréstimos, prazo padrão, multa ou reserva definidos.

## Autenticação

Usuários do sistema são diferentes de alunos. Existem os perfis `administrador` e `bibliotecario`. Senhas são armazenadas somente como hash Argon2. O login fornece JWT Bearer com expiração configurável por `ACCESS_TOKEN_EXPIRE_MINUTES`.

`/health` e `/api/auth/login` são públicos. Os demais módulos exigem token; `/api/usuarios` exige administrador. Usuários inativos são rejeitados em cada requisição, inclusive com token anteriormente emitido.

Operações críticas registram opcionalmente `realizado_por_id`, `devolvido_por_id` e `cadastrado_por_id`, preservando compatibilidade com dados anteriores.

## Banco

O caminho atualmente usado é `sqlite:///./biblioteca.db`, definido no `.env`. O banco legado em `data/biblioteca.db` foi preservado e copiado para o caminho configurado quando essa consolidação foi feita. A revisão Alembic atual é `0002_auditoria_constraints`.

Tabelas principais incluem `alunos`, `livros`, `autores`, `livros_autores`, `categorias`, `editoras`, `exemplares`, `emprestimos`, `renovacoes_emprestimo` e `usuarios`, além das tabelas de localização física.

## Ainda não implementado

- Reservas
- Multas
- Notificações
- Relatórios avançados
- QR Code
- Integrações externas
- Aplicativo mobile
- Operações administrativas de manutenção e baixa de exemplares

## Decisões a preservar

- Não armazenar senhas, chaves ou credenciais em arquivos versionados.
- Não apagar o banco para aplicar mudanças; usar Alembic e migrações incrementais.
- Não remover histórico de empréstimos, usuários ou entidades apenas por inativação.
- Não introduzir regras escolares não definidas, como limites ou prazos padrão.
- Manter respostas de listagem compatíveis com o front-end atual.

## Limitações conhecidas

O estoque consulta até 100 livros e até 100 exemplares por livro nesta versão. O cadastro, consulta e histórico de exemplares existem, mas manutenção e baixa ainda não possuem endpoints.