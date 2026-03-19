import type { ContentItem, RubricItem, ApiResponse, ApiConfig } from './types.js';

let _config: ApiConfig | null = null;

export function configureApi(config: ApiConfig): void {
  _config = config;
}

function getConfig(): ApiConfig {
  if (!_config) throw new Error('tv-vod-api: call configureApi() before making requests');
  return _config;
}

function buildParams(extra: Record<string, string> = {}): URLSearchParams {
  const cfg = getConfig();
  return new URLSearchParams({
    api_key: cfg.apiKey,
    api_secret_key: cfg.apiSecret,
    country_code: cfg.countryCode,
    language_code: cfg.languageCode,
    campaign_id: cfg.campaignId,
    ...extra,
  });
}

export async function fetchRubricList(rubricId: string): Promise<RubricItem[]> {
  const cfg = getConfig();
  const params = buildParams({ rubric_id: rubricId });
  const res = await fetch(`${cfg.apiBaseUrl}/publishing-rubric-list?${params}`);
  const json: ApiResponse<RubricItem> = await res.json();
  return json.data?.data ?? [];
}

export async function fetchContentsByCategory(rubricId: string): Promise<ContentItem[]> {
  const cfg = getConfig();
  const params = buildParams({
    rubric_id: rubricId,
    preview: 'true',
    asset: 'true',
    delivery: 'true',
  });
  const res = await fetch(`${cfg.apiBaseUrl}/publishing-content-list?${params}`);
  const json: ApiResponse<ContentItem> = await res.json();
  return json.data?.data ?? [];
}

export async function fetchContentDetail(contentId: number): Promise<ContentItem | null> {
  const cfg = getConfig();
  const params = buildParams({
    content_id: String(contentId),
    preview: 'true',
    asset: 'true',
    delivery: 'true',
  });
  const res = await fetch(`${cfg.apiBaseUrl}/publishing-content-detail?${params}`);
  const json: ApiResponse<ContentItem> = await res.json();
  const items = json.data?.data;
  return items?.[0] ?? null;
}

export async function searchContent(query: string): Promise<ContentItem[]> {
  const cfg = getConfig();
  const params = buildParams({
    content_title: query,
    content_type: 'html',
    preview: 'true',
    asset: 'true',
    delivery: 'true',
    without_token: 'true',
    itemsPerPage: '10',
    page: '1',
  });
  const res = await fetch(`${cfg.apiBaseUrl}/publishing-content-list?${params}`);
  const json: ApiResponse<ContentItem> = await res.json();
  return json.data?.data ?? [];
}
