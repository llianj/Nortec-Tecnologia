# NortecOS — Supabase + Vercel

## 1. Crie o projeto no Supabase
1. Crie um projeto em https://supabase.com
2. Vá em **SQL Editor** → cole o conteúdo de `supabase_schema.sql` → **Run**.
   Isso cria as 7 tabelas (clientes, produtos, servicos, funcionarios, ordens,
   despesas, configuracoes) com um usuário master `admin/123` sendo criado
   automaticamente na primeira vez que o app carregar (se a tabela `funcionarios`
   estiver vazia).
3. Vá em **Project Settings → API** e copie:
   - **Project URL**
   - **anon public key**

## 2. Configure o app
Abra `nortec_os.html` e edite estas duas linhas no início do `<script>`:

```js
const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
const SUPABASE_ANON_KEY = 'SUA-CHAVE-ANON-PUBLICA';
```


Faça login com `admin / 123` e confirme que consegue cadastrar cliente,
produto, abrir uma OS etc. — e que os dados aparecem na tabela do Supabase
(Table Editor).

## 3. Deploy no Vercel
Como é um site estático (sem backend próprio), o deploy é o mais simples
possível:

1. Renomeie `nortec_os.html` para `index.html` (Vercel serve `index.html`
   como página raiz automaticamente).
2. Suba a pasta (com `index.html` + `logo.jpeg`) para um repositório no
   GitHub, **ou** use a CLI direto:
   ```bash
   npm i -g vercel
   vercel
   ```
3. No painel do Vercel não é necessário configurar "Build Command" nem
   "Output Directory" — é site estático puro. Se o Vercel perguntar,
   escolha **Other** como framework.

Pronto: a URL pública do Vercel já vai estar lendo/escrevendo direto no
seu banco Supabase, de qualquer navegador, sem precisar do Electron.

## 4. E o app Electron (`main.js`)?
Ele continua funcionando exatamente como antes — a única mudança é que o
`nortec_os.html` que ele carrega agora fala com a internet (Supabase) em
vez de `localStorage`. Duas formas de usar:

- **Opção simples:** deixe o Electron carregando o `index.html` local
  (`win.loadFile('index.html')`), do jeito que já está. Ele vai puxar/salvar
  os dados no Supabase pela internet mesmo rodando localmente.
- **Opção alternativa:** trocar `win.loadFile(...)` por
  `win.loadURL('https://seu-app.vercel.app')`, e aí o Electron vira só uma
  "casca" apontando pra versão hospedada — assim você atualiza o site uma
  vez e todo mundo (web e desktop) já pega a versão nova.

Qualquer uma das duas funciona porque o dado real mora no Supabase, não no
HTML.
