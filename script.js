// script.js - Weather app with autocomplete (OpenWeather Geo API)
// Replace YOUR_API_KEY below with your OpenWeather API key
const apiKey = "07ff8ff44373247ab99f630bde317b87"; // <-- set your key

/* ---------- DOM references ---------- */
const cityInput = document.getElementById("cityInput");
const resultDiv = document.getElementById("result");
const suggestionsBox = document.getElementById("suggestions");

/* ---------- Debounce helper ---------- */
function debounce(fn, delay = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

/* ---------- Geocoding (suggestions) ---------- */
/*
  Uses OpenWeather's direct geocoding API:
  https://api.openweathermap.org/geo/1.0/direct?q={city name}&limit=5&appid={API key}
*/
async function fetchCitySuggestions(query) {
  if (!query || query.trim().length < 1) {
    hideSuggestions();
    return;
  }
  const q = encodeURIComponent(query.trim());
  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${q}&limit=5&appid=${apiKey}`;

  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      console.warn("Geo API error", resp.status);
      hideSuggestions();
      return;
    }
    const list = await resp.json();
    renderSuggestions(list);
  } catch (err) {
    console.error("Geo fetch failed:", err);
    hideSuggestions();
  }
}

function renderSuggestions(list) {
  suggestionsBox.innerHTML = "";
  if (!Array.isArray(list) || list.length === 0) {
    hideSuggestions();
    return;
  }

  list.forEach((loc, i) => {
    // Build a nice display: City, state (if present), country
    const fullName = [
      loc.name || "",
      loc.state ? (", " + loc.state) : "",
      loc.country ? (", " + loc.country) : ""
    ].join("").replace(/^, /, "");

    const item = document.createElement("div");
    item.className = "item";
    item.setAttribute("data-lat", loc.lat);
    item.setAttribute("data-lon", loc.lon);
    item.setAttribute("role", "option");

    const title = document.createElement("div");
    title.textContent = fullName;

    const muted = document.createElement("div");
    muted.className = "muted";
    muted.textContent = `Lat: ${loc.lat.toFixed(2)}, Lon: ${loc.lon.toFixed(2)}`;

    item.appendChild(title);
    item.appendChild(muted);

    // click -> select and fetch weather
    item.addEventListener("click", () => {
      cityInput.value = fullName;
      hideSuggestions();
      // Use the coords to fetch weather (more accurate)
      const lat = item.getAttribute("data-lat");
      const lon = item.getAttribute("data-lon");
      fetchWeatherByCoords(lat, lon, fullName);
    });

    suggestionsBox.appendChild(item);
  });

  suggestionsBox.style.display = "block";
}

/* ---------- Helpers to show/hide suggestions ---------- */
function hideSuggestions() {
  suggestionsBox.innerHTML = "";
  suggestionsBox.style.display = "none";
}

/* ---------- Fetch weather by coordinates (preferred, accurate) ---------- */
/* OpenWeather current weather by coords:
   https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={API key}&units=metric
*/
async function fetchWeatherByCoords(lat, lon, displayName = "") {
  if (!lat || !lon) return;
  resultDiv.innerHTML = `Searching weather for ${displayName || (lat + "," + lon)} ...`;

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      const errJson = await resp.json().catch(()=>null);
      console.warn("Weather API error:", resp.status, errJson);
      resultDiv.textContent = `Could not fetch weather (status ${resp.status}).`;
      return;
    }
    const data = await resp.json();
    showWeatherData(data);
  } catch (err) {
    console.error("Fetch failed:", err);
    resultDiv.textContent = "Network error while fetching weather.";
  }
}

/* ---------- Existing getWeather (by city name fallback) ---------- */
async function getWeather() {
  const city = cityInput.value.trim();
  if (!city) {
    resultDiv.textContent = "Please enter a city name.";
    return;
  }

  // We prefer coords (if user clicked suggestion), but if not, query by name:
  // Use the same URL as before but with q parameter
  resultDiv.textContent = "Searching for " + city + " ...";

  const q = encodeURIComponent(city);
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${q}&appid=${apiKey}&units=metric`;

  try {
    const resp = await fetch(url);
    console.log("Weather request:", { url, status: resp.status });
    if (!resp.ok) {
      let errMsg = `HTTP ${resp.status}`;
      try {
        const ej = await resp.json();
        if (ej && ej.message) errMsg += ` — ${ej.message}`;
      } catch(e){/* ignore */ }
      if (resp.status === 404) {
        resultDiv.textContent = `City not found: "${city}". Try a different spelling or pick a suggestion.`;
      } else if (resp.status === 401) {
        resultDiv.textContent = "Invalid API key (401). Check your key in script.js.";
      } else {
        resultDiv.textContent = "Error: " + errMsg;
      }
      return;
    }
    const data = await resp.json();
    showWeatherData(data);
  } catch (err) {
    console.error("Fetch failed:", err);
    resultDiv.textContent = "Network error while fetching weather. Check console for details.";
  }
}

/* ---------- Render weather data ---------- */
function showWeatherData(data) {
  const temp = data.main && data.main.temp;
  const weather = data.weather && data.weather[0] && data.weather[0].description;
  const icon = data.weather && data.weather[0] && data.weather[0].icon;
  resultDiv.innerHTML = `
    <h2>${data.name}${data.sys && data.sys.country ? ", " + data.sys.country : ""}</h2>
    <p>🌡️ ${temp} °C</p>
    <p>🌤️ ${weather}</p>
    <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="icon">
  `;
}

/* ---------- Wire up events ---------- */
const debouncedFetch = debounce((q) => {
  // If API key is not set, skip with console warning
  if (!apiKey || apiKey === "YOUR_API_KEY") {
    console.warn("Geocoding skipped: API key not set.");
    return;
  }
  fetchCitySuggestions(q);
}, 300);

// input typing -> suggestions
cityInput.addEventListener("input", (e) => {
  const val = e.target.value;
  if (!val || val.trim().length < 1) {
    hideSuggestions();
    return;
  }
  debouncedFetch(val);
});

// hide suggestions when clicking outside
document.addEventListener("click", (e) => {
  if (!document.querySelector(".autocomplete").contains(e.target)) {
    hideSuggestions();
  }
});

// Enter key on input -> run the getWeather (fallback)
cityInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    hideSuggestions();
    getWeather();
  }
});

// Example: if you also have a button that calls getWeather(), keep using it
// e.g. <button onclick="getWeather()">Get Weather</button>
