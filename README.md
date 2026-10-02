# 📚 Sistema de Gestão Bibliotecário — SGB

O **Sistema de Gestão Bibliotecário (SGB)** é um projeto desenvolvido com o objetivo de facilitar e modernizar o gerenciamento de bibliotecas escolares.

O sistema foi criado por um **estudante do Ensino Médio**, inicialmente como um projeto escolar, buscando solucionar problemas reais encontrados na organização e administração da biblioteca da escola.

## 🎯 Objetivo

O SGB tem como objetivo tornar o gerenciamento da biblioteca mais rápido, organizado e simples, permitindo controlar livros, exemplares, alunos, empréstimos e a localização física dos livros nas prateleiras.

## ✨ Principais funcionalidades

* 📖 Cadastro e gerenciamento de livros
* 🔎 Busca de livros
* 🧑‍🎓 Cadastro de alunos
* 🔄 Controle de empréstimos e devoluções
* 📦 Controle de exemplares e estoque
* 📍 Localização dos livros por prateleira
* 🔢 Organização das 12 prateleiras da biblioteca
* 🏷️ Registro utilizando ISBN/código de barras
* 🔐 Sistema de autenticação de usuários
* 📊 Gerenciamento das informações da biblioteca

## 📱 Uso em diferentes dispositivos

O sistema foi pensado para poder ser utilizado tanto em computadores quanto em dispositivos móveis, facilitando tarefas como o cadastro de livros diretamente dentro da biblioteca.

## 🛠️ Tecnologias utilizadas

O projeto utiliza tecnologias de desenvolvimento web para separar o sistema em **front-end**, **back-end** e **banco de dados**.

### Back-end

* Python
* API REST
* SQLAlchemy
* Sistema de autenticação
* SQLite durante o desenvolvimento

### Front-end

* HTML
* CSS
* JavaScript

### Ferramentas de desenvolvimento

* Visual Studio Code
* Git
* GitHub
* GitHub Copilot

## 📂 Estrutura do projeto

O sistema é dividido principalmente em:

* **Front-end:** interface utilizada pelos usuários da biblioteca.
* **Back-end:** responsável pelas regras de negócio, autenticação e comunicação com o banco de dados.
* **Banco de dados:** armazenamento das informações de livros, alunos, exemplares e empréstimos.

## 🚧 Status do projeto

🟡 **Em desenvolvimento**

O SGB continua recebendo melhorias e novas funcionalidades.

## 💡 Origem do projeto

Este projeto nasceu da necessidade de criar uma solução para a organização da biblioteca escolar.

Além de cumprir um objetivo acadêmico, o projeto busca ser uma ferramenta que possa ser **utilizada na prática pela escola**, auxiliando no gerenciamento de milhares de livros e tornando processos que antes eram manuais mais rápidos e organizados.

## 👨‍💻 Desenvolvedor

**Marcos Emanuel**

Estudante do Ensino Médio e desenvolvedor do projeto **Sistema de Gestão Bibliotecário (SGB)**.

---

> Projeto desenvolvido para fins educacionais e para aplicação em uma biblioteca escolar.


## Executar no computador

Na pasta do repositório (onde estão `requirements.txt` e `app`):

```powershell
python -m pip install -r requirements.txt
cd frontend
npm ci
cd ..
python scripts/start_local.py
```

Abra **https://localhost:5173** e mantenha o terminal aberto. No primeiro acesso local,
o navegador pode pedir confirmação do certificado de desenvolvimento.
O iniciador prepara a chave de autenticação em `.env` (sem exibi-la), inicia a API
na porta 8000 e a interface na porta 5173. Se o banco não tiver usuários, ele pede
os dados do primeiro administrador. Contas existentes mantêm suas senhas.
Para encerrar, use Ctrl+C.

O banco SQLite é resolvido a partir da pasta do projeto. Confira `DATABASE_URL`
no `.env`: ela deve apontar para o banco que contém seu acervo. Se já houver um
`.env`, o iniciador respeita esse caminho. Na primeira configuração, reutiliza
`data/biblioteca.db` se esse banco existir e não houver `biblioteca.db` na raiz.
Atualizações de colunas antigas criam um backup antes de alterar o SQLite.
Não exclua seu banco para atualizar o código. O repositório não inclui os dados
e usuários armazenados no computador da biblioteca.

Para abrir os processos em terminais separados, execute
`python -m uvicorn app.main:app --reload` na raiz (com `.env` configurado) e
`npm run dev` em `frontend`. Tanto `npm run dev` quanto `npm run preview`
encaminham `/api` para a API local. Uma hospedagem estática precisa de um backend
separado e de `VITE_API_URL` definido antes do build; o Vite não publica o servidor Python.

## Diagnóstico do login na hospedagem

A interface na Vercel e a API no Render são deploys separados. Atualizar a
interface não atualiza automaticamente um backend ligado a outro repositório
ou branch. Confira no Render o repositório, branch, último commit e DATABASE_URL.

Antes de redeploy/restart, confirme onde os dados estão armazenados. SQLite
fora de um disco persistente pode desaparecer quando o serviço reinicia.
Não crie um banco novo nem um novo administrador para substituir um acervo
que deveria existir; primeiro confira a conexão e os registros existentes.

Com acesso ao terminal do serviço que usa o banco publicado:

```bash
python -m app.cli diagnose
```

Esse comando mostra o tipo do banco, as contagens e os logins existentes,
sem imprimir senhas ou hashes e sem criar tabelas ou usuários. O nome
salvo no navegador é apenas um atalho local, não confirma que a conta exista
no banco desse servidor.

Para recuperar a senha de uma conta existente, após conferir o banco correto:

```bash
python -m app.cli reset-password LOGIN_EXATO
```

A senha é solicitada de forma oculta no terminal; não coloque a senha em
comandos, arquivos versionados ou mensagens. A operação preserva o ID do
usuário e os livros e não reativa contas inativas. Execute no ambiente que
se conecta ao banco publicado, não num SQLite local diferente. O Render
Free não oferece Shell/SSH; confira as opções do plano antes desse passo.

Referências: https://render.com/docs/free e https://render.com/docs/disks.
