
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


//API call 
const url = "https://data.cityofnewyork.us/resource/43nn-pn8j.json?$select=camis,dba,boro,building,street,zipcode,latitude,longitude,grade,grade_date&$where=grade IS NOT NULL&$group=camis,dba,boro,building,street,zipcode,latitude,longitude,grade,grade_date&$limit=1000";
async function getInspections() {
    let total = 0;
    const response = await fetch(url);
    const data = await response.json();

    data.forEach(restaurant => {
        const lat = restaurant.latitude;
        const lon = restaurant.longitude;
        //checks to see if there are coords
        if (lat && lon) {
            switch (restaurant.grade) {
                case "A":
                    L.marker([lat, lon], { icon: greenIcon }).addTo(markers)
                        .bindPopup(restaurant.dba);
                    break;
                case "B":
                    L.marker([lat, lon], { icon: yellowIcon }).addTo(markers)
                    .bindPopup(restaurant.dba);
                    break;
                case "C":
                    L.marker([lat, lon], { icon: redIcon }).addTo(markers)
                    .bindPopup(restaurant.dba);
                    break;
                default:
                    L.marker([lat, lon], { icon: greyIcon }).addTo(markers)
                    .bindPopup(restaurant.dba);
                    break;
            }
        }

    });
    map.addLayer(markers);
    console.log(data);
    console.log("Total:" + total);
}

getInspections();

