// Base URLs for the fuel station API
const baseURL = "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/";
const API_URL = baseURL + "EstacionesTerrestres";
const PROVINCES_URL = baseURL + "Listados/Provincias/";
const FUEL_TYPE_URL = baseURL + "Listados/ProductosPetroliferos/";

// Select HTML elements
const provinceSelectElement = document.getElementById("provinceSelect");
const municipalitySelectElement = document.getElementById("municipalitySelect");
const fuelTypeSelectElement = document.getElementById("fuelTypeSelect");
const openNowCheckboxElement = document.getElementById("openNowCheckbox");
const resultsElement = document.getElementById("results");

// Check if the station is open now
function isStationInService(schedule) {
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    if (schedule.includes("L-D: 24H")) return true;

    const daysMap = { L: 1, M: 2, X: 3, J: 4, V: 5, S: 6, D: 0 };
    const hours = schedule.split(";");

    for (const hour of hours) {
        const [days, timeRange] = hour.split(": ");
        const [startDay, endDay] = days.split("-").map(d => daysMap[d.trim()]);
        const [start, end] = timeRange
            .split("-")
            .map(t => t.split(":").reduce((h, m) => h * 60 + Number(m)));

        if (
            ((currentDay >= startDay && currentDay <= endDay) ||
                (endDay < startDay &&
                    (currentDay >= startDay || currentDay <= endDay))) &&
            ((currentTime >= start && currentTime <= end) ||
                (end < start && (currentTime >= start || currentTime <= end)))
        ) {
            return true;
        }
    }
    return false;
}

// Filters gas stations that are currently open based on their schedule
function getOpenGasStations(stations) {
    return stations.filter(station => isStationInService(station.Horario));
}

// Handles the request for gas stations based on current selections
function handleRequest() {
    if (municipalitySelectElement.value && fuelTypeSelectElement.value) {
        const PRODUCT_URL = baseURL + "EstacionesTerrestres/FiltroMunicipioProducto/" +
            municipalitySelectElement.value + "/" +
            fuelTypeSelectElement.value;
        request(PRODUCT_URL);
    }
}

// Requests and populates provinces dropdown
async function requestProvinces(url) {
    try {
        let response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Network error: ${response.statusText}`);
        }
        let data = await response.json();

        data.forEach(province => {
            const optionElement = document.createElement("option");
            optionElement.setAttribute("value", province.IDPovincia);
            optionElement.textContent = province.Provincia;
            provinceSelectElement.append(optionElement);
        });

        // Event listener for province selection
        provinceSelectElement.addEventListener('change', () => {
            const MUNICIPALITY_URL = baseURL + "Listados/MunicipiosPorProvincia/" + provinceSelectElement.value;

            // Reset dependent dropdowns
            municipalitySelectElement.disabled = false;
            municipalitySelectElement.innerHTML = `<option disabled selected value="">Select Municipality</option>`;
            fuelTypeSelectElement.disabled = true;
            fuelTypeSelectElement.innerHTML = `<option disabled selected value="">Select Fuel Type</option>`;
            resultsElement.innerHTML = ""; // Clear previous results

            requestMunicipalities(MUNICIPALITY_URL);
        });

    } catch (error) {
        console.error("Request error:", error.message);
    }
}

// Requests and populates municipalities dropdown
async function requestMunicipalities(url) {
    try {
        let response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Network error: ${response.statusText}`);
        }
        let data = await response.json();

        municipalitySelectElement.innerHTML = `<option disabled selected value="">Select Municipality</option>`;

        data.forEach(municipality => {
            const optionElement = document.createElement("option");
            optionElement.setAttribute("value", municipality.IDMunicipio);
            optionElement.textContent = municipality.Municipio;
            municipalitySelectElement.append(optionElement);
        });

        // Event listener for municipality selection
        municipalitySelectElement.addEventListener('change', () => {
            // Reset fuel type and results
            fuelTypeSelectElement.disabled = false;
            fuelTypeSelectElement.innerHTML = `<option disabled selected value="">Select Fuel Type</option>`;
            resultsElement.innerHTML = ""; // Clear previous results
            requestFuelType(FUEL_TYPE_URL);
        });

    } catch (error) {
        console.error("Request error:", error.message);
    }
}

// Requests and populates fuel types dropdown
async function requestFuelType(url) {
    try {
        let response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Network error: ${response.statusText}`);
        }
        let data = await response.json();

        fuelTypeSelectElement.innerHTML = `<option disabled selected value="">Select Fuel Type</option>`;

        data.forEach(fuelType => {
            const optionElement = document.createElement("option");
            optionElement.setAttribute("value", fuelType.IDProducto);
            optionElement.textContent = fuelType.NombreProducto;
            fuelTypeSelectElement.append(optionElement);
        });

        // Event listener for fuel type selection
        fuelTypeSelectElement.addEventListener('change', handleRequest);
    } catch (error) {
        console.error("Request error:", error.message);
    }
}

// Requests and displays gas stations based on current selections
async function request(url) {
    try {
        let response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Network error: ${response.statusText}`);
        }
        let data = await response.json();
        console.log(data.ListaEESSPrecio);

        // Filter gas stations if "Open Now" checkbox is checked
        let stationsToShow = data.ListaEESSPrecio;
        if (openNowCheckboxElement.checked) {
            stationsToShow = getOpenGasStations(stationsToShow);
        }

        // Clear previous results
        resultsElement.innerHTML = "";

        // Display gas stations
        stationsToShow.forEach(gasStation => {
            const gasStationElement = document.createElement("div");
            gasStationElement.classList.add("gasStation");
            gasStationElement.innerHTML = `<p>Address: ${gasStation.Dirección}</p>
                                           <p>Town: ${gasStation.Localidad}</p>
                                           <p>Province: ${gasStation.Provincia}</p>
                                           <p>Schedule: ${gasStation.Horario}</p>
                                           <p>Price: ${gasStation.PrecioProducto}€</p>`;
            resultsElement.append(gasStationElement);
        });

    } catch (error) {
        console.error("Request error:", error.message);
    }
}

// Add event listener for "Open Now" checkbox
openNowCheckboxElement.addEventListener('change', handleRequest);

// Initial provinces request
requestProvinces(PROVINCES_URL);
