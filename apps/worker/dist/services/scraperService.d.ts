import { ScrapedContent } from '@scraper/aws-wrapper';
export declare class ScraperService {
    private cluster;
    init(): Promise<void>;
    close(): Promise<void>;
    scrapeUrl(url: string): Promise<Partial<ScrapedContent>>;
    private scrapeStatic;
    private scrapeDynamic;
}
//# sourceMappingURL=scraperService.d.ts.map