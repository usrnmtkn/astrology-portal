export const ARTICLE_HOROSCOPE_SCHEMA: 'sky-article-horoscopes-v1';
export type ArticleHoroscopeSection = {schema:typeof ARTICLE_HOROSCOPE_SCHEMA; heading:string; introduction:string; passages:{risingSign:string; house:number; heading:string; body:string}[]};
export function articleHoroscopeSection(sections:unknown):ArticleHoroscopeSection|null;
export function extractArticleHoroscopes(body:string,contentKey:string):{body:string;articleHoroscopes:ArticleHoroscopeSection;originalHoroscopeBlock:string}|null;
export function articleTemplateWithHoroscopes(body:string,sections:unknown):string;
export function separateArticleHoroscopeRow<T extends {content_key?:string;body?:string|null;sections?:unknown;source_snapshot?:unknown;status?:string;updated_at?:string|null}>(row:T):T;
