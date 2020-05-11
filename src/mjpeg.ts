import { CircularDataFrame, FieldType, MutableVector, DataFrame } from '@grafana/data';
import { getTemplateSrv } from '@grafana/runtime';

interface StreamInfo {
  stream: string;
  opened: number;
  lastMessage: number;
  chunks: number;
  observers: number;
}

const SOI = new Uint8Array(2);
SOI[0] = 0xff;
SOI[1] = 0xd8;
// const TYPE_JPEG = 'image/jpeg';

// We return a StreamHandler wrapped in a promise from the datasource's
// Query method. Grafana expects this object to have a `subscribe` method,
// which it reads live data from.
export class StreamHandler {
  url = '';
  //subject = new Subject<DataQueryResponse>();
  info: StreamInfo;
  isOpen: boolean;
  reader?: ReadableStreamReader<Uint8Array>;
  templateSrv: any;

  images: CircularDataFrame = new CircularDataFrame({ capacity: 30 });
  time: MutableVector<number>;
  image: MutableVector<string>;

  // MJpeg
  headers = '';
  contentLength = 0;
  imageBuffer: Uint8Array = new Uint8Array();
  bytesRead = 0;

  constructor(private callback: (frame: DataFrame) => void) {
    this.info = {
      stream: 'stream',
      opened: Date.now(),
      lastMessage: (undefined as unknown) as number,
      chunks: 0,
      observers: 0,
    };
    this.time = this.images.addField({ name: 'Time', type: FieldType.time }).values;
    this.image = this.images.addField({ name: 'Image', type: FieldType.string }).values;

    this.isOpen = false;
    this.templateSrv = getTemplateSrv();
  }

  open(url: string) {
    url = this.templateSrv.replace(url);
    if (this.url === url && this.isOpen) {
      console.log('Already open...', url);
      return;
    }
    this.url = url;
    if (this.isOpen) {
      this.close();
    }

    console.log('Stream Images from', url);
    fetch(new Request(url)).then(response => {
      if (response.body) {
        this.isOpen = true;
        this.reader = response.body.getReader();
        this.reader.read().then(this.processChunk);
      }
    });
  }

  processChunk = (chunk: ReadableStreamReadResult<Uint8Array>): any => {
    const { value, done } = chunk;
    this.info.chunks++;
    if (value) {
      for (let index = 0; index < value.length; index++) {
        // we've found start of the frame. Everything we've read till now is the header.
        if (value[index] === SOI[0] && value[index + 1] === SOI[1]) {
          const len = getLength(this.headers);
          if (len > 0) {
            // Some jpegs seem to have multiple start bytes, only init on the first
            if (this.contentLength === 0) {
              console.log('jpeg start byte: ' + index);
              this.contentLength = len;
              this.imageBuffer = new Uint8Array(new ArrayBuffer(len));
            }
          } else {
            console.log('Did not find length in: ' + this.headers);
          }
        }
        // we're still reading the header.
        if (this.contentLength <= 0) {
          this.headers += String.fromCharCode(value[index]);
        }
        // we're now reading the jpeg.
        else if (this.bytesRead <= this.contentLength) {
          this.imageBuffer[this.bytesRead++] = value[index];
        } else {
          const b64 = btoa(String.fromCharCode.apply(null, (this.imageBuffer as unknown) as number[]));
          this.time.add(getTime(this.headers));
          this.image.add(b64);

          // // we're done reading the jpeg. Time to render it.
          // const obj = URL.createObjectURL(new Blob([this.imageBuffer], {type: 'image/jpeg'}));
          console.log(
            'added image... : ' + this.bytesRead + ' ts: ' + getTime(this.headers) + ' content: ' + this.contentLength
          );
          this.callback(this.images);

          // document.getElementById('image').src = ;
          // frames++;
          this.contentLength = 0;
          this.bytesRead = 0;
          this.headers = '';
        }
      }
    }

    // this.subject.next({
    //   data: Object.values(this.data),
    //   key: this.info.stream,
    //   state: value.done ? LoadingState.Done : LoadingState.Streaming,
    // });

    if (done) {
      this.isOpen = false;
      this.reader = undefined;
      console.log('Finished stream');
      //this.subject.complete(); // necessary?
      return;
    }

    return this.reader!.read().then(this.processChunk);
  };

  handleMessage(msg: any) {
    console.log('MSG', msg);
  }

  close() {
    if (this.reader) {
      this.reader.cancel();
      this.reader = undefined;
    }
    this.isOpen = false;
  }
}

function getLength(headers: string) {
  for (const header of headers.split('\n')) {
    const pair = header.split(':');
    if (pair.length === 2 && 'content-length' === pair[0].toLowerCase()) {
      return +pair[1].trim();
    }
  }
  return -1;
}

function getTime(headers: string): number {
  for (const header of headers.split('\n')) {
    const pair = header.split(':');
    if (pair.length === 2 && 'x-timestamp' === pair[0].toLowerCase()) {
      return new Date(+pair[1].trim()).getTime();
    }
  }
  return Date.now();
}
