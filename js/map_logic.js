
// GLOBAL MAP STATE
let globeInstance = null;
let mapInitialized = false;

function initThreatMap() {
    if (mapInitialized) return;
    mapInitialized = true;

    console.log("Initializing Global Threat Map...");

    // 1. Real Cities Data (Lat, Lng)
    // Red: Attack Sources (East)
    const attackSources = [
        { name: "Moscow, RU", lat: 55.7558, lng: 37.6173 },
        { name: "Beijing, CN", lat: 39.9042, lng: 116.4074 },
        { name: "Pyongyang, KP", lat: 39.0392, lng: 125.7625 },
        { name: "St. Petersburg, RU", lat: 59.9343, lng: 30.3351 },
        { name: "Shanghai, CN", lat: 31.2304, lng: 121.4737 },
        { name: "Lagos, NG", lat: 6.5244, lng: 3.3792 },
        { name: "Tehran, IR", lat: 35.6892, lng: 51.3890 }
    ];

    // Green: Victims (West + India)
    const victims = [
        { name: "Mumbai, IN", lat: 19.0760, lng: 72.8777 },
        { name: "Delhi, IN", lat: 28.7041, lng: 77.1025 },
        { name: "Bangalore, IN", lat: 12.9716, lng: 77.5946 },
        { name: "Hyderabad, IN", lat: 17.3850, lng: 78.4867 },
        { name: "New York, US", lat: 40.7128, lng: -74.0060 },
        { name: "London, UK", lat: 51.5074, lng: -0.1278 },
        { name: "Berlin, DE", lat: 52.5200, lng: 13.4050 },
        { name: "San Francisco, US", lat: 37.7749, lng: -122.4194 }
    ];

    // Generate Realistic Arcs
    const N = 40;
    const arcsData = [...Array(N).keys()].map(() => {
        const src = attackSources[Math.floor(Math.random() * attackSources.length)];
        const dst = victims[Math.floor(Math.random() * victims.length)];
        return {
            startLat: src.lat,
            startLng: src.lng,
            endLat: dst.lat,
            endLng: dst.lng,
            color: ['#ef4444', '#dc2626', '#b91c1c'][Math.round(Math.random() * 2)]
        };
    });

    // High Traffic "Hotspots" (Hex Bins) - Concentrated on India/US
    const weightData = [];
    victims.forEach(v => {
        // Add cluster around major cities
        for (let i = 0; i < 15; i++) {
            weightData.push({
                lat: v.lat + (Math.random() - 0.5) * 5,
                lng: v.lng + (Math.random() - 0.5) * 5,
                weight: Math.random()
            });
        }
    });

    // 2. Initialize Globe
    const elem = document.getElementById('globe-container');

    // Check if Globe lib is loaded
    if (typeof Globe === 'undefined') {
        console.warn("Globe library not loaded (offline mode). Map skipped.");
        elem.innerHTML = "<div style='color:white; text-align:center; padding-top:20%;'>Map requires internet connection for Three.js</div>";
        return;
    }

    // Auto-Rotate
    globeInstance = Globe()(elem)
        .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-night.jpg')
        .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
        .backgroundImageUrl('https://unpkg.com/three-globe/example/img/night-sky.png')
        .arcsData(arcsData)
        .arcColor('color')
        .arcDashLength(0.4)
        .arcDashGap(2)
        .arcDashInitialGap(() => Math.random())
        .arcDashAnimateTime(1500 + Math.random() * 2000) // Varied speeds
        .arcStroke(0.6)
        .hexBinPointsData(weightData)
        .hexBinPointWeight('weight')
        .hexBinResolution(4)
        .hexBinMerge(true)
        .enablePointerInteraction(true);

    // Initial Controls
    globeInstance.controls().autoRotate = true;
    globeInstance.controls().autoRotateSpeed = 0.8;

    // 3. Live Ticker Logic
    const ticker = document.getElementById('map-ticker');
    const nodesEl = document.getElementById('map-nodes');
    const rateEl = document.getElementById('map-rate');

    if (!ticker) return; // Guard

    // Stats
    nodesEl.textContent = "14,920";
    rateEl.textContent = "420";

    // Fake Ticker Updates
    const attackTypes = ["SQL Injection", "XSS Payload", "Phishing Attempt", "Credential Stuffing", "Botnet Probe", "DDoS Packet"];
    const isps = ["Jio Fiber", "Airtel Broadband", "ACT Fibernet", "BSNL", "Tatasky"];

    setInterval(() => {
        // Update Count
        let current = parseInt(nodesEl.textContent.replace(/,/g, ''));
        nodesEl.textContent = (current + Math.floor(Math.random() * 15)).toLocaleString();

        // Update Rate
        let rate = parseInt(rateEl.textContent);
        rateEl.textContent = rate + Math.floor(Math.random() * 20 - 5);

        // Update Text
        const type = attackTypes[Math.floor(Math.random() * attackTypes.length)];
        const src = attackSources[Math.floor(Math.random() * attackSources.length)];
        const dst = victims[Math.floor(Math.random() * victims.length)]; // Target local cities
        const ip = `1${Math.floor(Math.random() * 9)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.X`;
        const isp = isps[Math.floor(Math.random() * isps.length)];

        ticker.textContent = `⚠️ ALERT: ${type} targeting ${dst.name} (${isp}) from ${src.name} [${ip}] ... BLOCKED by AI Engine ... STATUS: SECURE ...`;
    }, 1800);
}
