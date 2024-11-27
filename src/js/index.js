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


// Filters gas stations that are currently open based on their schedule

function getOpenGasStations(stations) {
    // Get current date and time
    const now = new Date();
    const currentDay = now.getDay(); // 0 (Sunday) to 6 (Saturday)
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Convert current time to minutes for easier comparison
    const currentTimeInMinutes = currentHour * 60 + currentMinute;


    // Converts various time formats to minutes
    function parseTimeToMinutes(timeStr) {
        // Remove spaces and convert to lowercase
        timeStr = timeStr.trim().toLowerCase();

        // Handle 24-hour format
        if (timeStr === '24h') return { start: 0, end: 1440 };

        // Handle formats like "06:00-23:00"
        const rangeMatch = timeStr.match(/^(\d{1,2}):?(\d{2})?-(\d{1,2}):?(\d{2})?$/);
        if (rangeMatch) {
            const startHour = parseInt(rangeMatch[1], 10);
            const startMinute = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : 0;
            const endHour = parseInt(rangeMatch[3], 10);
            const endMinute = rangeMatch[4] ? parseInt(rangeMatch[4], 10) : 0;

            return {
                start: startHour * 60 + startMinute,
                end: endHour * 60 + endMinute
            };
        }

        // Handle formats without separators: "0600-2300"
        const noSeparatorMatch = timeStr.match(/^(\d{2})(\d{2})-(\d{2})(\d{2})$/);
        if (noSeparatorMatch) {
            const startHour = parseInt(noSeparatorMatch[1], 10);
            const startMinute = parseInt(noSeparatorMatch[2], 10);
            const endHour = parseInt(noSeparatorMatch[3], 10);
            const endMinute = parseInt(noSeparatorMatch[4], 10);

            return {
                start: startHour * 60 + startMinute,
                end: endHour * 60 + endMinute
            };
        }

        // If format is not recognized, return null
        return null;
    }


    //Checks if a given day is included in the day pattern
    function isDayIncluded(dayPattern, currentDay) {
        const dayMappings = {
            'l': [1],
            'm': [2],
            'x': [3],
            'j': [4],
            'v': [5],
            's': [6],
            'd': [0],
            'l-v': [1, 2, 3, 4, 5],
            'l-d': [0, 1, 2, 3, 4, 5, 6]
        };

        dayPattern = dayPattern.toLowerCase();
        const daysToCheck = dayMappings[dayPattern] || [];
        return daysToCheck.includes(currentDay);
    }

    // Filter gas stations
    const openStations = stations.filter(station => {
        const horario = station.Horario.toLowerCase();

        // Split multiple schedules
        const schedules = horario.split(';').map(s => s.trim());

        for (let schedule of schedules) {
            // Separate days and hours
            const [dayPart, timePart] = schedule.split(':').map(s => s.trim());

            // Check if current day is in the schedule
            if (isDayIncluded(dayPart, currentDay)) {
                // Parse hours
                const timeRange = parseTimeToMinutes(timePart);

                // If time can be parsed, check if it's within the range
                if (timeRange) {
                    // Handle schedules within the same day
                    if (timeRange.start <= timeRange.end) {
                        if (currentTimeInMinutes >= timeRange.start &&
                            currentTimeInMinutes <= timeRange.end) {
                            return true;
                        }
                    } else {
                        // Handle schedules crossing midnight (e.g., 22:00-06:00)
                        if (currentTimeInMinutes >= timeRange.start ||
                            currentTimeInMinutes <= timeRange.end) {
                            return true;
                        }
                    }
                }
            }
        }

        return false;
    });

    return openStations;
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
                                           <p>Price: ${gasStation.PrecioProducto}</p>`;
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