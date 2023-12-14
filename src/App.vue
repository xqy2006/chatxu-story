<template>
<div>
    <div class="markdown-body" style="margin-top: 15px;margin-inline-start: 15px;">
        <h1>Chatxu-Story</h1>
        <div>
        <h2>请输入标题：</h2>
        <input v-model="story" class="form-control input" type="text" placeholder="标题" aria-label="标题" />
        <button class="btn btn-primary" :disabled="run123" @click="run() ">生成</button>
        </div>
        <strong><div v-text="pro" style="white-space: pre-wrap;"></div></strong>
        <h2>生成结果：</h2>
        <br />
        <div v-text="output" style="white-space: pre-wrap;"></div>
    </div>

</div>
</template>

<style lang="scss">
@import "@primer/css/index.scss";

html,
body {
    display: block;
    margin: 0px;
    margin-top: 0px;
    margin-right: 0px;
    margin-bottom: 0px;
    margin-left: 0px;
}
</style>

<script>
export default {

    data() {
        return {
            story: "",
            output:"",
            run123:false,
            pro:"模型加载进度："
        };
    },
    methods: {
        run() {
            this.pro = "模型加载进度："
            this.run123 = true
            this.output = ""
            var thus = this
            var workerURL = window.location.href + 'llama2c-worker.js';
            var worker = new Worker(workerURL, {type: 'module'});
            worker.postMessage(this.story+"\n")
            worker.addEventListener('message', function(event) {
                var eventData = event.data;
                console.log([event.data.eventType,event.data.eventData])
                if (event.data.eventType == 'STDOUT') {
                    thus.output += event.data.eventData;
                }
                if (event.data.eventType == 'MODELDOWNLOADPROGRESS') {
                    thus.pro = "模型加载进度："+String(Number(event.data.eventData)*100).substring(0,4)+"%";
                }

                if (event.data.eventType == 'STDERR') {
                    thus.output += "\n"+event.data.eventData;
                    thus.run123 = false
                }
                });
            
        },
    },
}
</script>
