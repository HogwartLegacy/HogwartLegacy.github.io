/* ==========================================================================
   Everything personal on the site lives in this file. Edit, save, refresh.

   - Text is plain unless noted: `bio`, résumé `points`, project `text`,
     section `note` and note-card `text` may carry a little HTML (<strong>, <a>).
   - An empty string or an empty list hides its element, so nothing
     half-filled ever shows: leave `linkedin: ""` and there is no LinkedIn pill.
   - The <title>, description and og: tags at the top of index.html are read
     by link previews before any script runs; keep them in step with `name`.
   ========================================================================== */
window.SITE = {
  name: "Maris",
  role: "Software Engineer",
  focus: "On-device AI · Signal processing · Native apps",

  // The few terms a skimmer should catch go in <strong>.
  bio: "I build software that runs close to the hardware and close to the person using it. " +
    "My <strong>rPPG engine</strong> reads heart rate, breathing and HRV from an ordinary webcam " +
    "<strong>in real time on one CPU core</strong>, written in <strong>C++17</strong> and scored against medical oximeters. " +
    "<strong>ODS for Windows</strong> runs <strong>local LLMs</strong> natively on whatever GPU a machine has, no Docker required. " +
    "I also write <strong>audio DSP</strong> in JUCE and design <strong>lean, accessible frontends</strong>. " +
    "I like problems with a number at the end: error in bpm, milliseconds per frame, kilobytes shipped.",

  email: "",                      // shows a Contact pill and a footer link
  links: {
    github: "https://github.com/HogwartLegacy",
    linkedin: "",
    scholar: "",
    x: "",
    book: "",                     // a Cal.com or Calendly link shows "Book a call"
    resumePdf: ""                 // e.g. "assets/resume.pdf" shows "Download PDF" in the résumé
  },

  resume: {
    // Placeholders: replace with your own roles. The first one opens by default.
    experience: [
      { org: "Company name", when: "2024 to now", role: "Your title · City",
        points: ["What you owned, in one line, with the number that moved.",
                 "A second result: scale, speed, money or people."] },
      { org: "Previous company", when: "2021 to 2024", role: "Your title · City",
        points: ["Two or three lines per role is plenty."] }
    ],
    education: [
      { degree: "Degree, Field", when: "Year", school: "University · focus or minor" }
    ],
    // icon: chip, wave, code or layers
    skills: [
      { icon: "chip", name: "On-device AI", items: ["ONNX Runtime", "MediaPipe", "llama.cpp", "CUDA and Vulkan runtimes"] },
      { icon: "wave", name: "Signal processing", items: ["rPPG", "Butterworth filters", "FFT", "HMM tracking", "HRV", "BS.1770 loudness"] },
      { icon: "code", name: "Languages", items: ["C++17", "C# / .NET", "TypeScript", "Python"] },
      { icon: "layers", name: "Apps and tooling", items: ["JUCE", "WPF", "Next.js", "Tailwind CSS", "CMake", "Velopack", "GitHub Actions"] }
    ]
  },

  /* One chip per tag; "all" shows everything. Chips nobody uses are left out.
     Each key has an icon in index.html (symbols named t-<key>). */
  filters: [["all", "All"], ["ai", "AI"], ["vision", "Vision"], ["health", "Health"], ["audio", "Audio"],
    ["robotics", "Robotics"], ["media", "Streaming"], ["desktop", "Desktop"], ["web", "Web"], ["systems", "Systems"]],

  /* Shelves of work, in page order. layout: "cards" (big covers) or "compact" (rows). */
  sections: [
    { id: "projects", title: "Projects", note: "Things I've built and shipped. The source for each is on GitHub.", layout: "cards", unit: "projects" },
    { id: "exploring", title: "Exploring", note: "What I'm reading, running and taking apart lately. No write-ups yet.", layout: "compact", unit: "topics" }
  ],

  /* A project joins a shelf through `section`. `art` picks a drawn cover
     (pulse, runtime, dashboard, mastering, robot, stream, agent); set
     `cover: "assets/img/x.webp"` to use a screenshot instead, and
     `video: "assets/media/x.mp4"` for a loop that plays on hover. */
  projects: [
    { section: "projects", name: "rPPG Engine", art: "pulse", t: .9,
      meta: "C++17 · ONNX Runtime · MediaPipe · Android & iOS",
      text: "Heart rate, breathing and HRV from facial video, in real time on one CPU core. A face mesh, 28 skin regions and two streaming neural nets, fused and tracked: 0.62 bpm error on UBFC-rPPG.",
      tags: ["ai", "vision", "health", "systems"],
      repo: "https://github.com/HogwartLegacy/rPPG-Engine" },
    { section: "projects", name: "ODS for Windows", art: "runtime", t: 1.4,
      meta: "C# · .NET 10 · WPF · llama.cpp",
      text: "Local LLMs on Windows without Docker or WSL. A desktop app and CLI that probe the GPU, try CUDA, Vulkan then CPU builds, prove the server ready and stream the chat.",
      tags: ["ai", "desktop"],
      repo: "https://github.com/HogwartLegacy/ODS-Desktop" },
    { section: "projects", name: "Elements Web", art: "dashboard", t: 0,
      meta: "Next.js 16 · TypeScript · Tailwind v4 · Radix",
      text: "An ERP frontend rebuilt on a real design system: 7 runtime dependencies where the old app shipped 6.3 MB, a command palette, dark mode, and every audit finding fixed.",
      tags: ["web"],
      repo: "https://github.com/HogwartLegacy/ElementsWeb", url: "https://elements-web.vercel.app" },
    { section: "projects", name: "STEMY Mastering Chain", art: "mastering", t: 2,
      meta: "C++ · JUCE · DSP",
      text: "A standalone mastering app for hip-hop: eight stages from EQ to limiter, live A/B against a reference track, and 24-bit renders measured to BS.1770.",
      tags: ["audio", "desktop", "systems"],
      repo: "https://github.com/HogwartLegacy/Stemy_Mastering" },

    { section: "exploring", name: "Robot learning", art: "robot", t: .6,
      text: "Reinforcement learning for legged robots: humanoid walking in MuJoCo, quadruped policies in Isaac Sim with ROS 2.",
      tags: ["robotics", "ai"] },
    { section: "exploring", name: "Real-time media", art: "stream", t: .3,
      text: "Low-latency video end to end: WebRTC, SRT and HLS servers, browser players, and ML in the video path.",
      tags: ["media", "vision"] },
    { section: "exploring", name: "Coding agents", art: "agent", t: 3.2,
      text: "Terminal agents that plan, edit, run and test code, studied from the source: goose and Codex.",
      tags: ["ai"] }
  ],

  /* Cards with a line drawing each. art: waves, device or stack;
     icon: gauge, lock or gem. */
  notes: {
    id: "how", title: "How I work", intro: "Three habits that show up in every repo.",
    cards: [
      { art: "waves", icon: "gauge", kicker: "Benchmarks", title: "Measure against the reference",
        text: "The rPPG engine is scored against contact PPG from medical oximeters: 0.62 bpm mean error on UBFC-rPPG, live, at 19 ms a frame.",
        links: [{ label: "Report", text: "Benchmark results", url: "https://github.com/HogwartLegacy/rPPG-Engine/blob/main/docs/BENCHMARK.md" }] },
      { art: "device", icon: "lock", kicker: "Privacy", title: "Keep it on the device",
        text: "Inference runs where the data is: the rPPG engine never sends a frame off the device, and ODS serves LLMs from your own GPU.",
        links: [{ text: "rPPG Engine", url: "https://github.com/HogwartLegacy/rPPG-Engine" },
                { text: "ODS for Windows", url: "https://github.com/HogwartLegacy/ODS-Desktop" }] },
      { art: "stack", icon: "gem", kicker: "Craft", title: "Fewer, sharper parts",
        text: "Elements Web ships 7 runtime dependencies where the old app shipped 6.3 MB, with six type sizes, three radii and a focus ring everywhere.",
        links: [{ label: "Live", text: "elements-web.vercel.app", url: "https://elements-web.vercel.app" }] }
    ]
  }
};
