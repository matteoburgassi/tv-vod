export interface AssetItem {
  ratio_tech_label: string;
  height: number;
  width: number;
  url: string;
}

export interface ContentAssets {
  cover?: AssetItem[];
  icon?: AssetItem[];
  screenshot?: AssetItem[];
  'art-background'?: AssetItem[];
  highlight?: AssetItem[];
  'highlight-title'?: AssetItem[];
}

export interface DeliveryQuality {
  url: string;
}

export interface ContentDeliveries {
  ba?: Record<string, DeliveryQuality[]>;
}

export interface ContentItem {
  title: string;
  description: string;
  content_id: number;
  content_type: string;
  rubric_id: number[];
  assets: ContentAssets;
  deliveries?: ContentDeliveries;
}

export interface RubricItem {
  rubric_id: number;
  rubric_title: string;
  nb_content: number;
}

export interface ApiResponse<T> {
  data: {
    data: T[];
  };
}
