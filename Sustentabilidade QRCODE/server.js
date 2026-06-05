const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

// Simular fetch para Node.js se necessário
let fetch;
try {
  fetch = require('node-fetch');
} catch (e) {
  // Node 18+ tem fetch nativo
  if (typeof globalThis !== 'undefined' && globalThis.fetch) {
    fetch = globalThis.fetch;
  }
}

const PORT = 3000;

// URLs dos feeds
const FEEDS = {
  primary: 'https://folhadolitoral.com.br/editorias/meio-ambiente/feed/',
  fallback: 'https://folhadolitoral.com.br/feed/'
};

// Termos de priorização
const PRIORITY_TERMS = [
  'paranaguá', 'paranagua',
  'meio ambiente',
  'sustentabilidade', 'sustentável', 'sustentavel',
  'fauna', 'flora',
  'natureza',
  'reciclagem', 'resíduos', 'residuos',
  'saneamento',
  'manguezais', 'manguezal',
  'baía', 'baia',
  'litoral',
  'educação ambiental', 'educacao ambiental',
  'preservação', 'preservacao',
  'arborização', 'arborizacao',
  'coleta seletiva'
];

/**
 * Parser XML simples (sem dependências)
 */
function parseXML(xmlText) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xmlText)) !== null) {
    const itemContent = match[1];
    const item = {};

    // Extrai título
    const titleMatch = itemContent.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    item.title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : '';

    // Extrai link
    const linkMatch = itemContent.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
    item.link = linkMatch ? linkMatch[1].replace(/<[^>]*>/g, '').trim() : '';

    // Extrai data
    const dateMatch = itemContent.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) || 
                      itemContent.match(/<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i);
    item.date = dateMatch ? dateMatch[1].trim() : '';

    // Extrai descrição
    const descMatch = itemContent.match(/<description[^>]*>([\s\S]*?)<\/description>/i) ||
                      itemContent.match(/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i);
    const descContent = descMatch ? descMatch[1] : '';
    item.description = stripHtml(descContent).substring(0, 300);

    // Extrai autor
    const authorMatch = itemContent.match(/<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i) ||
                        itemContent.match(/<author[^>]*>([\s\S]*?)<\/author>/i);
    item.author = authorMatch ? authorMatch[1].replace(/<[^>]*>/g, '').trim() : '';

    // Extrai imagem
    item.image = extractImageFromContent(descContent);

    // Adiciona source info
    item.sourceName = 'Folha do Litoral News';
    item.sourceUrl = 'https://folhadolitoral.com.br/';

    if (item.title && item.link) {
      items.push(item);
    }
  }

  return items;
}

/**
 * Remove tags HTML
 */
function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

/**
 * Extrai imagem do conteúdo
 */
function extractImageFromContent(content) {
  if (!content) return null;
  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch && imgMatch[1]) {
    return imgMatch[1];
  }
  return null;
}

/**
 * Calcula score de relevância
 */
function calculatePriorityScore(item) {
  const text = `${item.title || ''} ${item.description || ''}`.toLowerCase();
  let score = 0;
  PRIORITY_TERMS.forEach(term => {
    if (text.includes(term.toLowerCase())) {
      score += 10;
    }
  });
  return score;
}

/**
 * Remove duplicatas
 */
function removeDuplicates(items) {
  const seen = new Set();
  return items.filter(item => {
    if (item.link && !seen.has(item.link)) {
      seen.add(item.link);
      return true;
    }
    return false;
  });
}

/**
 * Formata data em pt-BR
 */
function formatDatePtBR(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  } catch (e) {
    return '';
  }
}

/**
 * Valida se está nos últimos 12 meses
 */
function isWithinLast12Months(dateString) {
  if (!dateString) return true;
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return true;
    const now = new Date();
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(now.getFullYear() - 1);
    return date >= twelveMonthsAgo;
  } catch (e) {
    return true;
  }
}

/**
 * Busca e processa feed
 */
async function fetchAndParseFeed(feedUrl) {
  return new Promise((resolve) => {
    const https = require('https');
    const http = require('http');
    const client = feedUrl.startsWith('https') ? https : http;

    const request = client.get(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      },
      timeout: 10000
    }, (response) => {
      let data = '';

      response.on('data', chunk => {
        data += chunk;
      });

      response.on('end', () => {
        try {
          const items = parseXML(data);
          resolve(items);
        } catch (error) {
          console.error(`Erro ao processar ${feedUrl}:`, error.message);
          resolve([]);
        }
      });
    }).on('error', (error) => {
      console.error(`Erro ao buscar ${feedUrl}:`, error.message);
      resolve([]);
    });

    request.setTimeout(10000, () => {
      request.destroy();
      resolve([]);
    });
  });
}

/**
 * Obtém notícias processadas
 */
async function getNews() {
  console.log('Buscando notícias...');

  // Busca o feed principal
  let allNews = await fetchAndParseFeed(FEEDS.primary);
  console.log(`Feed principal: ${allNews.length} notícias`);

  // Se poucas notícias, busca o fallback
  if (allNews.length < 10) {
    const fallbackNews = await fetchAndParseFeed(FEEDS.fallback);
    console.log(`Feed fallback: ${fallbackNews.length} notícias`);
    allNews = [
      ...allNews,
      ...fallbackNews.filter(item => !allNews.find(n => n.link === item.link))
    ];
  }

  // Remove duplicatas
  allNews = removeDuplicates(allNews);

  // Filtra recentes
  allNews = allNews.filter(isWithinLast12Months);

  // Ordena e prioriza
  allNews = allNews
    .map(item => ({
      ...item,
      priorityScore: calculatePriorityScore(item),
      dateObj: new Date(item.date || ''),
      formattedDate: formatDatePtBR(item.date)
    }))
    .sort((a, b) => {
      const dateDiff = b.dateObj - a.dateObj;
      if (dateDiff !== 0) return dateDiff;
      return b.priorityScore - a.priorityScore;
    })
    .map(item => {
      const { priorityScore, dateObj, ...rest } = item;
      return rest;
    })
    .slice(0, 50);

  console.log(`Total retornado: ${allNews.length} notícias\n`);
  return allNews;
}

/**
 * Cria servidor HTTP
 */
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // API de notícias
  if (pathname === '/api/news') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    try {
      const news = await getNews();
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        count: news.length,
        news: news
      }));
    } catch (error) {
      res.writeHead(500);
      res.end(JSON.stringify({
        success: false,
        error: error.message,
        news: []
      }));
    }
    return;
  }

  // Serve arquivo HTML
  if (pathname === '/' || pathname === '') {
    const filePath = path.join(__dirname, 'qr-verde-paranagua.html');
    fs.readFile(filePath, 'utf8', (err, content) => {
      if (err) {
        res.writeHead(404);
        res.end('Arquivo não encontrado');
        return;
      }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.writeHead(200);
      res.end(content);
    });
    return;
  }

  // Serve arquivos estáticos
  if (pathname.match(/\.(js|css|json|png|jpg|jpeg|gif|svg)$/)) {
    const filePath = path.join(__dirname, pathname);
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404);
        res.end('Arquivo não encontrado');
        return;
      }
      const ext = path.extname(pathname);
      const mimeTypes = {
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml'
      };
      res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
      res.writeHead(200);
      res.end(content);
    });
    return;
  }

  res.writeHead(404);
  res.end('Página não encontrada');
});

server.listen(PORT, () => {
  console.log('\n✅ Servidor rodando em http://localhost:' + PORT);
  console.log('📰 API de notícias: http://localhost:' + PORT + '/api/news');
  console.log('🌐 Site: http://localhost:' + PORT + '\n');
  console.log('Abra seu navegador e acesse: http://localhost:' + PORT + '\n');
});
