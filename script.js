var map = L.map('map').setView([40.78, -73.97], 16);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

const redIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.marker([40.714, -73.952], { icon: redIcon }).addTo(map);


//API call 

const url = "https://data.cityofnewyork.us/resource/43nn-pn8j.json?$limit=1000";
async function getInspections() {
    let total = 0;
    const response = await fetch(url);
    const data = await response.json();

    data.forEach(restaurant => {
        const lat = restaurant.latitude;
        const lon = restaurant.longitude;
        if (lat && lon) {
            if (restaurant.critical_flag == "Critical") {
                L.marker([lat, lon], { icon: redIcon }).addTo(map)
                .bindPopup(restaurant.dba);
            }
            else{
                L.marker([lat, lon]).addTo(map)
                .bindPopup(restaurant.dba);
            }
        }

    });
    console.log(data);
    console.log("Total:" + total);
}

getInspections();

