import { load } from 'cheerio';
import { ScrapedContent } from '../types';
import { logger } from './logger';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export class ScraperService {
  async scrapeUrl(url: string): Promise<Partial<ScrapedContent>> {
    const startTime = Date.now();

    if (!this.isValidUrl(url)) {
      throw new Error(`Invalid URL: ${url}`);
    }

    try {
      // Try static scraping first (faster)
      const staticResult = await this.scrapeStatic(url);
      if (staticResult.content && staticResult.content.length > 100) {
        return {
          ...staticResult,
          processingTime: Date.now() - startTime,
          scrapedAt: new Date().toISOString(),
        };
      }

      // Fallback to dynamic scraping if static fails
      logger.info(`Static scraping failed for ${url}, trying dynamic scraping`);
      return await this.scrapeDynamic(url, startTime);
    } catch (error) {
      const err = error as Error;
      logger.error(`Failed to scrape URL: ${url}`, { error: err.message });
      throw err;
    }
  }

  private async scrapeStatic(url: string): Promise<Partial<ScrapedContent>> {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const $ = load(html);
      
      // Extract basic metadata
      const title = $('title').text().trim() || 
                   $('meta[property="og:title"]').attr('content') || 
                   $('h1').first().text().trim();

      const description = $('meta[name="description"]').attr('content') || 
                         $('meta[property="og:description"]').attr('content');

      // Use Readability for better content extraction
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      return {
        title,
        content: article?.textContent || $('body').text().trim(),
        metadata: {
          description,
          keywords: $('meta[name="keywords"]').attr('content')?.split(',').map((k: string) => k.trim()),
          author: $('meta[name="author"]').attr('content') || 
                 $('meta[property="article:author"]').attr('content'),
          publishDate: $('meta[property="article:published_time"]').attr('content') ||
                      $('meta[name="date"]').attr('content'),
        },
      };
    } catch (error) {
      const err = error as Error;
      logger.debug(`Static scraping failed for ${url}`, { error: err.message });
      throw err;
    }
  }

  private async scrapeDynamic(url: string, startTime: number): Promise<Partial<ScrapedContent>> {
    // For now, throw an error - we can implement Puppeteer later if needed
    throw new Error('Dynamic scraping not implemented in simplified version');
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
