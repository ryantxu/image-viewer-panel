export type DisplayMode = 'timeline' | 'grid' | 'list';

export type ImageSource = 'query' | 'stream';

export interface SimpleOptions {
  mode: DisplayMode;
  thumbWidth: number;
  source: ImageSource;
  imageUrl: string;
}
