import 'dotenv/config';
import express from 'express';
import OpenAI from 'openai';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { URL } from 'url';

const app = express();
const port = process.env.PORT || 3000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Apply rate limiter and CORS
app.use(limiter);
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const model = process.env.OPENAI_MODEL || "gpt-4";

// Validate URL
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (err) {
    return false;
  }
}

function cleanHTML(html) {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const body = document.body;

  if (!body) {
    return { title: '', headings: [], content: 'No body content found' };
  }

  // Remove scripts, styles, and other non-content elements
  const elementsToRemove = [
    'script',
    'style',
    'iframe',
    'noscript',
    'svg',
    'video',
    'audio',
    'img',
    'meta',
    'link',
  ];

  // Remove all non-content elements
  elementsToRemove.forEach(tag => {
    body.querySelectorAll(tag).forEach(el => el.remove());
  });

  // Remove all hidden elements
  body.querySelectorAll('*').forEach(el => {
    const style = dom.window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') {
      el.remove();
    }
  });

  // Get main content area (if exists)
  const mainContent = body.querySelector('main') || 
                     body.querySelector('article') || 
                     body.querySelector('#content') || 
                     body.querySelector('.content') || 
                     body;

  // Get visible text content
  const content = mainContent.textContent
    .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
    .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
    .trim();

  // Get main headings from the content area
  const headings = Array.from(mainContent.querySelectorAll('h1, h2, h3'))
    .map(h => h.textContent.trim())
    .filter(Boolean);

  return {
    title: document.title || '',
    headings,
    content: content.substring(0, 3000) // Limit content length
  };
}

app.post('/api/analyze', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  if (!isValidUrl(url)) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  try {
    // Add AbortController for better timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'RoastMy.Site Bot/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br'
      }
    });

    clearTimeout(timeoutId);
    
    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ error: 'The webpage could not be found. Please check if the URL is correct.' });
      } else if (response.status === 403 || response.status === 401) {
        return res.status(403).json({ error: 'Access to this webpage is restricted. Please try a different URL.' });
      } else if (response.status >= 500) {
        return res.status(502).json({ error: 'The target website is experiencing issues. Please try again later.' });
      }
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.toLowerCase().includes('text/html')) {
      return res.status(400).json({ error: 'The URL must point to a webpage (HTML content). Other file types are not supported.' });
    }

    let html;
    try {
      html = await response.text();
      if (!html || html.trim().length === 0) {
        throw new Error('Empty response');
      }
    } catch (error) {
      return res.status(400).json({ error: 'Failed to read webpage content. The page might be too large or empty.' });
    }

    const cleanedContent = cleanHTML(html);
    
    if (!cleanedContent.content || cleanedContent.content.trim().length === 0) {
      return res.status(400).json({ error: 'No readable content found on this webpage. Try a different URL.' });
    }

    const prompt = `
URL: ${url}
Title: ${cleanedContent.title}

Main Headings:
${cleanedContent.headings.join('\n')}

Content:
${cleanedContent.content}
    `;

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: "You are a witty roast master with a sharp eye for detail and irony. Your roasts are clever, funny, and observant - focusing on content, style, and presentation. While your humor is biting, it should feel like a friendly roast at a comedy club, not a mean-spirited attack. Use specific details from the content to craft personalized, memorable jokes."
        },
        {
          role: "user",
          content: `Roast this content with your sharpest wit:\n${prompt}`
        }
      ],
      temperature: 0.9,
      max_tokens: 1000
    });

    res.json({ analysis: completion.choices[0].message.content });
  } catch (error) {
    console.error('Error:', error);
    let errorMessage;
    
    if (error.name === 'AbortError') {
      errorMessage = 'The webpage took too long to respond. Please try a different URL.';
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'Could not connect to the website. Please check if the URL is correct.';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'The website refused the connection. It might be down or blocking our requests.';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'The connection to the website timed out. Please try again later.';
    } else {
      errorMessage = process.env.NODE_ENV === 'production'
        ? 'Failed to analyze the webpage. Please try again later.'
        : error.message;
    }
    
    res.status(500).json({ error: errorMessage });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});