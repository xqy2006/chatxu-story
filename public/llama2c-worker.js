self.addEventListener('message', async function(e){
  var pageDirectory = self.location.href.substr(0, self.location.href.lastIndexOf('/'));
  var wasiModule = await import(pageDirectory + '/vendor/wasi.js');
  var WASIJS = wasiModule.WASI;
  var WASIContext = wasiModule.WASIContext;

  var context;
  var result;

  // Initialize WASM memory.
  var wasmMemory = new WebAssembly.Memory({initial:32, maximum: 10000});
  var wasmImports = {
    JS: {},
    env: {memory: wasmMemory, table: new WebAssembly.Table({initial: 2, element: 'anyfunc'})},
  };
  var fileRequest = await fetch(pageDirectory + '/' + 'tokenizer.bin');
  //var fileRequest = await fetch("https://github.com/xqy2006/chatxu-story/releases/download/0.0.1/tokenizer.bin");
  var fileContent = await fileRequest.arrayBuffer();

  var modelURL = pageDirectory + '/' + 'model_1.bin';
  //var modelURL = "http://storage.live.com/items/D35C9B07337400A!5338:/model.bin?authkey=!AMqpKPn7vxsmE8c";
  if (isLocalhost()) { modelURL = pageDirectory + '/' + 'model_1.bin'; }

  var modelFileRequest = await fetch(modelURL);
  var modelURL = pageDirectory + '/' + 'model_2.bin';
  if (isLocalhost()) { modelURL = pageDirectory + '/' + 'model_2.bin'; }

  var modelFileRequest2 = await fetch(modelURL);

  var contentLength = String(Number(modelFileRequest.headers.get('Content-Length'))+Number(modelFileRequest2.headers.get('Content-Length')));

  var responseSize = 0;
  let chunksAll = new Uint8Array(contentLength); // (4.1)

  for await (var chunk of streamAsyncIterable(modelFileRequest.body)) {
    chunksAll.set(chunk, responseSize); // (4.2)
    responseSize += chunk.length;
    self.postMessage({
      eventType: "MODELDOWNLOADPROGRESS",
      eventData: responseSize / contentLength
    });
  }
  for await (var chunk of streamAsyncIterable(modelFileRequest2.body)) {
    chunksAll.set(chunk, responseSize); // (4.2)
    responseSize += chunk.length;
    self.postMessage({
      eventType: "MODELDOWNLOADPROGRESS",
      eventData: responseSize / contentLength
    });
  }
  async function* streamAsyncIterable(stream) {
    const reader = stream.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) return
        yield value
      }
    } finally {
      reader.releaseLock()
    }
  }

  var output = '';

  context = new WASIContext({
    args: ['run', 'model.bin', '-i', '标题：'+e.data, '-t',0.8,'-n',1024],
    stdout: function (out) { 
              console.log(out)
              output += out;
              self.postMessage({
                eventType: "STDOUT",
                eventData: out
              });
            },
    stderr: function (err) {
      self.postMessage({
        eventType: "STDERR",
        eventData: err
      }); 
      console.error('stderr', err); 
    },
    stdin: () => prompt('stdin:'),
    fs: {
      '/model.bin': {
        path: modelFileRequest.name,
        timestamps: {
          change: new Date(modelFileRequest.headers.get('Last-Modified')),
          access: new Date(modelFileRequest.headers.get('Last-Modified')),
          modification: new Date(modelFileRequest.headers.get('Last-Modified')),
        },
        mode: 'binary',
        content: new Uint8Array(chunksAll),
      },
      '/tokenizer.bin': {
        path: 'tokenizer.bin',
        timestamps: {
          change: new Date(fileRequest.headers.get('Last-Modified')),
          access: new Date(fileRequest.headers.get('Last-Modified')),
          modification: new Date(fileRequest.headers.get('Last-Modified')),
        },
        mode: 'binary',
        content: new Uint8Array(fileContent),
      }
    }
  });

  function isLocalhost() {
    var url = self.location.origin;  
    return url.indexOf('127.0.0.1') !== -1 || url.indexOf('localhost') !== -1;
  }

  result = await WASIJS.start(fetch('llama2c.wasm'), context, wasmImports);
})
