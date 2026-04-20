// ─── CONFIGURACIÓN ────────────────────────────────────────────
// Para usar la app real: regístrate en https://openweathermap.org/api
// y reemplaza 'YOUR_API_KEY' con tu clave gratuita
const API_KEY = 'YOUR_API_KEY';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const GEO_URL = 'https://api.openweathermap.org/geo/1.0';

// ─── Estado ───────────────────────────────────────────────────
let unit = 'metric'; // metric = Celsius, imperial = Fahrenheit
let currentData = null;
let searchTimeout = null;

// ─── DOM ──────────────────────────────────────────────────────
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const geoBtn = document.getElementById('geo-btn');
const autocompleteEl = document.getElementById('autocomplete');
const btnCelsius = document.getElementById('btn-celsius');
const btnFahrenheit = document.getElementById('btn-fahrenheit');
const loadingEl = document.getElementById('loading');
const weatherContentEl = document.getElementById('weather-content');
const errorEl = document.getElementById('error-state');
const welcomeEl = document.getElementById('welcome-state');
const bgScene = document.getElementById('bg-scene');
const particles = document.getElementById('particles');

// ─── Helpers ──────────────────────────────────────────────────
const DAYS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const MONTHS_SHORT = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

function formatTemp(k) {
  return unit === 'metric' ? Math.round(k) : Math.round(k * 9/5 + 32);
}

function unitLabel() { return unit === 'metric' ? '°C' : '°F'; }

function getWeatherScene(code, isNight = false) {
  if (code >= 200 && code < 300) return { sky: ['#0a0a1a','#1a1530'], particle: 'rain', particleColor: 'rgba(150,180,255,0.4)', emoji: '⛈️' };
  if (code >= 300 && code < 600) return { sky: ['#0f1520','#192030'], particle: 'rain', particleColor: 'rgba(180,210,255,0.3)', emoji: '🌧️' };
  if (code >= 600 && code < 700) return { sky: ['#1a2030','#252d3d'], particle: 'snow', particleColor: 'rgba(255,255,255,0.8)', emoji: '🌨️' };
  if (code >= 700 && code < 800) return { sky: ['#1a1810','#2a2520'], particle: null, particleColor: null, emoji: '🌫️' };
  if (code === 800) {
    if (isNight) return { sky: ['#050810','#0a1030'], particle: 'stars', particleColor: 'rgba(255,255,255,0.8)', emoji: '🌙' };
    return { sky: ['#0a2040','#1a4a8a'], particle: null, particleColor: null, emoji: '☀️' };
  }
  if (code >= 801 && code <= 803) return { sky: ['#0f1a30','#1a2840'], particle: null, particleColor: null, emoji: '⛅' };
  return { sky: ['#101520','#1a2030'], particle: null, particleColor: null, emoji: '☁️' };
}

// ─── Fondo dinámico ───────────────────────────────────────────
function updateBackground(weatherCode, timezone) {
  const now = new Date();
  const localHour = new Date(now.getTime() + timezone * 1000).getUTCHours();
  const isNight = localHour < 6 || localHour > 20;
  const scene = getWeatherScene(weatherCode, isNight);

  bgScene.style.setProperty('--sky-a', scene.sky[0]);
  bgScene.style.setProperty('--sky-b', scene.sky[1]);

  particles.innerHTML = '';
  if (scene.particle) {
    bgScene.style.setProperty('--particle-color', scene.particleColor);
    const count = scene.particle === 'stars' ? 80 : scene.particle === 'snow' ? 30 : 50;
    for (let i = 0; i < count; i++) createParticle(scene.particle, i, count);
  }
}

function createParticle(type, i, total) {
  const p = document.createElement('div');
  p.className = 'particle';
  const x = Math.random() * 100;
  const size = type === 'rain' ? { w: 1, h: 8 + Math.random() * 6 } :
               type === 'snow' ? { w: 4 + Math.random()*4, h: 4 + Math.random()*4 } :
               { w: 1 + Math.random()*2, h: 1 + Math.random()*2 };
  const duration = type === 'rain' ? 0.5 + Math.random()*0.3 :
                   type === 'snow' ? 4 + Math.random()*4 :
                   3 + Math.random()*5;
  const delay = Math.random() * duration * 2;

  p.style.cssText = `
    left: ${x}%;
    width: ${size.w}px;
    height: ${size.h}px;
    animation-duration: ${duration}s;
    animation-delay: -${delay}s;
    border-radius: ${type === 'rain' ? '0' : '50%'};
    ${type === 'stars' ? `animation-name: twinkle; animation-timing-function: ease-in-out; animation-iteration-count: infinite; top: ${Math.random()*100}%;` : ''}
  `;
  particles.appendChild(p);
}

// Animación de estrella
const style = document.createElement('style');
style.textContent = `@keyframes twinkle { 0%,100%{opacity:0.1} 50%{opacity:0.9} }`;
document.head.appendChild(style);

// ─── API ──────────────────────────────────────────────────────
async function fetchWeather(lat, lon, cityName = null) {
  showState('loading');
  try {
    const [current, forecast] = await Promise.all([
      fetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=metric&lang=es&appid=${API_KEY}`).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }),
      fetch(`${BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=metric&lang=es&appid=${API_KEY}`).then(r => r.json())
    ]);

    currentData = { current, forecast, lat, lon };
    renderWeather(current, forecast);
    showState('weather');
  } catch (err) {
    console.error(err);
    if (API_KEY === 'YOUR_API_KEY') {
      showDemoData(cityName || 'Tu Ciudad');
    } else {
      showError('No se pudo obtener el tiempo. Verifica tu clave API.');
    }
  }
}

// ─── Demo data (cuando no hay API key) ───────────────────────
function showDemoData(cityName) {
  const demo = {
    name: cityName,
    sys: { country: 'ES' },
    weather: [{ description: 'cielo despejado', id: 800, icon: '01d' }],
    main: { temp: 22, feels_like: 21, humidity: 58 },
    wind: { speed: 3.2 },
    visibility: 10000,
    timezone: 3600
  };
  const demoForecast = { list: [] };
  const days = ['Mañana','Pasado','Jueves','Viernes','Sábado'];
  const icons = ['🌤','☁️','🌧','⛅','☀️'];
  const codes = [801, 804, 500, 802, 800];
  for (let i = 0; i < 5; i++) {
    demoForecast.list.push({
      dt: Date.now()/1000 + (i+1)*86400,
      weather: [{ description: 'parcialmente nublado', id: codes[i] }],
      main: { temp_max: 20+i*2-i, temp_min: 12+i, humidity: 55+i*5 }
    });
  }
  currentData = { current: demo, forecast: demoForecast };
  renderWeather(demo, demoForecast, true);
  showState('weather');
}

// ─── Render ───────────────────────────────────────────────────
function renderWeather(current, forecast, isDemo = false) {
  document.getElementById('city-name').textContent = current.name;
  document.getElementById('country-name').textContent =
    `${current.sys.country}${isDemo ? ' · (Demo — añade tu API key)' : ''}`;
  document.getElementById('weather-desc').textContent = current.weather[0].description;
  document.getElementById('temp-main').textContent = formatTemp(current.main.temp);
  document.getElementById('temp-unit-label').textContent = unitLabel();
  document.getElementById('humidity').textContent = current.main.humidity + '%';
  document.getElementById('wind').textContent = (current.wind.speed * 3.6).toFixed(1) + ' km/h';
  document.getElementById('visibility').textContent = (current.visibility / 1000).toFixed(1) + ' km';
  document.getElementById('feels-like').textContent = formatTemp(current.main.feels_like) + unitLabel();

  updateBackground(current.weather[0].id, current.timezone || 0);
  renderForecast(forecast);
}

function renderForecast(forecast) {
  const listEl = document.getElementById('forecast-list');
  listEl.innerHTML = '';

  // Agrupa por día — toma el slot de las 12:00 o el primero disponible
  const byDay = {};
  (forecast.list || []).forEach(item => {
    const d = new Date(item.dt * 1000);
    const key = d.toDateString();
    const hour = d.getHours();
    if (!byDay[key] || Math.abs(hour - 12) < Math.abs(new Date(byDay[key].dt * 1000).getHours() - 12)) {
      byDay[key] = item;
    }
  });

  const today = new Date().toDateString();
  const entries = Object.entries(byDay).filter(([k]) => k !== today).slice(0, 5);

  entries.forEach(([dateStr, item]) => {
    const d = new Date(dateStr);
    const dayLabel = DAYS[d.getDay()];
    const scene = getWeatherScene(item.weather[0].id);
    const maxTemp = item.main?.temp_max ?? item.main?.temp;
    const minTemp = item.main?.temp_min ?? item.main?.temp - 5;
    const humidity = item.main?.humidity ?? 60;

    const el = document.createElement('div');
    el.className = 'forecast-item';
    el.innerHTML = `
      <span class="forecast-day">${dayLabel}</span>
      <span class="forecast-icon">${scene.emoji}</span>
      <span class="forecast-desc">${item.weather[0].description}</span>
      <div class="forecast-humidity-bar"><div class="forecast-humidity-fill" style="width:${humidity}%"></div></div>
      <div class="forecast-temps">
        <span class="temp-max">${formatTemp(maxTemp)}${unitLabel()}</span>
        <span class="temp-min">${formatTemp(minTemp)}${unitLabel()}</span>
      </div>
    `;
    listEl.appendChild(el);
  });
}

// ─── Geolocalización ──────────────────────────────────────────
function getLocation() {
  if (!navigator.geolocation) {
    showError('Tu navegador no soporta geolocalización.');
    return;
  }
  showState('loading');
  navigator.geolocation.getCurrentPosition(
    pos => fetchWeather(pos.coords.latitude, pos.coords.longitude),
    () => showError('No se pudo acceder a tu ubicación.')
  );
}

// ─── Búsqueda con autocompletado ──────────────────────────────
async function searchCities(query) {
  if (query.length < 3) { hideAutocomplete(); return; }
  try {
    const res = await fetch(`${GEO_URL}/direct?q=${encodeURIComponent(query)}&limit=5&appid=${API_KEY}`);
    const cities = await res.json();
    showAutocomplete(cities);
  } catch {
    // Si no hay API key, mostrar búsqueda directa
    showAutocomplete([{ name: query, country: '', lat: 0, lon: 0, _direct: true }]);
  }
}

function showAutocomplete(cities) {
  autocompleteEl.innerHTML = '';
  if (!cities.length) { hideAutocomplete(); return; }
  cities.forEach(city => {
    const li = document.createElement('li');
    li.textContent = city._direct
      ? `Buscar "${city.name}" (demo)`
      : `${city.name}${city.state ? ', ' + city.state : ''}, ${city.country}`;
    li.addEventListener('click', () => {
      searchInput.value = city.name;
      hideAutocomplete();
      if (city._direct) showDemoData(city.name);
      else fetchWeather(city.lat, city.lon, city.name);
    });
    autocompleteEl.appendChild(li);
  });
  autocompleteEl.classList.add('visible');
}

function hideAutocomplete() { autocompleteEl.classList.remove('visible'); }

// ─── UI State ─────────────────────────────────────────────────
function showState(state) {
  loadingEl.style.display = state === 'loading' ? 'flex' : 'none';
  weatherContentEl.style.display = state === 'weather' ? 'block' : 'none';
  errorEl.style.display = state === 'error' ? 'flex' : 'none';
  welcomeEl.style.display = state === 'welcome' ? 'flex' : 'none';
}

function showError(msg) {
  document.getElementById('error-msg').textContent = msg;
  showState('error');
}

// ─── Event Listeners ──────────────────────────────────────────
searchBtn.addEventListener('click', () => {
  const q = searchInput.value.trim();
  if (q) {
    if (API_KEY === 'YOUR_API_KEY') showDemoData(q);
    else searchCities(q);
  }
});

searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') searchBtn.click();
});

searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => searchCities(searchInput.value.trim()), 300);
});

document.addEventListener('click', e => {
  if (!e.target.closest('.search-wrap')) hideAutocomplete();
});

geoBtn.addEventListener('click', getLocation);
document.getElementById('btn-geo-welcome').addEventListener('click', getLocation);
document.getElementById('btn-retry').addEventListener('click', () => {
  if (currentData) fetchWeather(currentData.lat, currentData.lon);
  else showState('welcome');
});

btnCelsius.addEventListener('click', () => {
  unit = 'metric'; btnCelsius.classList.add('active'); btnFahrenheit.classList.remove('active');
  if (currentData) renderWeather(currentData.current, currentData.forecast);
});
btnFahrenheit.addEventListener('click', () => {
  unit = 'imperial'; btnFahrenheit.classList.add('active'); btnCelsius.classList.remove('active');
  if (currentData) renderWeather(currentData.current, currentData.forecast);
});

// ─── Init ─────────────────────────────────────────────────────
showState('welcome');

// Cargar la última ciudad buscada
const lastCity = localStorage.getItem('cielo_last_city');
if (lastCity) {
  const { lat, lon, name } = JSON.parse(lastCity);
  fetchWeather(lat, lon, name);
}
