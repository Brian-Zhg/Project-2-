
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

    //iterates through api call 
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
    let marker = L.marker([lat, lon], { icon: icons[color] });

    marker.camis = camis;

    marker.addTo(markers)
        .bindPopup(capitalizeWords(dba))
        .on("mouseover", function () {
            this.openPopup();
        })
        .on("click", async function () {
            console.log(this.camis);

            let name = document.getElementById("rName");
            const url = "https://data.cityofnewyork.us/resource/43nn-pn8j.json?camis=" + this.camis;
            try {
                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error(`HTTP Error: ${response.status}`);
                }

                const data = await response.json();

                console.log(data);

            } catch (error) {
                console.error("Failed to retrieve restaurant:", error);
            }
            name.innerHTML = capitalizeWords(dba);
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