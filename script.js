
//creates the map
var map = L.map('map').setView([40.78, -73.97], 16);
map.zoomControl.setPosition("bottomright");
const markers = L.markerClusterGroup();


//uses openstreetmap's tiles
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// Different colored icons
const greenIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const yellowIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const redIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});


const greyIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const icons = {
    green: greenIcon,
    yellow: yellowIcon,
    red: redIcon,
    grey: greyIcon
};

let latestRestaurants = new Map();
let cuisines = new Map();
let selectedCuisines = new Map();
let allViolations = [];
let myChart = null;

// every marker with its color, so we can filter them
const allMarkers = [];
const visibleColors = new Set(["green", "yellow", "red", "grey"]);

//API call 
async function getInspections() {
    const url = "https://data.cityofnewyork.us/resource/43nn-pn8j.json?$select=camis,dba,boro,building,street,zipcode,latitude,longitude,cuisine_description,grade,grade_date,critical_flag,count(*)%20AS%20total&$where=grade%20IS%20NOT%20NULL%20AND%20violation_code%20IS%20NOT%20NULL&$group=camis,dba,boro,building,street,zipcode,latitude,longitude,cuisine_description,grade,grade_date,critical_flag&$order=camis%20ASC,grade_date%20DESC&$limit=1000"
    //const url = "https://data.cityofnewyork.us/resource/43nn-pn8j.json?$select=camis,dba,boro,building,street,zipcode,latitude,longitude,grade,grade_date&$where=grade IS NOT NULL&$group=camis,dba,boro,building,street,zipcode,latitude,longitude,grade,grade_date&$order=camis ASC,grade_date ASC&$limit=1000";
    let data = [];
    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        data = await response.json();

    } catch (error) {
        console.error("Failed to retrieve restaurant:", error);
    }

    data.forEach(restaurant => {
        latestRestaurants.set(restaurant.camis, restaurant);

        const cuisine = restaurant.cuisine_description;
        if (!cuisine) return;

        if (!cuisines.has(cuisine)) {
            cuisines.set(cuisine, {
                camis: new Set(),
                nonCritical: 0,
                critical: 0,
                total: 0
            });
        }

        const cuisineData = cuisines.get(cuisine);

        // Count violations
        if (restaurant.critical_flag === "Critical") {
            cuisineData.critical++;
        } else {
            cuisineData.nonCritical++;
        }

        // Count unique restaurants
        if (!cuisineData.camis.has(restaurant.camis)) {
            cuisineData.camis.add(restaurant.camis);
            cuisineData.total++;
        }
    });
    console.log(cuisines);
    console.log(Array.from(cuisines));

    let uniqueRestaurants = Array.from(latestRestaurants.values());

    //iterates through map and makes markers for the resturaunts that have coordinates 
    uniqueRestaurants.forEach(restaurant => {
        const lat = restaurant.latitude;
        const lon = restaurant.longitude;
        //checks to see if there are coords
        if (lat && lon) {
            //makes markers of different color based off rating 
            switch (restaurant.grade) {
                case "A":
                    createMarker(lat, lon, "green", restaurant.dba, restaurant.camis)
                    break;
                case "B":
                    createMarker(lat, lon, "yellow", restaurant.dba, restaurant.camis)
                    break;
                case "C":
                    createMarker(lat, lon, "red", restaurant.dba, restaurant.camis)
                    break;
                default:
                    createMarker(lat, lon, "grey", restaurant.dba, restaurant.camis)
                    break;
            }
        }

    });
    map.addLayer(markers);
    updateLegendCounts();
}

getInspections().then(() => {
    createChart();
});

//creates markers and adds to cluster
function createMarker(lat, lon, color, dba, camis) {
    let data = [];
    let marker = L.marker([lat, lon], { icon: icons[color] });
    allMarkers.push({ marker, color, name: dba.toLowerCase() });
    let oldestInspection = null;
    let recentInspection = null;

    marker.camis = camis;
    // blindPopup is what displays when hovering 
    // on click sets the info box up with required info
    marker.addTo(markers)
        .bindPopup(capitalizeWords(dba))
        .on("mouseover", function () {
            this.openPopup();
        })
        .on("click", async function () {
            console.log(this.camis);
            document.getElementById("info").style.visibility = "visible";
            let toggle = document.getElementById("amount")
            let name = document.getElementById("rName");
            allViolations = [];

            toggle.checked = false;
            //api call for all from 1 resturaunt 
            const url = "https://data.cityofnewyork.us/resource/43nn-pn8j.json?camis=" + this.camis + "&$order=inspection_date DESC";
            try {
                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error(`HTTP Error: ${response.status}`);
                }
                data = await response.json();
                console.log(data);
            } catch (error) {
                console.error("Failed to retrieve restaurant:", error);
            }

            name.innerHTML = capitalizeWords(dba);

            //iterates through the violations and makes them red if critical
            data.forEach(restaurant => {
                //sets oldest and recent to first instance of inspection date
                if (oldestInspection == null) {
                    oldestInspection = restaurant.inspection_date;
                    recentInspection = restaurant.inspection_date;
                }
                else {
                    //compares it to new dates coming in 
                    oldestInspection = Math.min(new Date(oldestInspection).getTime(), new Date(restaurant.inspection_date).getTime());
                    recentInspection = Math.max(new Date(recentInspection).getTime(), new Date(restaurant.inspection_date).getTime());
                }

                allViolations.push({
                    text: restaurant.violation_description,
                    date: restaurant.inspection_date,
                    critical: restaurant.critical_flag,
                    cuisine: restaurant.cuisine_description
                })
            })
            //displays recent first
            display(allViolations, true, recentInspection);
            //changes the display based off of switch at the bottom
            toggle.addEventListener("change", function () {
                if (toggle.checked) {
                    display(allViolations, false, recentInspection);
                }
                else {
                    display(allViolations, true, recentInspection);
                }
            });


            //displays oldest and newest inspection
            let startTime = document.getElementById("startTime");
            let endTime = document.getElementById("endTime");
            document.querySelectorAll(".timeHolder").forEach(element => {
                element.style.display = "block";
            });
            let currTime = new Date();

            //sets the dates to mm/dd/yy format 
            startTime.innerHTML = new Date(oldestInspection).toLocaleDateString("en-US");
            endTime.innerHTML = new Date(recentInspection).toLocaleDateString("en-US");
            let totalLength = document.getElementById("totalLength");

            //calculates the number of years and months from first inspection and todays date
            let years = Math.floor((currTime.getTime() - new Date(oldestInspection).getTime()) / 31536000000);
            let months = Math.floor(((currTime.getTime() - new Date(oldestInspection).getTime()) % 31536000000) / 2629800000);
            //adjust the text based off of if it should be plural or not
            let yearText = years > 1 ? (years === 1 ? years + " year " : years + " years ") : "";
            let monthText = months > 0 ? (months === 1 ? months + " month" : months + " months") : "";
            totalLength.innerHTML = "Total History: " + yearText + monthText;
        });
}

//close info tab 
document.getElementById("closeInfo").addEventListener("click", function () {
    document.getElementById("info").style.visibility = "hidden";
});

//checks to see if the marker exists
function markerExists(lat, lon) {
    return markers.getLayers().some(marker => {
        let coords = marker.getLatLng();
        return coords.lat == lat && coords.lng == lon;
    });
}

//capitalizes firstr letter of every word 
function capitalizeWords(str) {
    return str
        .toLowerCase()
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

/*displays all violations
    allViolations - array of objects 
    recent - bool to check if we just want most recent
    mostRecent -date object of latest check
*/
function display(allViolations, recent, mostRecent) {
    let total = 0;
    let totalCritical = 0;
    let violations = document.getElementById("violations");
    violations.innerHTML = "";
    allViolations.forEach(restaurant => {
        let paragraph = document.createElement("p");
        paragraph.textContent = restaurant.text;
        if (restaurant.critical == "Critical") {
            paragraph.classList.add("critical");
        }
        //if we want only recent, only add if recent
        if (recent && new Date(restaurant.date).getTime() == mostRecent) {
            violations.append(paragraph);
            //only add if there is a violation 
            if (restaurant.text != undefined) { total++; }
            if (restaurant.critical == "Critical") {
                totalCritical++;
            }
        }
        //if we don't want only recent, add everything
        else if (!recent) {
            violations.append(paragraph);
            //only add if there is a violation 
            if (restaurant.text != undefined) { total++; }
            if (restaurant.critical == "Critical") {
                totalCritical++;
            }
        }
        //displays the bottom display of violations
        let totalDisplay = document.getElementById("totalViolations");
        let totalCriticalText = document.getElementById("totalCriticalViolations");
        totalDisplay.innerHTML = "Total Violations: " + total + "&nbsp; |&nbsp;";
        totalCriticalText.innerHTML = "Critical Violations: " + totalCritical;
    })
}

//Chart logic
function createChart() {
    const ctx = document.getElementById('myChart');

    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Array.from(selectedCuisines.keys()),
            datasets: [{
                label: 'Non-Critical Violations',
                data: Array.from(selectedCuisines.values(), selectedCuisines => selectedCuisines.nonCritical),
                borderWidth: 1,
                stack: 'Stack 0',
            },
            {
                label: 'Critical Violations',
                data: Array.from(selectedCuisines.values(), selectedCuisines => selectedCuisines.critical),
                borderWidth: 1,
                stack: 'Stack 0',
            }
            ]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    stacked: true
                }
            }
        }
    });
}

function updateChart() {
    const labels = Array.from(selectedCuisines.keys());

    const nonCritical = Array.from(
        selectedCuisines.values(),
        cuisine => cuisine.nonCritical
    );

    const critical = Array.from(
        selectedCuisines.values(),
        cuisine => cuisine.critical
    );

    if (myChart) {
        // Update existing chart
        myChart.data.labels = labels;
        myChart.data.datasets[0].data = nonCritical;
        myChart.data.datasets[1].data = critical;

        myChart.update();
    } else {
        // Create chart for the first time
        const ctx = document.getElementById('myChart');

        myChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Non-Critical Violations',
                        data: nonCritical,
                        borderWidth: 1,
                        stack: 'Stack 0',
                    },
                    {
                        label: 'Critical Violations',
                        data: critical,
                        borderWidth: 1,
                        stack: 'Stack 0',
                    }
                ]
            },
            options: {
                scales: {
                    x: {
                        stacked: true
                    },
                    y: {
                        beginAtZero: true,
                        stacked: true
                    }
                }
            }
        });
    }
}

let show = true;

function showCheckboxes() {
    let checkboxes = document.getElementById("checkBoxes");
    const sortedCuisines = new Map(
        [...cuisines].sort((a, b) => a[0].localeCompare(b[0]))
    );
    document.getElementById("checkBoxes").innerHTML = "";
    sortedCuisines.forEach((value, key) => {
        const label = document.createElement("label");

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = key;
        checkbox.checked = selectedCuisines.has(key);
        checkbox.addEventListener("change", () => {
            console.log(checkbox.value, checkbox.checked);
            if (checkbox.checked) {
                selectedCuisines.set(
                    checkbox.value,
                    cuisines.get(checkbox.value)
                );
            }
            if (!checkbox.checked) {
                selectedCuisines.delete(checkbox.value);
            }
            updateChart();
        });

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(key));

        checkboxes.appendChild(label);
    });

    if (show) {
        checkboxes.style.display = "block";
        show = false;
    } else {
        checkboxes.style.display = "none";
        show = true;
    }
}

let searchText = "";
let visibleMarkers = [];

// shows only markers that match the grade filter AND the search text
function applyFilters() {
    visibleMarkers = allMarkers
        .filter(m => visibleColors.has(m.color))
        .filter(m => m.name.includes(searchText))
        .map(m => m.marker);

    markers.clearLayers();
    markers.addLayers(visibleMarkers);
    updateSearchStatus();
}

function updateLegendCounts() {
    ["green", "yellow", "red", "grey"].forEach(color => {
        const count = allMarkers.filter(m => m.color === color).length;
        document.getElementById("count-" + color).textContent = count;
    });
}

document.querySelectorAll(".legend-item").forEach(button => {
    button.addEventListener("click", () => {
        const color = button.dataset.color;

        if (visibleColors.has(color)) {
            visibleColors.delete(color);
        } else {
            visibleColors.add(color);
        }

        button.setAttribute("aria-pressed", visibleColors.has(color));
        applyFilters();
    });
});

// Search
const searchInput = document.getElementById("search");
const clearSearchBtn = document.getElementById("clearSearch");
let searchTimer;

// filters as you type
searchInput.addEventListener("input", () => {
    clearSearchBtn.hidden = searchInput.value === "";
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        searchText = searchInput.value.trim().toLowerCase();
        applyFilters();
    }, 150);
});

// Enter zooms to the results, Escape clears the search
searchInput.addEventListener("keydown", event => {
    if (event.key === "Enter") zoomToResults();
    if (event.key === "Escape") clearSearch();
});

clearSearchBtn.addEventListener("click", clearSearch);

function clearSearch() {
    clearTimeout(searchTimer);
    searchInput.value = "";
    searchText = "";
    clearSearchBtn.hidden = true;
    applyFilters();
    searchInput.focus();
}

function zoomToResults() {
    if (!searchText || visibleMarkers.length === 0) return;
    const bounds = L.latLngBounds(visibleMarkers.map(m => m.getLatLng()));
    map.flyToBounds(bounds, { padding: [60, 60], maxZoom: 17, duration: 0.8 });
}

function updateSearchStatus() {
    const status = document.getElementById("searchStatus");
    if (!searchText) {
        status.hidden = true;
        return;
    }

    const count = visibleMarkers.length;
    const query = searchInput.value.trim();
    status.hidden = false;

    if (count === 0) {
        status.textContent = visibleColors.size < 4
            ? `No matches for "${query}" with the selected grades`
            : `No restaurants match "${query}"`;
    } else {
        status.textContent = `${count} result${count === 1 ? "" : "s"} · press Enter to zoom`;
    }
}


document.getElementById("stats").addEventListener("click", function () {
    const chart = document.getElementById("chartLayout");

    if (chart.style.display === "none") {
        chart.style.display = "flex";
    } else {
        chart.style.display = "none";
    }
});