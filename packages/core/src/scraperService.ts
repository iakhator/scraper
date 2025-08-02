import axios from 'axios';
import * as cheerio from 'cheerio';
import { Cluster } from 'puppeteer-cluster';
import { config } from '@iakhator/scraper-aws-wrapper';
import { ScrapedContent } from '@iakhator/scraper-types';
import { logger } from '@iakhator/scraper-logger';
import { urlSchema } from './validators';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export class ScraperService {
  private cluster: Cluster | null = null;

  async init(): Promise<void> {
    if (!this.cluster) {
      try {
        this.cluster = await Cluster.launch({
          concurrency: Cluster.CONCURRENCY_CONTEXT,
          maxConcurrency: 2,
          puppeteerOptions: {
            headless: 'new',
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-accelerated-2d-canvas',
              '--disable-gpu',
              '--disable-web-security',
              '--disable-features=VizDisplayCompositor',
              '--no-first-run',
              '--no-zygote',
              '--disable-background-timer-throttling',
              '--disable-backgrounding-occluded-windows',
              '--disable-renderer-backgrounding',
              '--disable-ipc-flooding-protection',
              '--remote-debugging-port=9222'
            ],
          },
          timeout: 30000,
        });
        logger.info('Puppeteer cluster initialized');
      } catch (error: any) {
        const errorMessage = `Failed to initialize Puppeteer cluster: ${error.message}`;
        logger.error(errorMessage, error);
        throw new Error(errorMessage);
      }
    }
  }

  async close(): Promise<void> {
    if (this.cluster) {
      try {
        await this.cluster.close();
        this.cluster = null;
        logger.info('Puppeteer cluster closed');
      } catch (error: any) {
        const errorMessage = `Failed to close Puppeteer cluster: ${error.message}`;
        logger.error(errorMessage, error);
        throw new Error(errorMessage);
      }
    }
  }

  async scrapeUrl(url: string): Promise<Partial<ScrapedContent>> {
    const startTime = Date.now();

    const { error } = urlSchema.validate({ url });
    if (error) {
      const errorMessage = `Invalid URL: ${error.details[0].message}`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    try {
      // Try static scraping first
      const staticResult = await this.scrapeStatic(url);
      if (staticResult.content && staticResult.content.length > 100) {
        return {
          ...staticResult,
          processingTime: Date.now() - startTime,
        };
      }

      // Fall back to dynamic scraping
      const dynamicResult = await this.scrapeDynamic(url);
      return {
        ...dynamicResult,
        processingTime: Date.now() - startTime,
      };
    } catch (error: any) {
      const errorMessage = `Failed to scrape ${url}: ${error.message}`;
      logger.error(errorMessage, error);
      throw new Error(errorMessage);
    }
  }

  private async scrapeStatic(url: string): Promise<Partial<{contentHtml: string} & ScrapedContent>> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      });

      const dom = new JSDOM(response.data, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      if (!article) throw new Error('Failed to extract readable content');

      return {
        title: article.title || dom.window.document.querySelector('title')?.textContent || '',
        content: article.textContent?.trim() || '',
        contentHtml: article.content || '',
        metadata: {
          description: dom.window.document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
          keywords: dom.window.document.querySelector('meta[name="keywords"]')?.getAttribute('content')?.split(',').map((k: string) => k.trim()),
          author: dom.window.document.querySelector('meta[name="author"]')?.getAttribute('content') || '',
          publishDate: dom.window.document.querySelector('meta[property="article:published_time"]')?.getAttribute('content') || '',
        },
      };
    } catch (error: any) {
      const errorMessage = `Static scraping failed for ${url}: ${error.message}`;
      logger.warn(errorMessage);
      throw new Error(errorMessage);
    }
  }

  private async scrapeDynamic(url: string): Promise<Partial<ScrapedContent>> {
    await this.init();

    return this.cluster!.execute(async ({ page }: any) => {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: config.pageTimeout });

        const html = await page.evaluate(() => {
          // Remove junk
          document.querySelectorAll('header, footer, nav, .sidebar, .subscribe, .comments, .advertisement, iframe, script, style').forEach(el => el.remove());
          return new XMLSerializer().serializeToString(document);
        });

        // Use Readability on cleaned DOM
        const dom = new JSDOM(html, { url });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();

        if (!article) {
          // Fallback: just grab text from article containers
          const fallbackText = await page.$eval('article, .entry-content, .post-content, .content', (el: { innerText: any; }) => el.innerText);
          return {
            title: await page.title(),
            content: fallbackText,
            contentHtml: fallbackText,
            metadata: {},
          };
        }

        return {
          title: article.title || await page.title(),
          content: article.textContent?.trim() || '',
          contentHtml: article.content || '',
          metadata: {
            description: dom.window.document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
            keywords: dom.window.document.querySelector('meta[name="keywords"]')?.getAttribute('content')?.split(',').map((k: string) => k.trim()),
            author: dom.window.document.querySelector('meta[name="author"]')?.getAttribute('content') || '',
            publishDate: dom.window.document.querySelector('meta[property="article:published_time"]')?.getAttribute('content') || '',
          },
        };
      } catch (error: any) {
        if (error.name === 'TimeoutError') {
          logger.warn(`Timeout while loading ${url}, falling back to partial content`);
          const partialResult = await page.evaluate(() => ({
            title: document.title || '',
            content: document.body.innerText.replace(/\s+/g, ' ').trim(),
            contentHtml: document.body.innerHTML,
            metadata: {},
          }));
          return partialResult;
        }
        throw error;
      }
    });
  }
}
