# NortecOS — Supabase + Vercel

## 1. Crie o projeto no Supabase
1. Crie um projeto em https://supabase.com
2. Vá em **SQL Editor** → cole o conteúdo de `supabase_schema.sql` → **Run**.
   Isso cria as 7 tabelas (clientes, produtos, servicos, funcionarios, ordens,
   despesas, configuracoes) com um usuário master `admin/123` sendo criado
   automaticamente na primeira vez que o app carregar (se a tabela `funcionarios`
   estiver vazia).

## 2. Configure o app
Abra `nortec_os.html` e edite estas duas linhas no início do `<script>`:

```js
const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
const SUPABASE_ANON_KEY = 'SUA-CHAVE-ANON-PUBLICA';
```




## 3. Deploy no Vercel
1. Suba a pasta (com `index.html` + `logo.jpeg`) para um repositório no
   GitHub, **ou** use a CLI direto:
   ```bash
   npm i -g vercel
   vercel
   ```

