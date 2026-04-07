# Guia de Deploy - Revise IA (Hostinger Node.js)

Este guia explica como colocar o **Revise IA** no ar usando o serviço "Web App Node.js" da Hostinger com deploy automatizado via GitHub.

## 📋 Pré-requisitos
1.  **Banco de Dados**: Ter o banco MySQL criado no hPanel da Hostinger e os dados importados (use o arquivo `reviseia.sql` se necessário).
2.  **Repositório**: O código deve estar no seu GitHub.
3.  **Domínio**: Um domínio ou subdomínio apontado para a Hostinger.

---

## 🚀 Passo a Passo no hPanel

### 1. Criar o Web App Node.js
- Vá em **Websites** -> **Novo Website**.
- Selecione **Node.js**.
- Conecte ao seu repositório do GitHub e selecione a branch `main`.

### 2. Configurar Variáveis de Ambiente
No painel do Web App Node.js, encontre a seção de **Variáveis de Ambiente** e adicione:

| Váriavel | Valor Exemplo |
| :--- | :--- |
| `DB_HOST` | `localhost` (ou o IP/Host fornecido pela Hostinger) |
| `DB_PORT` | `3306` |
| `DB_NAME` | `u123456789_reviseia` |
| `DB_USER` | `u123456789_user` |
| `DB_PASSWORD` | `SuaSenhaSegura` |
| `NODE_ENV` | `production` |
| `PORT` | `3000` (A Hostinger geralmente gerencia a porta, mas você pode definir) |

### 3. Configurações de Build e Start
No campo de configurações de inicialização do painel Hostinger:

-   **Comando de Instalação**: `npm install`
-   **Comando de Build**: `npm run build`
-   **Arquivo Principal (Open file)**: `index.js`
-   **Versão do Node**: Use a 18 ou superior.

### 4. Deploy
- Clique em **Deploy** ou **Deploy Manual** na primeira vez.
- O sistema irá baixar o código, rodar o `npm install`, executar o `vite build` para gerar a pasta `dist` e então iniciar o servidor `index.js`.

---

## 🛠️ Verificação de Erros
-   **Erro de Banco**: Verifique se o `DB_HOST` está correto. Em muitos servidores Hostinger, o banco de dados é acessado via `localhost` ou um hostname específico visível na aba MySQL.
-   **Página Não Encontrada (404)**: O `index.js` está configurado para servir a pasta `dist`. Certifique-se de que o comando `npm run build` foi executado com sucesso durante o deploy.
-   **Logs**: Use a aba **Logs** do hPanel para ver erros do Node.js em tempo real.

---

## 🔄 Como Atualizar
Toda vez que você fizer um `git push` para a branch `main`, se o deploy automático estiver ativado, a Hostinger irá:
1. Puxar o código novo.
2. Rodar o build.
3. Reiniciar o servidor.

---

**Equipe Revise IA**
