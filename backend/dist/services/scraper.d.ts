import { ScrapedContent } from '../types';
export declare class ScraperService {
    scrapeUrl(url: string): Promise<Partial<ScrapedContent>>;
    private scrapeStatic;
    private scrapeDynamic;
    private isValidUrl;
}
