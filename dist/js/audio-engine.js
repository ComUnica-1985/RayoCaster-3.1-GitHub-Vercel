window.RayoEngine = {
  ctx: null,
  compressor: null,
  analyser: null,
  monitor: null,
  monitorDestination: null,
  monitorElement: null,
  micAnalyser: null,
  duckerNode: null,
  duckActive: false,
  exporterNode: null,
  exporterSink: null,
  exporterHandler: null,

  init: async () => {
    if (window.RayoEngine.ctx) {
      await window.RayoEngine.ctx.resume();
      return true;
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      window.RayoEngine.ctx = new AudioCtx({
        sampleRate: 48000,
        latencyHint: "interactive",
      });

      await window.RayoEngine.ctx.audioWorklet.addModule("/js/pcm-streamer-processor.js");
      await window.RayoEngine.ctx.resume();

      window.RayoEngine.compressor = window.RayoEngine.ctx.createDynamicsCompressor();
      window.RayoEngine.compressor.threshold.value = -18;
      window.RayoEngine.compressor.knee.value = 6;
      window.RayoEngine.compressor.ratio.value = 8;
      window.RayoEngine.compressor.attack.value = 0.003;
      window.RayoEngine.compressor.release.value = 0.08;

      window.RayoEngine.analyser = window.RayoEngine.ctx.createAnalyser();
      window.RayoEngine.analyser.fftSize = 256;

      window.RayoEngine.micAnalyser = window.RayoEngine.ctx.createAnalyser();
      window.RayoEngine.micAnalyser.fftSize = 256;

      window.RayoEngine.monitor = window.RayoEngine.ctx.createGain();
      window.RayoEngine.monitor.gain.value = 0;
      window.RayoEngine.monitorDestination = window.RayoEngine.ctx.createMediaStreamDestination();
      window.RayoEngine.monitorElement = new Audio();
      window.RayoEngine.monitorElement.autoplay = false;
      window.RayoEngine.monitorElement.playsInline = true;
      window.RayoEngine.monitorElement.srcObject = window.RayoEngine.monitorDestination.stream;

      window.RayoEngine.duckerNode = window.RayoEngine.ctx.createGain();
      window.RayoEngine.duckerNode.gain.value = 1;

      window.RayoEngine.compressor.connect(window.RayoEngine.analyser);
      window.RayoEngine.compressor.connect(window.RayoEngine.monitor);
      window.RayoEngine.monitor.connect(window.RayoEngine.monitorDestination);
      window.RayoEngine.duckerNode.connect(window.RayoEngine.compressor);

      window.RayoEngine.startDuckingLoop();
      return true;
    } catch (error) {
      console.error("No se pudo inicializar el motor de audio.", error);
      return false;
    }
  },

  bindExporter: (handler) => {
    if (!window.RayoEngine.ctx || !window.RayoEngine.compressor) return false;

    window.RayoEngine.unbindExporter();

    try {
      window.RayoEngine.exporterNode = new AudioWorkletNode(
        window.RayoEngine.ctx,
        "pcm-streamer-processor",
        {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          outputChannelCount: [1],
          channelCount: 1,
          channelCountMode: "explicit",
          processorOptions: {
            targetSamples: 480,
          },
        },
      );

      window.RayoEngine.exporterSink = window.RayoEngine.ctx.createGain();
      window.RayoEngine.exporterSink.gain.value = 0;
      window.RayoEngine.exporterHandler = handler;

      window.RayoEngine.exporterNode.port.onmessage = (event) => {
        if (event.data?.type === "chunk" && window.RayoEngine.exporterHandler) {
          window.RayoEngine.exporterHandler(event.data);
        }
      };

      window.RayoEngine.compressor.connect(window.RayoEngine.exporterNode);
      window.RayoEngine.exporterNode.connect(window.RayoEngine.exporterSink);
      window.RayoEngine.exporterSink.connect(window.RayoEngine.ctx.destination);
      return true;
    } catch (error) {
      console.error("No se pudo enlazar el exportador PCM.", error);
      window.RayoEngine.unbindExporter();
      return false;
    }
  },

  unbindExporter: () => {
    try {
      if (window.RayoEngine.compressor && window.RayoEngine.exporterNode) {
        window.RayoEngine.compressor.disconnect(window.RayoEngine.exporterNode);
      }
    } catch {}

    try {
      if (window.RayoEngine.exporterNode) {
        window.RayoEngine.exporterNode.port.postMessage({ type: "stop" });
      }
    } catch {}

    try {
      if (window.RayoEngine.exporterNode) {
        window.RayoEngine.exporterNode.disconnect();
      }
    } catch {}

    try {
      if (window.RayoEngine.exporterSink) {
        window.RayoEngine.exporterSink.disconnect();
      }
    } catch {}

    window.RayoEngine.exporterNode = null;
    window.RayoEngine.exporterSink = null;
    window.RayoEngine.exporterHandler = null;
  },

  getVol: () => {
    if (!window.RayoEngine.analyser) return 0;
    const data = new Uint8Array(window.RayoEngine.analyser.frequencyBinCount);
    window.RayoEngine.analyser.getByteFrequencyData(data);
    let total = 0;
    for (let index = 0; index < data.length; index += 1) total += data[index];
    return total / data.length;
  },

  getWaveform: () => {
    if (!window.RayoEngine.analyser) return null;
    const data = new Float32Array(window.RayoEngine.analyser.fftSize);
    window.RayoEngine.analyser.getFloatTimeDomainData(data);
    return data;
  },

  setMonitorOutput: async (deviceId = "") => {
    const element = window.RayoEngine.monitorElement;
    if (!element) return false;
    if (typeof element.setSinkId !== "function") {
      return deviceId === "";
    }

    try {
      await element.setSinkId(deviceId);
      return true;
    } catch (error) {
      console.error("No se pudo cambiar la salida del monitor.", error);
      return false;
    }
  },

  setMonitor: async (enabled) => {
    if (!window.RayoEngine.monitor || !window.RayoEngine.ctx || !window.RayoEngine.monitorElement) {
      return false;
    }

    if (enabled) {
      try {
        await window.RayoEngine.monitorElement.play();
      } catch (error) {
        console.error("No se pudo iniciar el monitor local.", error);
        return false;
      }
    }

    window.RayoEngine.monitor.gain.setTargetAtTime(
      enabled ? 1 : 0,
      window.RayoEngine.ctx.currentTime,
      0.08,
    );

    if (!enabled) {
      window.RayoEngine.monitorElement.pause();
    }

    return true;
  },

  connectDeck: (element) => {
    if (!window.RayoEngine.ctx || !window.RayoEngine.duckerNode || !element) return;
    const source = window.RayoEngine.ctx.createMediaElementSource(element);
    source.connect(window.RayoEngine.duckerNode);
  },

  startDuckingLoop: () => {
    window.setInterval(() => {
      if (!window.RayoEngine.micAnalyser || !window.RayoEngine.duckerNode || !window.RayoEngine.ctx) {
        return;
      }

      const data = new Uint8Array(window.RayoEngine.micAnalyser.frequencyBinCount);
      window.RayoEngine.micAnalyser.getByteFrequencyData(data);

      let total = 0;
      for (let index = 0; index < data.length; index += 1) total += data[index];

      const level = total / data.length;
      const now = window.RayoEngine.ctx.currentTime;

      if (level > 10) {
        if (!window.RayoEngine.duckActive) {
          window.RayoEngine.duckActive = true;
          window.RayoEngine.duckerNode.gain.cancelScheduledValues(now);
          window.RayoEngine.duckerNode.gain.setTargetAtTime(0.25, now, 0.15);
        }
        return;
      }

      if (window.RayoEngine.duckActive) {
        window.RayoEngine.duckActive = false;
        window.RayoEngine.duckerNode.gain.cancelScheduledValues(now);
        window.RayoEngine.duckerNode.gain.setTargetAtTime(1, now, 0.5);
      }
    }, 60);
  },
};
