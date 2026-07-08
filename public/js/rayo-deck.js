window.RayoDeck = {
  audio: null,
  activeCategory: "musica",
  categories: {
    musica: [],
    voces: [],
    cunas: [],
  },
  currentTrackId: null,
  pendingDeleteTrackId: null,
  dragState: {
    trackId: null,
    sourceCategory: null,
  },
  refs: {},

  init: () => {
    const refs = {
      fileInput: document.getElementById("DeckFile"),
      playButton: document.getElementById("DeckPlay"),
      progress: document.getElementById("DeckProgress"),
      name: document.getElementById("DeckName"),
      time: document.getElementById("DeckTime"),
      playlist: document.getElementById("PlaylistContainer"),
      tabs: Array.from(document.querySelectorAll(".DeckTab")),
      dropZone: document.querySelector(".DropZone"),
      deleteModal: document.getElementById("DeckDeleteModal"),
      deleteTrackName: document.getElementById("DeckDeleteTrackName"),
      closeDeleteModal: document.getElementById("BtnCloseDeckDeleteModal"),
      cancelDelete: document.getElementById("BtnCancelDeckDelete"),
      confirmDelete: document.getElementById("BtnConfirmDeckDelete"),
    };

    if (!refs.fileInput || !refs.playButton || !refs.progress || !refs.playlist || refs.tabs.length === 0) {
      return;
    }

    if (window.RayoDeck.audio) {
      return;
    }

    window.RayoDeck.refs = refs;
    window.RayoDeck.audio = new Audio();
    window.RayoDeck.audio.crossOrigin = "anonymous";
    window.RayoDeck.audio.preload = "auto";

    if (window.RayoEngine) {
      window.RayoEngine.connectDeck(window.RayoDeck.audio);
    }

    refs.fileInput.addEventListener("change", (event) => {
      const files = Array.from(event.target.files || []);
      if (files.length > 0) {
        window.RayoDeck.addFiles(files);
      }
      event.target.value = "";
    });

    refs.playButton.addEventListener("click", () => {
      if (!window.RayoDeck.audio.src) {
        void window.RayoDeck.playFirstAvailable();
        return;
      }

      if (window.RayoDeck.audio.paused) {
        void window.RayoDeck.audio.play();
      } else {
        window.RayoDeck.audio.pause();
      }
    });

    refs.progress.addEventListener("input", (event) => {
      const value = Number(event.target.value);
      const duration = window.RayoDeck.audio.duration;
      if (duration) {
        window.RayoDeck.audio.currentTime = (value / 100) * duration;
      }
    });

    refs.tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const category = window.RayoDeck.getTabCategory(tab);
        if (!category) return;
        window.RayoDeck.setActiveCategory(category);
      });
    });

    refs.closeDeleteModal?.addEventListener("click", () => {
      window.RayoDeck.closeDeleteModal();
    });

    refs.cancelDelete?.addEventListener("click", () => {
      window.RayoDeck.closeDeleteModal();
    });

    refs.confirmDelete?.addEventListener("click", () => {
      void window.RayoDeck.confirmDeleteTrack();
    });

    refs.deleteModal?.addEventListener("click", (event) => {
      if (event.target === refs.deleteModal) {
        window.RayoDeck.closeDeleteModal();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && refs.deleteModal && !refs.deleteModal.hidden) {
        window.RayoDeck.closeDeleteModal();
      }
    });

    if (refs.dropZone) {
      ["dragenter", "dragover"].forEach((type) => {
        refs.dropZone.addEventListener(type, (event) => {
          event.preventDefault();
          refs.dropZone.classList.add("is-over");
        });
      });

      ["dragleave", "dragend", "drop"].forEach((type) => {
        refs.dropZone.addEventListener(type, (event) => {
          event.preventDefault();
          refs.dropZone.classList.remove("is-over");
        });
      });

      refs.dropZone.addEventListener("drop", (event) => {
        const files = Array.from(event.dataTransfer?.files || []);
        if (files.length > 0) {
          window.RayoDeck.addFiles(files);
        }
      });
    }

    window.RayoDeck.audio.addEventListener("timeupdate", () => {
      const currentTime = window.RayoDeck.audio.currentTime;
      const duration = window.RayoDeck.audio.duration || 1;
      refs.progress.value = String((currentTime / duration) * 100);
      refs.time.textContent = window.RayoDeck.formatTime(currentTime);
    });

    window.RayoDeck.audio.addEventListener("loadedmetadata", () => {
      refs.time.textContent = window.RayoDeck.formatTime(0);
      refs.progress.value = "0";
      window.RayoDeck.renderPlaylist();
    });

    window.RayoDeck.audio.addEventListener("play", () => {
      refs.playButton.innerHTML = "<span>PAUSE</span>";
      window.RayoDeck.renderPlaylist();
    });

    window.RayoDeck.audio.addEventListener("pause", () => {
      refs.playButton.innerHTML = "<span>PLAY</span>";
      window.RayoDeck.renderPlaylist();
    });

    window.RayoDeck.audio.addEventListener("ended", () => {
      refs.playButton.innerHTML = "<span>PLAY</span>";
      void window.RayoDeck.playNextTrack();
    });

    window.RayoDeck.renderTabs();
    window.RayoDeck.renderPlaylist();
    window.RayoDeck.updateTransport();
  },

  getTabCategory: (tab) => {
    if (tab.dataset.category) return tab.dataset.category;
    const label = String(tab.textContent || "").trim().toLowerCase();
    if (label.includes("mus")) return "musica";
    if (label.includes("voz")) return "voces";
    if (label.includes("cun")) return "cunas";
    return null;
  },

  setActiveCategory: (category) => {
    if (!window.RayoDeck.categories[category]) return;
    window.RayoDeck.activeCategory = category;
    window.RayoDeck.renderTabs();
    window.RayoDeck.renderPlaylist();
  },

  renderTabs: () => {
    window.RayoDeck.refs.tabs.forEach((tab) => {
      const category = window.RayoDeck.getTabCategory(tab);
      const active = category === window.RayoDeck.activeCategory;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
  },

  addFiles: (files) => {
    const validFiles = files.filter(
      (file) => file.type.startsWith("audio/") || /\.mp3|\.wav|\.ogg|\.m4a|\.aac|\.flac$/i.test(file.name),
    );
    if (validFiles.length === 0) return;

    const targetCategory = window.RayoDeck.activeCategory;
    const tracks = validFiles.map((file) => ({
      id: `${targetCategory}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      url: URL.createObjectURL(file),
      file,
      category: targetCategory,
    }));

    window.RayoDeck.categories[targetCategory].push(...tracks);
    window.RayoDeck.renderPlaylist();

    if (!window.RayoDeck.currentTrackId) {
      void window.RayoDeck.loadTrack(tracks[0].id, { autoplay: false });
    }
  },

  renderPlaylist: () => {
    const { playlist } = window.RayoDeck.refs;
    if (!playlist) return;

    const tracks = window.RayoDeck.categories[window.RayoDeck.activeCategory];
    if (tracks.length === 0) {
      playlist.innerHTML = `
        <div class="PlaylistPlaceholder PlaylistEmptyState">
          <strong>Sin pistas cargadas</strong>
          <p>Arrastra archivos de audio o usa el boton de carga para poblar esta pestana.</p>
        </div>
      `;
      return;
    }

    playlist.innerHTML = "";

    tracks.forEach((track, index) => {
      const item = document.createElement("div");
      item.className = "PlaylistPlaceholder PlaylistItem";
      item.draggable = true;
      item.dataset.trackId = track.id;
      item.dataset.category = track.category;

      const trackButton = document.createElement("button");
      trackButton.type = "button";
      trackButton.className = "PlaylistTrackButton";
      trackButton.draggable = false;
      trackButton.innerHTML = `
        <span class="PlaylistItemIndex">${String(index + 1).padStart(2, "0")}</span>
        <span class="PlaylistItemBody">
          <strong class="PlaylistItemTitle">${window.RayoDeck.escapeHtml(track.name)}</strong>
          <span class="PlaylistItemMeta">${window.RayoDeck.escapeHtml(window.RayoDeck.describeTrack(track))}</span>
        </span>
        <span class="PlaylistItemStatus">${window.RayoDeck.escapeHtml(window.RayoDeck.getTrackStatus(track.id))}</span>
      `;

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "PlaylistRemoveBtn";
      removeButton.draggable = false;
      removeButton.setAttribute("aria-label", `Eliminar ${track.name}`);
      removeButton.title = "Eliminar pista";
      removeButton.textContent = "X";

      if (track.id === window.RayoDeck.currentTrackId) {
        item.classList.add("is-active", "is-current");
      }

      trackButton.addEventListener("click", () => {
        void window.RayoDeck.loadTrack(track.id, { autoplay: false });
      });

      trackButton.addEventListener("dblclick", () => {
        void window.RayoDeck.loadTrack(track.id, { autoplay: true });
      });

      removeButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        window.RayoDeck.openDeleteModal(track.id);
      });

      item.addEventListener("dragstart", (event) => {
        window.RayoDeck.dragState.trackId = track.id;
        window.RayoDeck.dragState.sourceCategory = window.RayoDeck.activeCategory;
        item.classList.add("is-dragging");
        event.dataTransfer.effectAllowed = "move";
      });

      item.addEventListener("dragend", () => {
        window.RayoDeck.dragState.trackId = null;
        window.RayoDeck.dragState.sourceCategory = null;
        item.classList.remove("is-dragging");
        playlist.querySelectorAll(".is-drop-target").forEach((node) => node.classList.remove("is-drop-target"));
      });

      item.addEventListener("dragover", (event) => {
        if (!window.RayoDeck.dragState.trackId) return;
        event.preventDefault();
        item.classList.add("is-drop-target");
      });

      item.addEventListener("dragleave", () => {
        item.classList.remove("is-drop-target");
      });

      item.addEventListener("drop", (event) => {
        event.preventDefault();
        item.classList.remove("is-drop-target");
        window.RayoDeck.reorderTrack(window.RayoDeck.dragState.trackId, item.dataset.trackId);
      });

      item.appendChild(trackButton);
      item.appendChild(removeButton);
      playlist.appendChild(item);
    });
  },

  reorderTrack: (draggedId, targetId) => {
    const category = window.RayoDeck.dragState.sourceCategory || window.RayoDeck.activeCategory;
    const tracks = window.RayoDeck.categories[category];
    const fromIndex = tracks.findIndex((track) => track.id === draggedId);
    const toIndex = tracks.findIndex((track) => track.id === targetId);

    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

    const [track] = tracks.splice(fromIndex, 1);
    tracks.splice(toIndex, 0, track);
    window.RayoDeck.renderPlaylist();
  },

  describeTrack: (track) => {
    const sizeMb = track.file ? `${(track.file.size / (1024 * 1024)).toFixed(1)} MB` : "Lista local";
    return `${String(track.category || window.RayoDeck.activeCategory).toUpperCase()} | ${sizeMb}`;
  },

  escapeHtml: (value) => String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;"),

  openDeleteModal: (trackId) => {
    const result = window.RayoDeck.findTrack(trackId);
    if (!result) return;

    window.RayoDeck.pendingDeleteTrackId = trackId;

    if (window.RayoDeck.refs.deleteTrackName) {
      window.RayoDeck.refs.deleteTrackName.textContent = result.track.name;
    }

    if (window.RayoDeck.refs.deleteModal) {
      window.RayoDeck.refs.deleteModal.hidden = false;
      window.RayoDeck.refs.deleteModal.setAttribute("aria-hidden", "false");
    }
  },

  closeDeleteModal: () => {
    window.RayoDeck.pendingDeleteTrackId = null;

    if (window.RayoDeck.refs.deleteModal) {
      window.RayoDeck.refs.deleteModal.hidden = true;
      window.RayoDeck.refs.deleteModal.setAttribute("aria-hidden", "true");
    }
  },

  confirmDeleteTrack: async () => {
    const trackId = window.RayoDeck.pendingDeleteTrackId;
    window.RayoDeck.closeDeleteModal();

    if (!trackId) return;
    await window.RayoDeck.removeTrack(trackId);
  },

  removeTrack: async (trackId) => {
    const result = window.RayoDeck.findTrack(trackId);
    if (!result) return;

    const { category, track } = result;
    const tracks = window.RayoDeck.categories[category];
    const index = tracks.findIndex((item) => item.id === trackId);
    if (index < 0) return;

    const isCurrentTrack = window.RayoDeck.currentTrackId === trackId;
    const replacement = tracks[index + 1] || tracks[index - 1] || null;

    if (isCurrentTrack && window.RayoDeck.audio) {
      window.RayoDeck.audio.pause();
      window.RayoDeck.audio.removeAttribute("src");
      window.RayoDeck.audio.load();
      window.RayoDeck.currentTrackId = null;
    }

    tracks.splice(index, 1);

    if (track.url) {
      URL.revokeObjectURL(track.url);
    }

    if (isCurrentTrack && replacement) {
      await window.RayoDeck.loadTrack(replacement.id, { autoplay: false });
      return;
    }

    window.RayoDeck.renderPlaylist();
    window.RayoDeck.updateTransport();
  },

  getTrackStatus: (trackId) => {
    if (trackId !== window.RayoDeck.currentTrackId) return "Listo";
    return window.RayoDeck.audio && !window.RayoDeck.audio.paused ? "En reproduccion" : "Cargado";
  },

  findTrack: (trackId) => {
    for (const category of Object.keys(window.RayoDeck.categories)) {
      const track = window.RayoDeck.categories[category].find((item) => item.id === trackId);
      if (track) return { category, track };
    }
    return null;
  },

  loadTrack: async (trackId, options = {}) => {
    const result = window.RayoDeck.findTrack(trackId);
    if (!result) return;

    const { category, track } = result;
    window.RayoDeck.currentTrackId = track.id;
    if (window.RayoDeck.activeCategory !== category) {
      window.RayoDeck.activeCategory = category;
      window.RayoDeck.renderTabs();
    }

    window.RayoDeck.audio.src = track.url;
    window.RayoDeck.audio.currentTime = 0;
    window.RayoDeck.updateTransport();
    window.RayoDeck.renderPlaylist();

    if (options.autoplay) {
      try {
        await window.RayoDeck.audio.play();
      } catch (error) {
        console.warn("No se pudo iniciar la pista automaticamente.", error);
      }
    }
  },

  playFirstAvailable: async () => {
    const categoryOrder = ["musica", "voces", "cunas"];
    for (const category of categoryOrder) {
      const track = window.RayoDeck.categories[category][0];
      if (track) {
        window.RayoDeck.setActiveCategory(category);
        await window.RayoDeck.loadTrack(track.id, { autoplay: true });
        return;
      }
    }
  },

  playNextTrack: async () => {
    const currentCategory = window.RayoDeck.findTrack(window.RayoDeck.currentTrackId)?.category || window.RayoDeck.activeCategory;
    const tracks = window.RayoDeck.categories[currentCategory];
    const currentIndex = tracks.findIndex((track) => track.id === window.RayoDeck.currentTrackId);

    if (currentIndex >= 0 && currentIndex < tracks.length - 1) {
      await window.RayoDeck.loadTrack(tracks[currentIndex + 1].id, { autoplay: true });
      return;
    }

    if (window.RayoDeck.audio) {
      window.RayoDeck.audio.currentTime = 0;
      window.RayoDeck.audio.pause();
    }

    window.RayoDeck.updateTransport();
    window.RayoDeck.renderPlaylist();
  },

  updateTransport: () => {
    const { name, time, progress, playButton } = window.RayoDeck.refs;
    const activeTrack = window.RayoDeck.findTrack(window.RayoDeck.currentTrackId)?.track || null;

    if (name) {
      name.textContent = activeTrack ? activeTrack.name : "Sin Audio...";
    }

    if (time) {
      time.textContent = window.RayoDeck.formatTime(window.RayoDeck.audio?.currentTime || 0);
    }

    if (progress) {
      progress.value = "0";
    }

    if (playButton) {
      playButton.disabled = !activeTrack;
      if (!activeTrack || window.RayoDeck.audio?.paused) {
        playButton.innerHTML = "<span>PLAY</span>";
      }
    }
  },

  formatTime: (seconds) => {
    const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
    const minutes = Math.floor(safeSeconds / 60);
    const remainder = Math.floor(safeSeconds % 60)
      .toString()
      .padStart(2, "0");
    return `${minutes}:${remainder}`;
  },
};