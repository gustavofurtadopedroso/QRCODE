# QR Verde Paranaguá - Backend de Notícias

## Configuração

Este projeto usa um backend Node.js/Express para integrar o RSS da Folha do Litoral News.

## Pré-requisitos

- Node.js 14+ instalado no seu computador
  - Download: https://nodejs.org/

## Instalação

1. Abra o terminal/PowerShell no diretório do projeto
2. Execute:

```bash
npm install
```

Isso vai instalar as dependências:
- express (servidor web)
- xml2js (conversor de XML para JSON)
- node-fetch (buscar URLs)

## Executar o servidor

No terminal, execute:

```bash
npm start
```

Você verá uma mensagem como:
```
✅ Servidor rodando em http://localhost:3000
📰 API de notícias: http://localhost:3000/api/news
🌐 Site: http://localhost:3000
```

## Acessar o site

1. Abra o navegador
2. Vá para: http://localhost:3000
3. O site estará disponível com as notícias sendo buscadas automaticamente

## API

A API de notícias está em: `http://localhost:3000/api/news`

Exemplo de resposta:
```json
{
  "success": true,
  "count": 10,
  "news": [
    {
      "title": "Notícia sobre meio ambiente",
      "link": "https://folhadolitoral.com.br/...",
      "date": "2026-06-04T10:30:00.000Z",
      "formattedDate": "04 de junho de 2026",
      "description": "Descrição da notícia...",
      "author": "Autor",
      "image": "https://...",
      "sourceName": "Folha do Litoral News",
      "sourceUrl": "https://folhadolitoral.com.br/"
    }
  ]
}
```

## Feeds RSS utilizados

1. **Principal** (Meio Ambiente): https://folhadolitoral.com.br/editorias/meio-ambiente/feed/
2. **Fallback** (Geral): https://folhadolitoral.com.br/feed/

Se o feed principal tiver poucas notícias, o backend busca também o feed geral para complementar.

## Troubleshooting

### Porta 3000 já está em uso

Se receber erro "Port 3000 in use", edite o arquivo `server.js` e mude a porta:

```javascript
const PORT = 3001; // mude para qualquer número livre
```

### Erro de conexão

Verifique se:
1. Node.js está instalado: `node --version`
2. As dependências foram instaladas: pasta `node_modules` existe
3. O servidor está rodando: terminal mostrando "Servidor rodando em..."

### Notícias não carregam

1. Verifique a internet
2. Verifique se os feeds da Folha do Litoral News estão acessíveis
3. Abra http://localhost:3000/api/news no navegador para ver erros

## Estrutura

- `server.js` - Backend com Express
- `package.json` - Dependências do projeto
- `qr-verde-paranagua.html` - Frontend (site)

## Desenvolvimento

Para parar o servidor: `Ctrl + C` no terminal

Para reiniciar: `npm start`

## Produção

Para deploy em produção:
1. Use Vercel, Heroku, ou servidor VPS
2. Configure as variáveis de ambiente conforme necessário
3. Deploy do servidor.js

---

**Projeto**: QR Verde Paranaguá  
**Desenvolvimento**: Sustentabilidade Aplicada à Engenharia de Produção
