"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScraperService = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const puppeteer_cluster_1 = require("puppeteer-cluster");
const aws_wrapper_1 = require("@scraper/aws-wrapper");
const logger_1 = __importDefault(require("../utils/logger"));
const validators_1 = require("../utils/validators");
class ScraperService {
    constructor() {
        this.cluster = null;
    }
    async init() {
        if (!this.cluster) {
            try {
                this.cluster = await puppeteer_cluster_1.Cluster.launch({
                    concurrency: puppeteer_cluster_1.Cluster.CONCURRENCY_CONTEXT,
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
                logger_1.default.info('Puppeteer cluster initialized');
            }
            catch (error) {
                const errorMessage = `Failed to initialize Puppeteer cluster: ${error.message}`;
                logger_1.default.error(errorMessage, error);
                throw new Error(errorMessage);
            }
        }
    }
    async close() {
        if (this.cluster) {
            try {
                await this.cluster.close();
                this.cluster = null;
                logger_1.default.info('Puppeteer cluster closed');
            }
            catch (error) {
                const errorMessage = `Failed to close Puppeteer cluster: ${error.message}`;
                logger_1.default.error(errorMessage, error);
                throw new Error(errorMessage);
            }
        }
    }
    async scrapeUrl(url) {
        const startTime = Date.now();
        const { error } = validators_1.urlSchema.validate({ url });
        if (error) {
            const errorMessage = `Invalid URL: ${error.details[0].message}`;
            logger_1.default.error(errorMessage);
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
        }
        catch (error) {
            const errorMessage = `Failed to scrape ${url}: ${error.message}`;
            logger_1.default.error(errorMessage, error);
            throw new Error(errorMessage);
        }
    }
    async scrapeStatic(url) {
        try {
            const response = await axios_1.default.get(url, {
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
        }
        catch (error) {
            const errorMessage = `Static scraping failed for ${url}: ${error.message}`;
            logger_1.default.warn(errorMessage);
            throw new Error(errorMessage);
        }
    }
    async scrapeDynamic(url) {
        await this.init();
        return this.cluster.execute(async ({ page }) => {
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
            try {
                await page.goto(url, { waitUntil: 'networkidle2', timeout: aws_wrapper_1.config.pageTimeout });
                const result = await page.evaluate(() => {
                    const getMetaContent = (selector) => {
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
            }
            catch (error) {
                if (error.name === 'TimeoutError') {
                    logger_1.default.warn(`Timeout while loading ${url}, falling back to partial content`);
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
exports.ScraperService = ScraperService;
//# sourceMappingURL=scraperService.js.map