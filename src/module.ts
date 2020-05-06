import { PanelPlugin } from '@grafana/data';
import { SimpleOptions } from './types';
import { ImageViewer } from './ImageViewer';

export const plugin = new PanelPlugin<SimpleOptions>(ImageViewer).setPanelOptions(builder => {
  return builder
    .addRadio({
      path: 'mode',
      defaultValue: 'timeline',
      name: 'Display Mode',
      settings: {
        options: [
          {
            value: 'timeline',
            label: 'Timeline',
          },
          {
            value: 'grid',
            label: 'Grid',
          },
        ],
      },
    })
    .addNumberInput({
      path: 'thumbWidth',
      name: 'Thumbnail width',
      defaultValue: 200,
    })
    .addRadio({
      path: 'source',
      defaultValue: 'query',
      name: 'Image Source',
      settings: {
        options: [
          {
            value: 'query',
            label: 'Query',
          },
          {
            value: 'stream',
            label: 'MJPEG url',
          },
        ],
      },
    })
    .addTextInput({
      path: 'imageUrl',
      name: 'Image URL',
      showIf: s => s.source === 'stream',
      defaultValue: 'http://localhost:8081/',
    });
});
