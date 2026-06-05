#!/usr/bin/env python3
"""
QR Verde Paranaguá - Backend de Notícias (Python)
Simples servidor HTTP que busca RSS e retorna JSON
"""

import json
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError
from http.server import HTTPServer, BaseHTTPRequestHandler
from threading import Thread
import os

# Configuração
PORT = 3000
FEEDS = {
    'primary': 'https://folhadolitoral.com.br/editorias/meio-ambiente/feed/',
    'fallback': 'https://folhadolitoral.com.br/feed/'
}

PRIORITY_TERMS = [
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
]


class NewsHandler(BaseHTTPRequestHandler):
    """Handler HTTP para servir API e arquivos estáticos"""

    def do_GET(self):
        """Processar requisições GET"""
        if self.path == '/api/news':
            self.get_news()
        elif self.path == '/' or self.path == '':
            self.serve_html()
        else:
            self.send_error(404)

    def end_headers(self):
        """Override para adicionar CORS"""
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def get_news(self):
        """Retornar notícias em JSON"""
        try:
            news = fetch_and_process_news()
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            
            response = {
                'success': True,
                'count': len(news),
                'news': news
            }
            self.wfile.write(json.dumps(response, ensure_ascii=False, indent=2).encode('utf-8'))
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            
            response = {
                'success': False,
                'error': str(e),
                'news': []
            }
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))

    def serve_html(self):
        """Servir arquivo HTML"""
        try:
            html_path = os.path.join(os.path.dirname(__file__), 'qr-verde-paranagua.html')
            with open(html_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(content.encode('utf-8'))
        except FileNotFoundError:
            self.send_error(404)

    def log_message(self, format, *args):
        """Suprimir logs padrão"""
        pass


def fetch_url(url):
    """Buscar conteúdo de URL com timeout"""
    try:
        req = Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urlopen(req, timeout=10) as response:
            return response.read().decode('utf-8', errors='ignore')
    except (URLError, HTTPError, Exception) as e:
        print(f"Erro ao buscar {url}: {e}")
        return None


def parse_xml_feed(xml_text):
    """Parser simples de XML RSS"""
    if not xml_text:
        return []
    
    items = []
    try:
        # Remove namespaces para simplificar
        xml_text = xml_text.replace('<?xml version="1.0"?>', '<?xml version="1.0"?>')
        
        # Parse manual com regex para RSS simples
        item_pattern = r'<item>(.*?)</item>'
        for item_match in re.finditer(item_pattern, xml_text, re.DOTALL):
            item_content = item_match.group(1)
            
            item = {}
            
            # Extrai título
            title_match = re.search(r'<title[^>]*>(.*?)</title>', item_content, re.DOTALL)
            item['title'] = clean_html(title_match.group(1)) if title_match else ''
            
            # Extrai link
            link_match = re.search(r'<link[^>]*>(.*?)</link>', item_content)
            item['link'] = clean_html(link_match.group(1)) if link_match else ''
            
            # Extrai data
            date_match = re.search(r'<pubDate[^>]*>(.*?)</pubDate>', item_content)
            if not date_match:
                date_match = re.search(r'<dc:date[^>]*>(.*?)</dc:date>', item_content)
            item['date'] = clean_html(date_match.group(1)) if date_match else ''
            
            # Extrai descrição
            desc_match = re.search(r'<description[^>]*>(.*?)</description>', item_content, re.DOTALL)
            if not desc_match:
                desc_match = re.search(r'<content:encoded[^>]*>(.*?)</content:encoded>', item_content, re.DOTALL)
            item['description'] = clean_html(desc_match.group(1))[:300] if desc_match else ''
            
            # Extrai autor
            author_match = re.search(r'<(dc:)?creator[^>]*>(.*?)</\1?creator>', item_content)
            if not author_match:
                author_match = re.search(r'<author[^>]*>(.*?)</author>', item_content)
            item['author'] = clean_html(author_match.group(2) if author_match.lastindex == 2 else author_match.group(1)) if author_match else ''
            
            # Extrai imagem
            item['image'] = extract_image(desc_match.group(1) if desc_match else '')
            
            # Info da fonte
            item['sourceName'] = 'Folha do Litoral News'
            item['sourceUrl'] = 'https://folhadolitoral.com.br/'
            
            if item['title'] and item['link']:
                items.append(item)
    
    except Exception as e:
        print(f"Erro ao fazer parse XML: {e}")
    
    return items


def clean_html(text):
    """Remove tags HTML e entities"""
    if not text:
        return ''
    
    text = re.sub(r'<[^>]+>', '', text)
    text = text.replace('&quot;', '"')
    text = text.replace('&apos;', "'")
    text = text.replace('&amp;', '&')
    text = text.replace('&lt;', '<')
    text = text.replace('&gt;', '>')
    
    return text.strip()


def extract_image(content):
    """Extrai URL de imagem do conteúdo"""
    if not content:
        return None
    
    img_match = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', content)
    return img_match.group(1) if img_match else None


def format_date_pt_br(date_str):
    """Formata data em português brasileiro"""
    if not date_str:
        return ''
    
    try:
        # Tenta parsing de RFC 2822 (padrão RSS)
        date_obj = datetime.strptime(date_str.split('+')[0].split('-')[0].strip(), '%a, %d %b %Y %H:%M:%S')
        return date_obj.strftime('%d de %B de %Y').replace(
            'January', 'janeiro').replace('February', 'fevereiro').replace('March', 'março').replace('April', 'abril'
            ).replace('May', 'maio').replace('June', 'junho').replace('July', 'julho').replace('August', 'agosto'
            ).replace('September', 'setembro').replace('October', 'outubro').replace('November', 'novembro'
            ).replace('December', 'dezembro')
    except:
        return ''


def is_recent(date_str):
    """Verifica se data está nos últimos 12 meses"""
    if not date_str:
        return True
    
    try:
        date_obj = datetime.strptime(date_str.split('+')[0].split('-')[0].strip(), '%a, %d %b %Y %H:%M:%S')
        cutoff = datetime.now() - timedelta(days=365)
        return date_obj >= cutoff
    except:
        return True


def calculate_priority_score(item):
    """Calcula score de relevância"""
    text = f"{item.get('title', '')} {item.get('description', '')}".lower()
    score = 0
    
    for term in PRIORITY_TERMS:
        if term.lower() in text:
            score += 10
    
    return score


def remove_duplicates(items):
    """Remove notícias duplicadas por link"""
    seen = set()
    unique = []
    
    for item in items:
        if item.get('link') and item['link'] not in seen:
            seen.add(item['link'])
            unique.append(item)
    
    return unique


def fetch_and_process_news():
    """Busca, processa e retorna notícias"""
    print('Buscando notícias...')
    
    # Busca feed principal
    all_news = parse_xml_feed(fetch_url(FEEDS['primary']))
    print(f"Feed principal: {len(all_news)} notícias")
    
    # Se poucas notícias, busca fallback
    if len(all_news) < 10:
        fallback_news = parse_xml_feed(fetch_url(FEEDS['fallback']))
        print(f"Feed fallback: {len(fallback_news)} notícias")
        
        # Adiciona notícias do fallback que não estão duplicadas
        for item in fallback_news:
            if not any(n['link'] == item['link'] for n in all_news):
                all_news.append(item)
    
    # Remove duplicatas
    all_news = remove_duplicates(all_news)
    
    # Filtra por data recente
    all_news = [item for item in all_news if is_recent(item.get('date', ''))]
    
    # Processa e ordena
    for item in all_news:
        item['priorityScore'] = calculate_priority_score(item)
        item['formattedDate'] = format_date_pt_br(item.get('date', ''))
        item['dateObj'] = datetime.now()
        try:
            item['dateObj'] = datetime.strptime(
                item['date'].split('+')[0].split('-')[0].strip(),
                '%a, %d %b %Y %H:%M:%S'
            )
        except:
            pass
    
    # Ordena por data DESC, depois por score
    all_news.sort(key=lambda x: (-x['dateObj'].timestamp(), -x['priorityScore']))
    
    # Remove campos temporários
    for item in all_news:
        item.pop('priorityScore', None)
        item.pop('dateObj', None)
    
    # Limita a 50
    all_news = all_news[:50]
    
    print(f"Total retornado: {len(all_news)} notícias\n")
    return all_news


def run_server():
    """Inicia servidor HTTP"""
    server_address = ('', PORT)
    httpd = HTTPServer(server_address, NewsHandler)
    
    print('\n✅ Servidor rodando em http://localhost:' + str(PORT))
    print('📰 API de notícias: http://localhost:' + str(PORT) + '/api/news')
    print('🌐 Site: http://localhost:' + str(PORT) + '\n')
    print('Abra seu navegador e acesse: http://localhost:' + str(PORT) + '\n')
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\n\n✅ Servidor parado')
        httpd.server_close()


if __name__ == '__main__':
    run_server()
