
//creates the map
var map = L.map('map').setView([40.78, -73.97], 16);
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

//API call 
async function getInspections() {
    const url = "https://data.cityofnewyork.us/resource/43nn-pn8j.json?$select=camis,dba,boro,building,street,zipcode,latitude,longitude,grade,grade_date&$where=grade IS NOT NULL&$group=camis,dba,boro,building,street,zipcode,latitude,longitude,grade,grade_date&$limit=1000";
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
    });

    let uniqueRestaurants = Array.from(latestRestaurants.values());
    console.log(uniqueRestaurants);

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
}

getInspections();

//creates markers and adds to cluster
function createMarker(lat, lon, color, dba, camis) {
    let data = [];
    let marker = L.marker([lat, lon], { icon: icons[color] });
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
            let total = 0;
            let numCritical = 0;
            let name = document.getElementById("rName");
            let violations = document.getElementById("violations")
            //api call for all from 1 resturaunt 
            const url = "https://data.cityofnewyork.us/resource/43nn-pn8j.json?camis=" + this.camis;
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
            violations.innerHTML = "";
            //iterates through the violations and makes them red if critical
            data.forEach(restaurant => {
                let paragraph = document.createElement("p");
                if (restaurant.critical_flag == "Critical") {
                    paragraph.classList.add("critical");
                    numCritical++;
                }
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
                total++;
                paragraph.textContent = restaurant.violation_description;
                violations.append(paragraph);
            })

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
            let years = (currTime.getTime() - new Date(oldestInspection).getTime())/31536000000;
            let months = Math.round(((currTime.getTime() - new Date (oldestInspection).getTime())%31536000000) / 2629800000);
            //adjust the text based off of if it should be plural or not
            let yearText = years > 1 ? (years === 1 ? years+" year " : years+" years ") : "";
            let monthText = months > 0 ? (months === 1 ? months+ " month" : months+ " months") : "";
            totalLength.innerHTML = "Total History: " + yearText + monthText;


            //displays the bottom display of violations
            let totalDisplay = document.getElementById("totalViolations");
            let totalCritical = document.getElementById("totalCriticalViolations");
            totalDisplay.innerHTML = "Total Violations: " + total + "&nbsp; |&nbsp;";
            totalCritical.innerHTML = "Critical Violations: " + numCritical;
        });
}

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