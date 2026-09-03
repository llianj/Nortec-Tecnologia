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

Coloque a `logo.jpeg` na mesma pasta do HTML (o app já espera esse nome de arquivo).

## 3. Rode local pra testar
Não precisa de build nem servidor Node — é HTML puro com o SDK do Supabase
via CDN. Basta abrir o arquivo num servidor estático simples, por exemplo:

```bash
npx serve .
```

Faça login com `admin / 123` e confirme que consegue cadastrar cliente,
produto, abrir uma OS etc. — e que os dados aparecem na tabela do Supabase
(Table Editor).

## 4. Deploy no Vercel
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

## 5. E o app Electron (`main.js`)?
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

## 6. Pontos de atenção importantes

- **Senhas em texto puro:** a tabela `funcionarios` guarda a senha (`pass`)
  sem hash, igual ao app original. Isso já era assim no localStorage, mas
  agora os dados moram num banco acessível pela internet. Se isso importa
  pra você, o próximo passo seria migrar o login para o Supabase Auth.
- **RLS liberado pra `anon`:** o schema libera leitura/escrita total pra
  chave anon (necessário porque o app não usa Supabase Auth). Isso é
  equivalente ao nível de segurança que o app já tinha (dado local, sem
  proteção), só que agora exposto via internet. Veja o comentário no final
  do `supabase_schema.sql`.
- **Rastreio público de OS:** a tela "Rastrear Equipamento" agora consulta
  a tabela `ordens` direto do navegador, sem login — então ela também
  depende da policy de RLS liberada. Isso significa que qualquer pessoa que
  souber (ou tentar) um número de OS consegue ver o laudo técnico, valores
  etc. Antes isso só existia no localStorage de quem estava logado.
- **Fotos em base64 dentro do JSON:** o app continua comprimindo as fotos
  (500px, qualidade 0.6) e salvando como base64 dentro da coluna `photos`
  (jsonb). Funciona, mas se o volume de fotos crescer muito o ideal no
  futuro é migrar para o **Supabase Storage** (upload de arquivo real) em
  vez de guardar a imagem inteira dentro da linha da OS.