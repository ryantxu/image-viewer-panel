import { PanelPlugin } from "@grafana/data";
import { SimpleOptions } from "./types";
import { ImageViewer } from "./ImageViewer";

export const plugin = new PanelPlugin<SimpleOptions>(
  ImageViewer
).setPanelOptions(builder => {
  return builder
    .addRadio({
      path: "mode",
      defaultValue: "timeline",
      name: "Display Mode",
      settings: {
        options: [
          {
            value: "timeline",
            label: "Timeline"
          },
          {
            value: "grid",
            label: "Grid"
          }
        ]
      }
    })
    .addNumberInput({
      path: "thumbWidth",
      name: "Thumbnail width",
      defaultValue: 200
    });
});
