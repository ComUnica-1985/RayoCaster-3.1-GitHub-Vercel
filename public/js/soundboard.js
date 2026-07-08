window.RayoBoard = {
  buffers: {},
  init: async (n, o) => {
    const e = o || window.RayoEngine.ctx;
    if (!e) return (console.error("No AudioCtx"), []);
    const t = n.map(async (n) => {
      try {
        const o = await fetch(n.src),
          t = await o.arrayBuffer(),
          r = await e.decodeAudioData(t);
        window.RayoBoard.buffers[n.id] = r;
      } catch (o) {
        console.error("Error cargando sonido " + n.id, o);
      }
    });
    await Promise.all(t);
  },
  play: (n) => {
    const o = window.RayoBoard.buffers[n],
      e = window.RayoEngine ? window.RayoEngine.ctx : null;
    if (o && e) {
      const n = e.createBufferSource();
      n.buffer = o;
      const t = window.RayoEngine.compressor || e.destination;
      (n.connect(t), n.start(0));
    }
  },
};
