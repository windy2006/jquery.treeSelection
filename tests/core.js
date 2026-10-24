(async () => {
  "use strict";
  const results = [],
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const assert = (ok, message) => {
    if (!ok) throw new Error(message);
  };
  async function wait(check, message) {
    for (let n = 0; n < 200; n++) {
      if (check()) return;
      await sleep(10);
    }
    throw new Error(message);
  }
  async function test(name, run) {
    if(window.coreProject&&!name.startsWith(window.coreProject+"："))return;
    try {
      await run();
      results.push({ name, pass: true });
    } catch (e) {
      results.push({ name, pass: false, message: e.message });
    }
    const row = document.createElement("li");
    row.textContent =
      (results.at(-1).pass ? "PASS " : "FAIL ") +
      name +
      (results.at(-1).message ? "：" + results.at(-1).message : "");
    document.querySelector("#results").append(row);
    document.querySelectorAll("iframe").forEach((f) => f.remove());
  }
  async function fixture(project, extras = []) {
    const frame = document.createElement("iframe");
    document.body.append(frame);
    const scripts = [
      project + "/vendor/jquery-4.0.0.min.js",
      ...(project === "jquery.powerUpload"
        ? [project + "/vendor/bootstrap-5.3.8.bundle.min.js"]
        : []),
      project +
        "/" +
        (project === "qrcode"
          ? "jquery.qrcode"
          : project === "video"
            ? "jquery.video"
            : project) +
        ".js",
      ...extras,
    ];
    await new Promise((resolve) => {
      frame.onload = resolve;
      frame.srcdoc =
        "<html><head><script>window.testErrors=[];onerror=e=>testErrors.push(String(e));onunhandledrejection=e=>testErrors.push(String(e.reason));window.alert=()=>{};</script>" +
        scripts
          .map((path) => '<script src="/case/default/' + path + '"></script>')
          .join("") +
        '</head><body><main id="fixture"></main></body></html>';
    });
    const w = frame.contentWindow;
    assert(w.jQuery, "jQuery 未加载");
    return {
      frame,
      w,
      $: w.jQuery,
      host: w.document.querySelector("#fixture"),
    };
  }
  function noErrors(w) {
    assert(!w.testErrors.length, w.testErrors.join(";"));
  }
  await test("tree：动态文本安全、特殊 value、选择上限、原生表单值与 change 同步", async () => {
    const { w, $, host } = await fixture("jquery.treeSelection");
    const form = $("<form>").appendTo(host),
      s = $('<select name="tags">').appendTo(form);
    let changes = 0;
    s.on("change.host", () => changes++);
    s.treeSelection({
      multiple: 2,
      data: [
        { name: "<img src=x onerror=alert(1)>", value: 'a"[]' },
        { name: "乙", value: "b" },
        { name: "丙", value: "c" },
      ],
    });
    assert(
      !$(host).find("img").length &&
        $(".treeSelection").text().includes("<img"),
      "选项被解析为 HTML",
    );
    const inputs = $(".treeSelection input");
    inputs[0].click();
    inputs[1].click();
    inputs[2].click();
    assert(s.val().length === 2 && changes === 2, "上限或原生值/事件错误");
    assert(
      new w.FormData(form[0]).getAll("tags[]").join("|") === 'a"[]|b',
      "表单字段丢失或重复",
    );
    $(".treeSelector b span")[0].click();
    assert(s.val().join("") === "b" && changes === 3, "标签删除未同步");
    s.val(['a"[]']).trigger("change");
    assert(inputs[0].checked && !inputs[1].checked, "外部 val 未同步");
    noErrors(w);
  });
  await test("tree：多元素初始化、选中默认值、reset、disabled、重复初始化及 destroy", async () => {
    const { w, $, host } = await fixture("jquery.treeSelection");
    const form = $("<form>").appendTo(host),
      a = $(
        '<select name="a"><option>A</option><option selected>B</option></select>',
      ).appendTo(form),
      b = $(
        '<select name="b"><option>C</option><option>D</option></select>',
      ).appendTo(form);
    const parentStyle = form.attr("style");
    form.find("select").treeSelection();
    assert(
      $(".treeSelector").length === 2 &&
        $(".treeSelector").first().text().includes("B"),
      "实例或默认选择丢失",
    );
    $(".treeSelection").first().find("input")[0].click();
    form[0].reset();
    await sleep(20);
    assert(
      a.val() === "B" && $(".treeSelection").first().find("input")[1].checked,
      "reset 未同步",
    );
    a.prop("disabled", true);
    await sleep(20);
    assert(
      $(".treeSelection")
        .first()
        .find("input")
        .toArray()
        .every((x) => x.disabled),
      "disabled 未同步",
    );
    for (let i = 0; i < 3; i++) a.treeSelection();
    assert($(".treeSelector").length === 2, "重复生成控件");
    a.treeSelection("destroy");
    b.treeSelection("destroy");
    assert(
      !$(".treeSelector").length &&
        a.attr("name") === "a" &&
        (form.attr("style") || "") === (parentStyle || ""),
      "销毁未还原 " +
        JSON.stringify({
          controls: $(".treeSelector").length,
          name: a.attr("name"),
          style: form.attr("style"),
          original: parentStyle,
        }),
    );
    noErrors(w);
  });
  async function picture(w, width = 100, height = 80) {
    const c = w.document.createElement("canvas");
    c.width = width;
    c.height = height;
    c.getContext("2d").fillRect(0, 0, width, height);
    const blob = await new Promise((resolve) => c.toBlob(resolve, "image/png"));
    return new w.File([blob], "test.png", { type: "image/png" });
  }
  function choose(w, input, file) {
    const data = new w.DataTransfer();
    data.items.add(file);
    input.files = data.files;
    input.dispatchEvent(new w.Event("change", { bubbles: true }));
  }
  async function dimensions(w, url) {
    const image = new w.Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = url;
    });
    return [image.naturalWidth, image.naturalHeight];
  }
  await test("resize：固定按大小配置连续处理尺寸一致，PNG 输出与函数配置默认值", async () => {
    const { w, $, host } = await fixture("jquery.resizeImg"),
      input = $('<input type="file">').appendTo(host),
      file = await picture(w),
      values = [];
    const opt = {
      mode: 2,
      val: file.size / 1024,
      type: "image/png",
      capture: false,
      callback: (value) => values.push(value),
    };
    input.resizeImg(opt);
    choose(w, input[0], file);
    await wait(() => values.length === 1, "首次未完成");
    choose(w, input[0], file);
    await wait(() => values.length === 2, "第二次未完成");
    assert(
      (await dimensions(w, values[0])).join() === "100,80" &&
        (await dimensions(w, values[1])).join() === "100,80",
      "重复配置改变尺寸",
    );
    assert(opt.val === file.size / 1024, "修改了调用方配置");
    input.resizeImg(() => ({
      val: 50,
      callback: (value) => values.push(value),
    }));
    choose(w, input[0], file);
    await wait(() => values.length === 3, "函数配置未合并默认值");
    assert(
      (await dimensions(w, values[2])).join() === "50,40",
      "函数配置尺寸错误",
    );
    noErrors(w);
  });
  await test("resize：坏图报错、像素上限、快速选择只返回最新结果、destroy 清理 URL", async () => {
    const { w, $, host } = await fixture("jquery.resizeImg"),
      input = $('<input type="file" accept="image/png">').appendTo(host),
      a = await picture(w, 100, 80),
      b = await picture(w, 50, 40);
    let failed = 0,
      values = [],
      created = 0,
      released = 0;
    const create = w.URL.createObjectURL.bind(w.URL),
      revoke = w.URL.revokeObjectURL.bind(w.URL);
    w.URL.createObjectURL = (blob) => {
      created++;
      return create(blob);
    };
    w.URL.revokeObjectURL = (url) => {
      released++;
      return revoke(url);
    };
    input.resizeImg({
      capture: false,
      error: () => failed++,
      callback: (value) => values.push(value),
      mode: 1,
      val: 1,
    });
    choose(
      w,
      input[0],
      new w.File(["x"], "broken.jpg", { type: "image/jpeg" }),
    );
    await wait(() => failed === 1, "坏图无错误回调");
    choose(w, input[0], a);
    choose(w, input[0], b);
    await wait(() => values.length === 1, "快速选图未完成");
    assert(
      (await dimensions(w, values[0])).join() === "50,40",
      "旧任务覆盖新任务",
    );
    input.resizeImg({
      capture: false,
      mode: 0,
      val: 100000,
      error: () => failed++,
    });
    choose(w, input[0], a);
    await wait(() => failed === 2, "超大目标未拒绝");
    choose(w, input[0], a);
    input.resizeImg("destroy");
    await sleep(30);
    assert(
      values.length === 1 &&
        created === released &&
        input.attr("accept") === "image/png",
      "销毁或 URL 清理错误",
    );
    noErrors(w);
  });
  function fakeXHR(w) {
    const sent = [];
    class XHR {
      constructor() {
        this.upload = new w.EventTarget();
        this.status = 0;
        this.responseText = "";
        this.finished = false;
      }
      open(method, url) {
        this.url = url;
      }
      send(body) {
        this.body = body;
        sent.push(this);
        if (this.url === "pending") return;
        this.timer = w.setTimeout(() => {
          if (this.finished) return;
          this.finished = true;
          if (this.url === "network") return this.onerror();
          if (this.url === "timeout") return this.ontimeout();
          this.status = this.url === "http" ? 500 : 200;
          this.responseText =
            this.url === "empty" ? "" : JSON.stringify({ error: 0, src: "x" });
          this.onload();
        }, 20);
      }
      abort() {
        if (this.finished) return;
        this.finished = true;
        w.clearTimeout(this.timer);
        if (this.onabort) this.onabort();
      }
    }
    w.XMLHttpRequest = XHR;
    return sent;
  }
  await test("upload：双实例队列与 URL 隔离、FormData、文件名安全、完成一次", async () => {
    const { w, $, host } = await fixture("jquery.powerUpload"),
      sent = fakeXHR(w),
      file = new w.File(["abc"], "<img src=x>.png", { type: "image/png" });
    let a = 0,
      b = 0;
    const first = $("<button>")
        .appendTo(host)
        .powerUpload({ mode: () => [file], url: "first", allDone: () => a++ }),
      second = $("<button>")
        .appendTo(host)
        .powerUpload({ mode: () => [file], url: "second", allDone: () => b++ });
    first.trigger("click");
    second.trigger("click");
    await wait(() => a === 1 && b === 1, "双实例批次没有结束");
    assert(
      sent.length === 2 &&
        sent[0].url === "first" &&
        sent[1].url === "second" &&
        sent.every((x) => x.body instanceof w.FormData),
      "队列/请求体混淆",
    );
    assert(!$(".modal-body img").length, "文件名被当作 HTML");
    first.powerUpload("destroy");
    second.powerUpload("destroy");
    noErrors(w);
  });
  await test("upload：网络、超时、空响应、HTTP 错误均回调失败并收尾", async () => {
    const { w, $, host } = await fixture("jquery.powerUpload");
    fakeXHR(w);
    const file = new w.File(["x"], "x.png", { type: "image/png" });
    for (const url of ["network", "timeout", "empty", "http"]) {
      let done = 0,
        info;
      const button = $("<button>")
        .appendTo(host)
        .powerUpload({
          mode: () => [file],
          url,
          uploadFinished: (i, f, result) => (info = result),
          allDone: () => done++,
        });
      button.trigger("click");
      await wait(() => done === 1, "未结束：" + url);
      assert(info.error, "错误被当作成功：" + url);
      button.powerUpload("destroy");
    }
    noErrors(w);
  });
  await test("upload：全拒绝、取消、销毁后无迟到回调及重复初始化", async () => {
    const { w, $, host } = await fixture("jquery.powerUpload"),
      sent = fakeXHR(w),
      file = new w.File(["x"], "x.png", { type: "image/png" }),
      button = $("<button>").appendTo(host);
    let done = 0,
      finished = 0;
    button
      .powerUpload({
        url: "pending",
        mode: () => [file],
        beforeEach: () => false,
        allDone: () => done++,
      })
      .trigger("click");
    assert(done === 1 && !sent.length, "全拒绝没有收尾");
    const opt = {
      url: "pending",
      mode: () => [file],
      beforeEach: () => true,
      allDone: () => done++,
      uploadFinished: () => finished++,
    };
    for (let i = 0; i < 3; i++) button.powerUpload(opt);
    button.trigger("click");
    assert(sent.length === 1, "重复绑定上传事件");
    button.powerUpload("cancel");
    assert(done === 2 && finished === 1, "取消没有完成一次");
    button.trigger("click");
    button.powerUpload("destroy");
    await sleep(30);
    assert(done === 2 && finished === 1, "销毁后回调");
    noErrors(w);
  });
  await test("upload：真实 FormData 图片上传、结果元数据和模态框销毁清理", async () => {
    const { w, $, host } = await fixture("jquery.powerUpload"),
      file = await picture(w, 24, 16);
    let done = 0,
      result;
    const button = $("<button>")
      .appendTo(host)
      .powerUpload({
        url: "/test-upload",
        mode: () => [file],
        uploadFinished: (i, f, info) => (result = info),
        allDone: () => done++,
      });
    button.trigger("click");
    await wait(() => done === 1, "真实上传未结束");
    assert(
      result.error === 0 && result.width === 24 && result.height === 16,
      "真实上传结果错误",
    );
    button.powerUpload("destroy");
    await sleep(800);
    assert(
      !$(".modal,.modal-backdrop").length &&
        !w.document.body.classList.contains("modal-open"),
      "模态框或遮罩没有清理",
    );
    noErrors(w);
  });
  await test("resize：EXIF 6 旋转照片输出方向与尺寸正确", async () => {
    const { w, $, host } = await fixture("jquery.resizeImg");
    const blob = await (
        await fetch("/case/default/tests/fixtures/orientation-6.jpg")
      ).blob(),
      file = new w.File([blob], "orientation.jpg", { type: "image/jpeg" }),
      input = $('<input type="file">').appendTo(host);
    let result;
    input.resizeImg({
      mode: 1,
      val: 1,
      capture: false,
      type: "image/png",
      callback: (value) => (result = value),
    });
    choose(w, input[0], file);
    await wait(() => result, "方向图片没有输出");
    assert(
      (await dimensions(w, result)).join() === "60,120",
      "方向信息未正确应用",
    );
    noErrors(w);
  });
  function tracks() {
    const track = {
      readyState: "live",
      stop() {
        this.readyState = "ended";
        this.stopped = true;
      },
    };
    return {
      track,
      getTracks: () => [track],
      getVideoTracks: () => [track],
      getAudioTracks: () => [track],
    };
  }
  function mockAudio(w) {
    const node = () => ({ connect() {}, disconnect() {} });
    w.AudioContext = class {
      constructor() {
        this.destination = node();
      }
      createBufferSource() {
        return node();
      }
      createMediaStreamSource() {
        return node();
      }
      createAnalyser() {
        return Object.assign(node(), {
          frequencyBinCount: 512,
          getByteFrequencyData() {},
        });
      }
      createWaveShaper() {
        return node();
      }
      createBiquadFilter() {
        return node();
      }
      createConvolver() {
        return node();
      }
      createGain() {
        return node();
      }
      resume() {
        return Promise.resolve();
      }
      close() {
        return Promise.resolve();
      }
    };
  }
  await test("media：camera 双实例配置隔离，关闭后迟到流被停止", async () => {
    const { w, $, host } = await fixture("jquery.mediaDevice"),
      calls = [];
    Object.defineProperty(w.navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: (constraints) =>
          new Promise((resolve) => calls.push({ constraints, resolve })),
      },
    });
    const a = $("<video>").appendTo(host),
      b = $("<video>").appendTo(host);
    a.camera({ video: { width: { ideal: 320 } }, audio: false });
    b.camera({ video: { width: { ideal: 640 } }, audio: false });
    assert(
      calls[0].constraints.video.width.ideal === 320 &&
        calls[1].constraints.video.width.ideal === 640,
      "配置互相覆盖",
    );
    a.camera("destroy");
    b.camera("destroy");
    const first = tracks(),
      second = tracks();
    calls[0].resolve(first);
    calls[1].resolve(second);
    await sleep(20);
    assert(first.track.stopped && second.track.stopped, "迟到流未停止");
    noErrors(w);
  });
  await test("media：audio 连续切换释放旧流，stop/destroy 取消过期请求", async () => {
    const { w, $, host } = await fixture("jquery.mediaDevice");
    mockAudio(w);
    const calls = [];
    Object.defineProperty(w.navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: () => new Promise((resolve) => calls.push(resolve)),
      },
    });
    const canvas = $("<canvas>").appendTo(host);
    canvas.audio({});
    canvas.audio({});
    const first = tracks(),
      second = tracks();
    calls[0](first);
    calls[1](second);
    await sleep(20);
    assert(first.track.stopped && !second.track.stopped, "切换没有淘汰旧请求");
    canvas.audio("stop");
    assert(second.track.stopped, "stop 未释放流");
    canvas.audio({});
    canvas.audio("destroy");
    const late = tracks();
    calls[2](late);
    await sleep(20);
    assert(late.track.stopped && !canvas.data("para"), "销毁后请求仍生效");
    noErrors(w);
  });
  await test("media：等待录音权限时取消，以及录音器初始化失败后释放流", async () => {
    const { w, $, host } = await fixture("jquery.mediaDevice");
    mockAudio(w);
    let resolve;
    Object.defineProperty(w.navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: () => new Promise((r) => (resolve = r)) },
    });
    w.MediaRecorder = class {
      static isTypeSupported() {
        return true;
      }
      constructor() {
        throw new Error("test constructor");
      }
    };
    const canvas = $("<canvas>").appendTo(host);
    assert(
      canvas.audio("record") === true && canvas.audio("record") === false,
      "等待权限时未取消",
    );
    const stale = tracks();
    resolve(stale);
    await sleep(20);
    assert(stale.track.stopped, "取消后迟到录音流未释放");
    canvas.audio("record");
    const failed = tracks();
    resolve(failed);
    await sleep(20);
    assert(
      failed.track.stopped && !canvas.data("recordingPending"),
      "录音构造失败后资源残留",
    );
    canvas.audio("destroy");
    noErrors(w);
  });
  await test("QR：与媒体全屏接口共存，关闭等待中的摄像头后释放迟到流", async () => {
    const { w, $, host } = await fixture("jquery.mediaDevice"),
      native = $.fn.fullscreen;
    await new Promise((resolve) => {
      const script = w.document.createElement("script");
      script.src = "/case/default/qrcode/jquery.qrcode.js";
      script.onload = resolve;
      w.document.head.append(script);
    });
    assert($.fn.fullscreen === native, "覆盖了媒体全屏方法");
    let resolve;
    Object.defineProperty(w.navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: () => new Promise((r) => (resolve = r)) },
    });
    w.jsQR = () => null;
    const button = $("<button>")
      .appendTo(host)
      .qrCode(() => {});
    button.trigger("click");
    button.qrCode("stop");
    const stream = tracks();
    resolve(stream);
    await sleep(20);
    assert(
      stream.track.stopped && !button.prop("disabled"),
      "扫码关闭后流未释放",
    );
    button.qrCode("destroy");
    noErrors(w);
  });
  await test("QR：画面就绪等待在 stop 时取消定时器和监听", async () => {
    const { w, $, host } = await fixture("qrcode");
    w.jsQR = () => null;
    const source = w.document.createElement("canvas");
    source.width = source.height = 10;
    const stream = source.captureStream(0);
    Object.defineProperty(w.navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: async () => stream },
    });
    w.HTMLMediaElement.prototype.play = () => Promise.resolve();
    let timer,
      cleared = false;
    const set = w.setTimeout.bind(w),
      clear = w.clearTimeout.bind(w);
    w.setTimeout = (fn, ms) => {
      const id = set(fn, ms);
      if (ms === 10000) timer = id;
      return id;
    };
    w.clearTimeout = (id) => {
      if (id === timer) cleared = true;
      clear(id);
    };
    const button = $("<button>")
      .appendTo(host)
      .qrCode(() => {});
    button.trigger("click");
    await wait(() => timer, "未进入等待状态");
    button.qrCode("stop");
    await sleep(20);
    assert(
      cleared &&
        stream.getTracks().every((track) => track.readyState === "ended") &&
        !button.prop("disabled"),
      "等待任务未取消",
    );
    button.qrCode("destroy");
    noErrors(w);
  });
  await test('parallax：普通/全屏翻转往返、只播一次与销毁',async()=>{
    const {w,$,host}=await fixture('jquery.parallax');const css=w.document.createElement('link');css.rel='stylesheet';css.href='/case/default/jquery.parallax/jquery.parallax.css';w.document.head.append(css);
    const root=$('<div style="position:relative">').appendTo(host);
    for(let i=0;i<4;i++)$('<section style="height:600px;position:relative" data-effect="flip-y"><h2 style="height:100px;position:relative">内容</h2></section>').appendTo(root);
    const sections=root.children().toArray();root.parallax({repeat:true});
    for(const index of [0,2,1,3,0]){w.scrollTo(0,sections[index].getBoundingClientRect().top+w.scrollY);await sleep(650);assert(sections[index].firstElementChild.dataset.shown==='y'&&Number(w.getComputedStyle(sections[index].firstElementChild).opacity)>.99,'普通模式内容隐藏');}
    w.scrollTo(0,0);root.parallax({mode:1,repeat:true});for(const index of [3,0,2,1,0]){root[0].scrollTop=sections[index].offsetTop;await sleep(650);assert(sections[index].firstElementChild.dataset.shown==='y'&&Number(w.getComputedStyle(sections[index].firstElementChild).opacity)>.99,'全屏模式内容隐藏');}
    root.parallax({mode:1,repeat:false});await sleep(650);root[0].scrollTop=sections[3].offsetTop;await sleep(50);assert(sections[0].firstElementChild.dataset.shown==='y','关闭重播仍然重置');root.parallax('destroy');assert(!root[0].style.scrollSnapType&&!root.data('parallax'),'销毁未还原');noErrors(w);
  });
  await test("video：重复初始化、destroy 恢复属性并保留调用方同名事件", async () => {
    const { w, $, host } = await fixture("video"),
      video = $('<video muted loop poster="old.jpg" preload="none">').appendTo(
        host,
      );
    video[0].muted = true;
    const original = Object.fromEntries(
      video[0].getAttributeNames().map((key) => [key, video.attr(key)]),
    );
    let plays = 0;
    video.on("play.video", () => plays++);
    for (let i = 0; i < 3; i++)
      video.video({ muted: false, loop: false, poster: "new.jpg" });
    assert($(".vp").length === 1, "重复播放器");
    video.video("destroy");
    video[0].dispatchEvent(new w.Event("play"));
    assert(
      plays === 1 &&
        video[0]
          .getAttributeNames()
          .filter(
            (key) =>
              !(["style", "class"].includes(key) && video.attr(key) === ""),
          ).length === Object.keys(original).length &&
        Object.entries(original).every(
          ([key, value]) => video.attr(key) === value,
        ) &&
        video[0].muted,
      "宿主监听或原属性被破坏 " +
        JSON.stringify({
          plays,
          original,
          current: video[0].outerHTML,
          muted: video[0].muted,
        }),
    );
    noErrors(w);
  });
  document.querySelector("#result").textContent =
    results.filter((x) => x.pass).length + "/" + results.length + " PASS";
})();
