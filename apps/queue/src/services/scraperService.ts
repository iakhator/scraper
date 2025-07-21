import axios from 'axios';
import * as cheerio from 'cheerio';
import { Cluster } from 'puppeteer-cluster';
import { ScrapedContent } from '../types';
import logger from '../utils/logger';
import { urlSchema } from '../utils/validators';
import { config } from '../aws-wrapper/config';

export class ScraperService {
  private cluster: Cluster | null = null;

  async init(): Promise<void> {
    if (!this.cluster) {
      try {
        this.cluster = await Cluster.launch({
          concurrency: Cluster.CONCURRENCY_PAGE,
          maxConcurrency: 4,
          puppeteerOptions: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
          },
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

  private async scrapeStatic(url: string): Promise<Partial<ScrapedContent>> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const $ = cheerio.load(response.data);

      return {
        title: $('title').text().trim() || $('h1').first().text().trim(),
        content: $('body').text().replace(/\s+/g, ' ').trim(),
        metadata: {
          description: $('meta[name="description"]').attr('content'),
          keywords: $('meta[name="keywords"]')
            .attr('content')
            ?.split(',')
            .map((k) => k.trim()),
          author: $('meta[name="author"]').attr('content'),
          publishDate: $('meta[property="article:published_time"]').attr('content'),
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
        await page.goto(url, { waitUntil: 'networkidle2', timeout: config.pageTimeout});

        const result = await page.evaluate(() => {
          const getMetaContent = (selector: string) => {
            const element = document.querySelector(selector);
            return element ? element.getAttribute('content') : undefined;
          };

          return {
            title: document.title || document.querySelector('h1')?.textContent?.trim(),
            content: document.body.innerText.replace(/\s+/g, ' ').trim(),
            metadata: {
              description: getMetaContent('meta[name="description"]'),
              keywords: getMetaContent('meta[name="keywords"]')?.split(',').map((k) => k.trim()),
              author: getMetaContent('meta[name="author"]'),
              publishDate: getMetaContent('meta[property="article:published_time"]'),
            },
          };
        });

        return result;
      } catch (error:any) {
        if (error.name === 'TimeoutError') {
          logger.warn(`Timeout while loading ${url}, falling back to partial content`);
          const partialResult = await page.evaluate(() => ({
            title: document.title || '',
            content: document.body.innerText.replace(/\s+/g, ' ').trim(),
            metadata: {},
          }));
          return partialResult;
        }
        throw error;
      }
    });
  }
}
