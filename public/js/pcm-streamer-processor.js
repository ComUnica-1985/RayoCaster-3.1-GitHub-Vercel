class PcmStreamerProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.targetSamples = options.processorOptions?.targetSamples || 960;
    this.buffer = new Float32Array(this.targetSamples);
    this.offset = 0;
    this.enabled = true;

    this.port.onmessage = (event) => {
      if (event.data?.type === "stop") {
        this.flush();
        this.enabled = false;
      }
    };
  }

  flush() {
    if (this.offset === 0) return;
    const payload = new Float32Array(this.offset);
    payload.set(this.buffer.subarray(0, this.offset));
    this.port.postMessage({ type: "chunk", samples: payload }, [payload.buffer]);
    this.offset = 0;
  }

  process(inputs, outputs) {
    const input = inputs[0] || [];
    const output = outputs[0] || [];

    if (output.length > 0) {
      for (let channelIndex = 0; channelIndex < output.length; channelIndex += 1) {
        const outputChannel = output[channelIndex];
        const inputChannel = input[channelIndex] || input[0];
        if (outputChannel && inputChannel) outputChannel.set(inputChannel);
      }
    }

    if (!this.enabled || input.length === 0 || !input[0] || input[0].length === 0) return true;

    const frameCount = input[0].length;
    for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
      let mixedSample = 0;
      for (let channelIndex = 0; channelIndex < input.length; channelIndex += 1) {
        mixedSample += input[channelIndex][frameIndex] || 0;
      }

      mixedSample /= input.length || 1;
      this.buffer[this.offset] = mixedSample;
      this.offset += 1;

      if (this.offset >= this.targetSamples) {
        this.flush();
      }
    }

    return true;
  }
}

registerProcessor("pcm-streamer-processor", PcmStreamerProcessor);
