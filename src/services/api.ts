import type { ContentItem, RubricItem, ApiResponse } from '../types/api';
import {
  API_BASE_URL,
  API_KEY,
  API_SECRET,
  CAMPAIGN_ID,
  COUNTRY_CODE,
  LANGUAGE_CODE,
} from '../constants/api';

function buildParams(extra: Record<string, string> = {}): URLSearchParams {
  return new URLSearchParams({
    api_key: API_KEY,
    api_secret_key: API_SECRET,
    country_code: COUNTRY_CODE,
    language_code: LANGUAGE_CODE,
    campaign_id: CAMPAIGN_ID,
    ...extra,
  });
}

export async function fetchRubricList(rubricId: string): Promise<RubricItem[]> {
  const params = buildParams({ rubric_id: rubricId });
  const res = await fetch(`${API_BASE_URL}/publishing-rubric-list?${params}`);
  const json: ApiResponse<RubricItem> = await res.json();
  return json.data?.data ?? [];
}

export async function fetchContentsByCategory(rubricId: string): Promise<ContentItem[]> {
  const params = buildParams({
    rubric_id: rubricId,
    preview: 'true',
    asset: 'true',
    delivery: 'true',
  });
  const res = await fetch(`${API_BASE_URL}/publishing-content-list?${params}`);
  const json: ApiResponse<ContentItem> = await res.json();
  return json.data?.data ?? [];
}

export async function fetchContentDetail(contentId: number): Promise<ContentItem | null> {
  const params = buildParams({
    content_id: String(contentId),
    preview: 'true',
    asset: 'true',
    delivery: 'true',
  });
  const res = await fetch(`${API_BASE_URL}/publishing-content-detail?${params}`);
  const json: ApiResponse<ContentItem> = await res.json();
  const items = json.data?.data;
  return items?.[0] ?? null;
}

export async function searchContent(query: string): Promise<ContentItem[]> {
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
  const res = await fetch(`${API_BASE_URL}/publishing-content-list?${params}`);
  const json: ApiResponse<ContentItem> = await res.json();
  return json.data?.data ?? [];
}
