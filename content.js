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
  name: "Maris Rascal",
  role: "Senior Software Engineer",
  focus: "Real-time media · Drivers & embedded · Systems in C++ and Rust",
  location: "Tremonton, Utah",

  // The few terms a skimmer should catch go in <strong>.
  bio: "I'm a senior software engineer with <strong>10+ years</strong> in <strong>C++, Rust, C and Python</strong>, building software where timing and safety matter: " +
    "<strong>video streaming and multi-DRM</strong>, <strong>device drivers</strong> on Windows and Linux, <strong>embedded and IoT</strong> systems, " +
    "<strong>robots</strong>, and <strong>native desktop apps</strong>. I've shipped features for <strong>ManyCam</strong> and <strong>Krisp</strong>, " +
    "Raspberry Pi camera drivers and a traffic controller, a cross-platform <strong>WireGuard VPN</strong>, and a secure file-sharing platform for engineering teams. " +
    "On my own time I build on-device AI, like an <strong>rPPG engine</strong> that reads heart rate from a webcam in real time.",

  email: "rascalmaris111@gmail.com",  // shows a Contact pill and a footer link
  links: {
    github: "https://github.com/HogwartLegacy",
    linkedin: "",
    scholar: "",
    x: "",
    book: "",                     // a Cal.com or Calendly link shows "Book a call"
    resumePdf: ""                 // e.g. "assets/resume.pdf" shows "Download PDF" in the résumé
  },

  resume: {
    // The first role opens by default.
    experience: [
      { org: "Convina Software", when: "2021 to 2026", role: "Senior Software Engineer · Feb 2021 to Sep 2026",
        points: [
          "<strong>Raspberry Pi traffic controller.</strong> Embedded Linux on a Compute Module 4: camera and sensors over V4L2, I2C, SPI and UART, STM32 I/O boards, GPIO signal relays with a hardware watchdog, and on-device OpenCV detection driving adaptive timing that cut average waits by about 20%.",
          "<strong>Camera drivers and streaming.</strong> A V4L2 sensor driver for Raspberry Pi (I2C, MIPI CSI-2, device tree, libcamera) tuned for stable 1080p30, kept building across kernel upgrades with DKMS, and low-latency H.264 streaming from traffic and store cameras.",
          "<strong>iRetail store IoT.</strong> Edge services turning camera frames into counts and events across 120+ stores, an async Rust backend (Tokio, Axum) ingesting MQTT with backpressure, InfluxDB and PostgreSQL summaries, BACnet HVAC and energy data, per-device X.509 certificates and OTA updates. p95 API latency went from 800 ms to 120 ms.",
          "<strong>Humanoid robot.</strong> STM32 joint controllers running 1 kHz PID loops with encoder feedback and a CAN link to the main computer, plus sensor fusion and balance control in C++ on ROS 2.",
          "<strong>Krisp desktop app.</strong> Qt/QML features on Windows and macOS, WASAPI and Core Audio with Krisp's virtual microphone and speaker, real-time audio kept off the UI thread with worker threads and lock-free queues, and the move from Qt 5.15 to Qt 6.",
          "<strong>WireGuard VPN.</strong> A cross-platform VPN on a shared Rust core, with a macOS NetworkExtension packet tunnel, split tunneling, DNS leak protection and a kill switch, reconnecting in under 2 seconds after network changes.",
          "<strong>CAM and CNC software.</strong> A 2.5D CAM app (C++ toolpath engine, C# WPF UI) with Fanuc, Haas and GRBL post-processors, OpenCASCADE import, feature recognition and true-shape nesting, and ElementsCAM, a 20-year-old Delphi CAM app, modernized to Delphi 13.",
          "<strong>Desktop apps and native C++.</strong> A WinForms app rebuilt in WPF on .NET 8 (startup from 12 s to 3 s), offline-first clients, a C++03 engine moved to C++17/20, a Boost.Asio integration service handling about 400K transactions a day, and a C++ SDK with a C API used from C#, Python and Rust.",
          "<strong>Data platform.</strong> A Databricks lakehouse on Delta Lake taking in about 2 TB a day, Kafka and Spark Structured Streaming, legacy ETL rebuilt in dbt on Snowflake (6 hours to 40 minutes), and Airflow running 200+ daily tasks. Compute costs fell 35%."
        ] },
      { org: "Software Rescue", when: "2017 to 2020", role: "Software Engineer · Sep 2017 to Dec 2020",
        points: [
          "<strong>Secure file sharing for engineering teams.</strong> A Rust backend with chunked, resumable uploads and delta sync that cut transfer for large CAD/BIM files by about 60%, AES-256-GCM envelope encryption with per-project keys, mutual TLS, and a C++ secure file-transfer service.",
          "<strong>Drivers.</strong> VPN network adapters (an NDIS miniport on Windows, netdev on Linux) and file-sharing drivers (a minifilter, a VFS module) that present encrypted shares as local drives, hardened with Driver Verifier, WinDbg and HLK.",
          "<strong>CAD/BIM processing.</strong> Streaming IFC and DXF parsers in C++ and Rust hardened by fuzzing (20+ crash and hang bugs fixed), OpenCASCADE and IfcOpenShell geometry, multi-gigabyte models processed in under 6 minutes instead of 40, an OpenGL viewer for 50M+ triangles, and Revit and AutoCAD add-ins.",
          "<strong>Multi-DRM packaging.</strong> CENC and cbcs encryption for Widevine, PlayReady and FairPlay with CMAF output for HLS and DASH, Shaka Packager and Bento4 on CPIX/SPEKE key servers, and a license proxy that checks JWT entitlements. Packaging time per title halved.",
          "<strong>Desktop apps.</strong> A WPF client for secure file exchange, AbsentiaDX in Qt and as a native macOS app (Swift, AppKit), signed, notarized and auto-updating, and Delphi tools for CNC routing workflows.",
          "<strong>Devices.</strong> Software for a Jetson TX2/Xavier mobile robot with TensorRT detection under 50 ms a frame, nRF52 BLE firmware with secure DFU updates, and an industrial IoT gateway for a solar company (PROFINET, OPC UA, Modbus, SunSpec).",
          "<strong>Data.</strong> AWS Glue ETL, Kafka audit streams and dbt models on Snowflake, with encryption, role-based access and column-level masking."
        ] },
      { org: "Red Pepper Software", when: "2014 to 2017", role: "Software Engineer · Oct 2014 to Aug 2017",
        points: [
          "<strong>OTT media services.</strong> Backend services and native C++ components (FFmpeg probing, frame-level validation, thumbnails) processing 1,500+ video assets a week, HLS and MPEG-DASH manifest generation and validation, adaptive bitrate, transcoding validation and DRM packaging.",
          "<strong>ManyCam.</strong> Qt/C++ features for the virtual webcam and live-streaming app: multi-source switching, picture-in-picture, effects, OpenGL previews and RTMP streaming.",
          "<strong>Virtual devices.</strong> Virtual camera and audio drivers on Windows (AVStream, PortCls) and Linux (V4L2, ALSA) that bring processed streams into conferencing and capture apps.",
          "<strong>Real-time video.</strong> WebRTC signaling over WebSockets (SDP, ICE, STUN/TURN), and a macOS streaming app with AVFoundation, VideoToolbox and Metal that cut CPU use at 1080p by about 40%, with FairPlay.",
          "<strong>Scale and data.</strong> Load-testing tools simulating 10,000+ concurrent viewers (origin throughput up 35%), and Kafka pipelines for 50M+ player events a day feeding PySpark analytics. Introduced Airflow and Rust in 2016.",
          "<strong>Tools.</strong> WPF and WinForms desktop tools for media QC and ingestion, a DXF quoting tool for a sheet-metal client (quotes in minutes instead of a day), FreeRTOS firmware for a media device, and Jenkins test automation that halved manual QA."
        ] }
    ],
    education: [
      { degree: "M.S. in Computer Science", when: "2010 to 2014", school: "Southern Utah University" }
    ],
    // icon: a symbol id from index.html (t-…, s-… or k-…)
    skills: [
      { icon: "s-code", name: "Languages", items: ["C++ (11 to 20)", "C", "Rust", "Python", "C#", "Swift", "Objective-C", "Delphi", "SQL"] },
      { icon: "t-media", name: "Streaming and media", items: ["HLS", "MPEG-DASH", "CMAF", "Adaptive bitrate", "WebRTC", "RTMP", "RTSP", "H.264", "HEVC", "FFmpeg", "GStreamer", "AVFoundation", "VideoToolbox"] },
      { icon: "s-key", name: "DRM", items: ["Widevine", "PlayReady", "FairPlay", "CENC and cbcs", "CPIX/SPEKE", "Shaka Packager", "Bento4", "License servers"] },
      { icon: "t-drivers", name: "Drivers and kernel", items: ["WDK (KMDF, WDM)", "NDIS", "AVStream", "PortCls", "Minifilters", "Linux kernel modules", "V4L2", "ALSA", "netdev", "VFS", "Device tree", "DKMS", "WinDbg", "Driver Verifier", "KASAN"] },
      { icon: "t-embedded", name: "Embedded and robotics", items: ["Raspberry Pi", "NVIDIA Jetson", "STM32", "nRF52", "FreeRTOS", "I2C", "SPI", "UART", "CAN", "MIPI CSI-2", "BLE", "ROS 2", "PID control", "Yocto"] },
      { icon: "t-iot", name: "IoT and industrial", items: ["MQTT", "Mosquitto", "EMQX", "PROFINET", "OPC UA", "Modbus", "BACnet", "SunSpec", "OTA updates", "Device provisioning", "Grafana"] },
      { icon: "t-ai", name: "AI and vision", items: ["OpenCV", "CUDA", "TensorRT", "ONNX Runtime", "MediaPipe", "llama.cpp"] },
      { icon: "t-security", name: "Networking and security", items: ["TCP/IP", "UDP", "Async I/O", "TLS and mTLS", "WireGuard", "NetworkExtension", "AES-256-GCM", "Envelope encryption", "Ed25519", "X.509", "OAuth 2.0", "JWT"] },
      { icon: "s-code", name: "Rust", items: ["Tokio", "Axum", "Hyper", "Tower", "Serde", "tracing", "rustls", "ring", "RustCrypto", "Rayon", "nom"] },
      { icon: "t-desktop", name: "Desktop and UI", items: ["Qt 5 and 6 (Widgets, QML)", "WPF", "WinForms", "MVVM", ".NET 8", "SwiftUI", "AppKit", "Delphi VCL", "JUCE", "OpenGL", "Metal"] },
      { icon: "t-cad", name: "CAD/CAM and geometry", items: ["OpenCASCADE", "IfcOpenShell", "Clipper2", "STEP", "IGES", "IFC", "DXF", "glTF", "Toolpaths", "G-code post-processors", "Nesting", "Revit and AutoCAD APIs"] },
      { icon: "s-layers", name: "Data engineering", items: ["Spark", "Databricks", "Delta Lake", "Iceberg", "Kafka", "NiFi", "Airflow", "dbt", "Airbyte", "AWS Glue", "Snowflake", "BigQuery", "Redshift"] },
      { icon: "t-data", name: "Databases", items: ["PostgreSQL", "SQL Server", "MySQL", "SQLite", "MongoDB", "Redis", "InfluxDB"] },
      { icon: "k-gauge", name: "Performance and quality", items: ["Multithreading", "Lock-free queues", "Intel TBB", "perf", "VTune", "Valgrind", "Sanitizers", "libFuzzer", "cargo-fuzz", "GoogleTest", "Soak testing"] },
      { icon: "s-box", name: "Build and delivery", items: ["CMake", "vcpkg", "Docker", "GitHub Actions", "Azure DevOps", "Jenkins", "Code signing", "Notarization", "MSIX", "WiX"] }
    ]
  },

  /* One chip per tag; "all" shows everything. Chips nobody uses are left out.
     Each key has an icon in index.html (symbols named t-<key>). */
  filters: [["all", "All"], ["media", "Streaming"], ["audio", "Audio"], ["drivers", "Drivers"], ["embedded", "Embedded"],
    ["robotics", "Robotics"], ["iot", "IoT"], ["security", "Security"], ["desktop", "Desktop"], ["cad", "CAD/CAM"],
    ["data", "Data"], ["ai", "AI & vision"], ["web", "Web"]],

  /* Shelves of work, in page order. layout: "cards" (big covers) or "compact" (rows).
     `gallery: true` hangs that shelf's projects as pictures in the boat on the lake (the 3D voyage); where the
     voyage can't run, it shows as an ordinary shelf instead. */
  sections: [
    { id: "career", title: "Professional work", note: "Ten years across three companies: streaming, drivers, devices, desktop apps and data.", layout: "compact", unit: "projects", gallery: true },
    { id: "projects", title: "Open source", note: "Projects of my own. The source for each is on GitHub.", layout: "cards", unit: "projects" }
  ],

  /* A project joins a shelf through `section`. `art` picks a drawn cover (see assets/js/covers.js);
     set `cover: "assets/img/x.webp"` to use a screenshot instead, and
     `video: "assets/media/x.mp4"` for a loop that plays on hover. */
  projects: [
    /* the professional work: in the boat these hang as pictures, and `details` and `stack` fill the panel a
       picture opens */
    { section: "career", name: "Streaming and multi-DRM", art: "stream", t: .4,
      meta: "Red Pepper Software · Software Rescue", when: "2014 to 2020",
      text: "OTT pipelines for 1,500+ video assets a week: HLS and MPEG-DASH, adaptive bitrate, and CMAF packaging encrypted for Widevine, PlayReady and FairPlay through CPIX/SPEKE key servers. Packaging time per title halved.",
      details: [
        "Backend services and native C++ components (FFmpeg probing, frame-level validation, thumbnails) for media, OTT and television workflows, processing 1,500+ video assets a week.",
        "HLS and MPEG-DASH manifest generation and validation that caught segment, timing and encoding errors before publication.",
        "A DRM packaging pipeline encrypting VOD and live streams with CENC and cbcs for Widevine, PlayReady and FairPlay, producing CMAF for HLS and DASH.",
        "Shaka Packager and Bento4 on multi-DRM key servers over CPIX/SPEKE, managing key IDs, content keys, PSSH data and key rotation for live streams.",
        "A license proxy that checked JWT entitlements before forwarding to the license servers, with rate limiting and audit logging; streams validated on Shaka Player, ExoPlayer, Safari and smart TVs.",
        "Parallel workers and streaming I/O that cut packaging time per title by about 50%."
      ],
      stack: ["HLS", "MPEG-DASH", "CMAF", "Widevine", "PlayReady", "FairPlay", "Shaka Packager", "Bento4", "FFmpeg", "C++", "Rust", "Python"],
      tags: ["media", "security"] },
    { section: "career", name: "ManyCam and virtual devices", art: "webcam", t: 1,
      meta: "Red Pepper Software", when: "2014 to 2017",
      text: "Qt/C++ features for ManyCam's virtual webcam and live-streaming app (multi-source switching, picture-in-picture, RTMP), and virtual camera and audio drivers for Windows and Linux that feed conferencing apps.",
      details: [
        "Qt/C++ features for ManyCam, the virtual webcam and live-streaming app: video source switching, picture-in-picture, effects and streaming to RTMP platforms.",
        "Live previews rendered with OpenGL and an ANGLE fallback on Windows, keeping multi-source 1080p previews smooth.",
        "Virtual camera drivers (AVStream on Windows, V4L2 with videobuf2 on Linux) presenting processed video as a standard webcam to WebRTC and conferencing apps.",
        "Virtual audio drivers (WDM/PortCls on Windows, ALSA on Linux) routing audio between media services and capture and playback apps with low latency.",
        "A macOS video app with AVFoundation and VideoToolbox, bringing processed streams into conferencing and capture apps."
      ],
      stack: ["C++", "Qt", "OpenGL", "FFmpeg", "AVStream", "PortCls", "V4L2", "ALSA", "AVFoundation", "VideoToolbox", "RTMP", "WebRTC"],
      tags: ["media", "drivers", "desktop"] },
    { section: "career", name: "Krisp desktop app", art: "voice", t: .5,
      meta: "Convina Software", when: "2021 to 2026",
      text: "Qt/QML features for Krisp on Windows and macOS: WASAPI and Core Audio with Krisp's virtual microphone and speaker, real-time audio kept off the UI thread with lock-free queues, and the move to Qt 6.",
      details: [
        "Qt/C++ features for Krisp's desktop app on Windows and macOS: the tray UI, device selection and settings screens in QML and Qt Quick.",
        "The UI wired to WASAPI and Core Audio and to Krisp's virtual microphone and speaker, handling device hot-plug and default-device changes reliably.",
        "Real-time audio kept off the UI thread with worker threads and lock-free queues, cutting UI stalls and CPU use.",
        "The codebase moved from Qt 5.15 to Qt 6: deprecated APIs, QML imports and the CMake build on both platforms.",
        "Qt Test suites and CI pipelines producing signed and notarized installers for Windows and macOS."
      ],
      stack: ["C++", "Qt 6", "QML", "WASAPI", "Core Audio", "CMake", "Qt Test"],
      tags: ["audio", "desktop"] },
    { section: "career", name: "Raspberry Pi traffic controller", art: "intersection", t: 2,
      meta: "Convina Software", when: "2021 to 2026",
      text: "Embedded Linux on a Compute Module 4: a V4L2 camera driver, sensors over I2C, SPI and UART, STM32 I/O boards, a hardware watchdog, and on-device OpenCV detection that cut average waits at pilot intersections by about 20%.",
      details: [
        "Embedded software for a Raspberry Pi traffic controller (Compute Module 4) combining camera input with vehicle, pedestrian and environmental sensors to drive signal timing.",
        "Camera and sensors brought up over V4L2, I2C, SPI and UART, STM32-based I/O boards for signal control, and signal-head relays on GPIO with a hardware watchdog and fail-safe flash mode.",
        "A V4L2 camera sensor driver (MIPI CSI-2, device tree overlay, libcamera) tuned for stable 1080p at 30 fps and kept building across kernel upgrades with DKMS.",
        "On-device OpenCV vehicle and pedestrian detection feeding adaptive timing that cut average waits at pilot intersections by about 20%.",
        "Status and alarms over MQTT; race conditions and sensor glitches from long field and soak tests fixed with gdb, ftrace and a logic analyzer."
      ],
      stack: ["C", "C++", "Python", "Raspberry Pi CM4", "V4L2", "libcamera", "OpenCV", "STM32", "I2C", "SPI", "UART", "MQTT"],
      tags: ["embedded", "drivers", "ai"] },
    { section: "career", name: "IoT for stores and solar plants", art: "iot", t: .7,
      meta: "Convina Software · Software Rescue", when: "2017 to 2026",
      text: "Camera sensors and telemetry from 120+ stores over MQTT into an async Rust backend (Tokio, Axum), and a solar-plant gateway reading PLCs over PROFINET, OPC UA and Modbus. p95 API latency from 800 ms to 120 ms.",
      details: [
        "An IoT pipeline for iRetail collecting MQTT data from Raspberry Pi camera sensors and device telemetry across 120+ stores, summarized for store operations.",
        "Edge services that turn camera frames into counts and events on the device, sending results instead of raw video to save bandwidth.",
        "The Rust backend (Tokio, Axum): async MQTT ingestion with bounded channels and backpressure, InfluxDB and PostgreSQL storage, hourly and daily summaries, and device-management APIs. p95 latency from 800 ms to 120 ms.",
        "Store HVAC and energy meters over BACnet, per-device X.509 certificates, provisioning, OTA updates and offline buffering, with Grafana dashboards and alerts.",
        "An industrial IoT gateway for a solar power company: Siemens and other PLCs over PROFINET and OPC UA/S7, inverters and meters over Modbus (SunSpec), store-and-forward buffering and 15-minute production reports."
      ],
      stack: ["Rust", "Tokio", "Axum", "MQTT", "EMQX", "InfluxDB", "PostgreSQL", "BACnet", "PROFINET", "OPC UA", "Modbus", "Grafana"],
      tags: ["iot", "embedded", "data"] },
    { section: "career", name: "Humanoid and Jetson robots", art: "robot", t: .6,
      meta: "Convina Software · Software Rescue", when: "2017 to 2026",
      text: "STM32 joint controllers running 1 kHz PID loops over CAN, balance control and sensor fusion on ROS 2, and a Jetson mobile robot with TensorRT detection under 50 ms a frame.",
      details: [
        "STM32 firmware for the humanoid robot's joint controllers, running PID loops at 1 kHz with encoder feedback and PWM motor drivers.",
        "STM32 peripheral drivers (UART, SPI, I2C, ADC, timers, DMA) and a CAN protocol linking the microcontrollers to the main computer.",
        "Sensor fusion and balance control in C++ on ROS 2, integrating joint actuators, an IMU and cameras.",
        "Software for a Jetson TX2/Xavier mobile robot integrating cameras, LiDAR and motor controllers for autonomous navigation.",
        "GPU-accelerated object detection with CUDA and TensorRT feeding ROS navigation in under 50 ms a frame."
      ],
      stack: ["C", "C++", "STM32", "CAN", "ROS 2", "NVIDIA Jetson", "CUDA", "TensorRT", "OpenCV"],
      tags: ["robotics", "embedded", "ai"] },
    { section: "career", name: "WireGuard VPN", art: "tunnel", t: .2,
      meta: "Convina Software · Software Rescue", when: "2017 to 2026",
      text: "A cross-platform VPN on a shared Rust core, with virtual adapters on Windows (NDIS), Linux (netdev) and macOS (NetworkExtension), split tunneling, DNS leak protection, a kill switch, and reconnects in under 2 seconds.",
      details: [
        "A VPN app for Windows, macOS and Linux on a shared Rust networking core, tunneling traffic over WireGuard.",
        "Split tunneling, DNS leak protection, IPv4/IPv6 routes, MTU tuning, NAT keepalives and a kill switch, reconnecting in under 2 seconds after network changes.",
        "On macOS, a NetworkExtension packet tunnel in a system extension, with a SwiftUI interface, Keychain storage, notarization and MDM profiles.",
        "Virtual network adapter drivers: an NDIS 6.x miniport on Windows, and a netdev driver on Linux encrypting with the kernel crypto API.",
        "IOCTL, sysfs and Netlink interfaces that validate every input, hardened with Driver Verifier, WinDbg and HLK."
      ],
      stack: ["Rust", "WireGuard", "NDIS", "netdev", "NetworkExtension", "Swift", "SwiftUI", "C", "TLS"],
      tags: ["security", "drivers", "desktop"] },
    { section: "career", name: "Secure file sharing", art: "vault", t: .4,
      meta: "Software Rescue", when: "2017 to 2020",
      text: "A Rust platform for engineering teams and their partners: chunked, resumable uploads and delta sync (about 60% less transfer), AES-256-GCM envelope encryption, mutual TLS, and a driver that mounts shares as a local drive.",
      details: [
        "A secure file storage and sharing platform for engineering teams and their partners: folder sync, share links, version history and role-based access.",
        "Chunked, resumable uploads and delta sync in Rust, cutting transfer for large CAD/BIM files by about 60%.",
        "AES-256-GCM envelope encryption with per-project keys, isolated in a small crypto module (ring, RustCrypto), with TLS and mutual TLS everywhere.",
        "File-sharing drivers, a Windows minifilter and a Linux VFS module, presenting encrypted shares as a local drive.",
        "A WPF client and Revit and AutoCAD add-ins for exchanging models, with streaming IFC and DXF parsers hardened by fuzzing (20+ bugs fixed)."
      ],
      stack: ["Rust", "Tokio", "C++", "AES-256-GCM", "mTLS", "Minifilter", "VFS", "WPF", "IFC", "DXF"],
      tags: ["security", "drivers", "cad"] },
    { section: "career", name: "CAD/CAM and CNC", art: "toolpath", t: 1.2,
      meta: "Convina Software · Software Rescue", when: "2017 to 2026",
      text: "A 2.5D CAM app with Fanuc, Haas and GRBL post-processors and true-shape nesting, a 20-year-old Delphi CAM app brought to Delphi 13, and multi-gigabyte BIM models processed in 6 minutes instead of 40.",
      details: [
        "A 2.5D CAM application for a CNC router client (C++ toolpath engine, C# WPF UI) generating pocketing, profiling and drilling toolpaths from DXF and STEP.",
        "Polygon offsetting (Clipper2), R-tree indexing and arc fitting that shrank G-code by 45%, with Fanuc, Haas and GRBL post-processors under golden-file tests.",
        "STEP and IGES import with OpenCASCADE, feature recognition that cut programming time per part by about 30%, and true-shape nesting that raised material use by 8%.",
        "ElementsCAM, a 20-year-old Delphi CAM app, modernized to Delphi 13 (Unicode, 64-bit, FireDAC), with geometry moved into a native C++/Rust DLL.",
        "Multi-gigabyte BIM models processed in under 6 minutes instead of 40 (Intel TBB, memory-mapped I/O), and an OpenGL viewer that stays interactive at 50M+ triangles."
      ],
      stack: ["C++", "C#", "WPF", "Delphi", "OpenCASCADE", "IfcOpenShell", "Clipper2", "Intel TBB", "OpenGL", "G-code"],
      tags: ["cad", "desktop"] },
    { section: "career", name: "Data platforms", art: "lake", t: .3,
      meta: "Convina Software · Red Pepper Software", when: "2014 to 2026",
      text: "A Databricks lakehouse taking in about 2 TB a day, Kafka and Spark Structured Streaming, ETL rebuilt in dbt on Snowflake (6 hours to 40 minutes), and 50M+ player events a day for OTT analytics. Compute costs down 35%.",
      details: [
        "A Databricks lakehouse on Delta Lake (bronze, silver and gold) for a retail client, processing about 2 TB a day of orders, inventory and clickstream.",
        "Kafka and Spark Structured Streaming landing events in Delta tables within a minute, with checkpoints and idempotent writes.",
        "Legacy SQL Server ETL rebuilt as incremental dbt models on Snowflake (6 hours to 40 minutes), Airbyte CDC from 15+ sources, and Airflow running 200+ daily tasks.",
        "Compute costs cut 35% by fixing Spark skew and shuffle, adding Z-ordering and right-sizing warehouses.",
        "Kafka pipelines carrying 50M+ OTT player events a day into PySpark QoE analytics, with Airflow introduced in 2016."
      ],
      stack: ["Spark", "Databricks", "Delta Lake", "Kafka", "dbt", "Snowflake", "Airflow", "Airbyte", "AWS Glue", "Redshift", "Python", "SQL"],
      tags: ["data"] },

    { section: "projects", name: "rPPG Engine", art: "pulse", t: .9,
      meta: "C++17 · ONNX Runtime · MediaPipe · Android & iOS",
      text: "Heart rate, breathing and HRV from facial video, in real time on one CPU core. A face mesh, 28 skin regions and two streaming neural nets, fused and tracked: 0.62 bpm error on UBFC-rPPG.",
      tags: ["ai"],
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
      tags: ["audio", "desktop"],
      repo: "https://github.com/HogwartLegacy/Stemy_Mastering" }
  ],

  /* Cards with a line drawing each. art: waves, keys or fuzz;
     icon: gauge, lock or bug. */
  notes: {
    id: "how", title: "How I work", intro: "Three habits from ten years of shipping systems software.",
    cards: [
      { art: "waves", icon: "gauge", kicker: "Performance", title: "Measure, then fix",
        text: "Profile first, then change one thing: p95 latency on a Rust IoT backend from 800 ms to 120 ms, p99 on a C++ service down 60%, and an rPPG engine scored to 0.62 bpm against medical oximeters.",
        links: [{ label: "Report", text: "rPPG benchmark", url: "https://github.com/HogwartLegacy/rPPG-Engine/blob/main/docs/BENCHMARK.md" }] },
      { art: "keys", icon: "lock", kicker: "Security", title: "Keep the keys out of reach",
        text: "Keys live in small, isolated crypto modules, so packaging jobs and application code never touch them. Devices carry their own certificates, and data is encrypted wherever it leaves a machine." },
      { art: "fuzz", icon: "bug", kicker: "Reliability", title: "Break it before it ships",
        text: "Fuzzing found 20+ crash and hang bugs in file parsers before release, sanitizers in CI cut production crashes by about 70%, and drivers ran 72-hour soak tests before they were signed." }
    ]
  }
};
