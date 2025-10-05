const apiKey = "YOUR_API_KEY"; // <-- Replace with your OpenWeatherMap API key

async function getWeather() {
  const city = document.getElementById("cityInput").value;
  const resultDiv = document.getElementById("result");

  if (!city) {
    resultDiv.textContent = "Please enter a city name.";
    return;
  }

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`
    );
    if (!response.ok) throw new Error("City not found");

    const data = await response.json();
    const temp = data.main.temp;
    const weather = data.weather[0].description;
    const icon = data.weather[0].icon;

    resultDiv.innerHTML = `
      <h2>${data.name}</h2>
      <p>🌡️ ${temp} °C</p>
      <p>🌤️ ${weather}</p>
      <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="Weather icon">
    `;
  } catch (error) {
    resultDiv.textContent = "Error: " + error.message;
  }
}
