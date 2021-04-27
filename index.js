//---------- Initializations & intro message -------------
//global initializations
let arrayOfMarkers = []
let map
let lang = "english"
let located = {} 
let longitude
let latitude
let pharmaciesOnDuty

// DOM elements
const mapSector = document.getElementById("smap")
const locations = document.getElementById("location-selection")
const mapPosition = document.getElementById("map")
const languages = document.getElementById("language-selector")
const introParagraph = document.getElementById("intro-message")
const aboutPage = document.getElementById("about-page")
const popUp = document.getElementById("pop-up")
popUp.classList.add("display-empty")
locations.classList.add("display-empty")
mapSector.classList.add("loading")

//Intro animation message
function getIntroMessage() {
    introParagraph.classList.add("display-empty") 
}
setTimeout(getIntroMessage,3000)
//-----------------------------------------------------------


//---------------- Functionalities-APIS ----------------------

//Geologation WEB-API
if (navigator.geolocation) {
    function success(position) {
        longitude = position.coords.longitude;
        latitude = position.coords.latitude;
        showOnMap(longitude,latitude);  
    }

    function failure(response) {
        console.log("Geolocation Failed", response);
    }
    //navigator.geolocation.watchPosition( success, failure );  //this creates new map every time I change my Position-needs to be fixed
    navigator.geolocation.getCurrentPosition(success , failure);
}
else {
    mapSector.innerHTML = "Please enable your geolocation"
}

//Fetch pharmacies on duty by Dimitri's API 
fetch('https://pkakelas.com/pharmacies')
  .then(response => response.json())
  .then(data => {
        pharmaciesOnDuty = data.Pharmacies
        console.log(pharmaciesOnDuty)
    })
  .catch(error => console.log(error))


//event listener for displaying markers based on location
locations.addEventListener("change", (e)=> {
    let located = {
        municipality: document.getElementById("location-selection").options[e.target.value].text,
        geocMunicipality: document.getElementById("location-selection").options[e.target.value].id
    }
    let filteredPharmacies = pharmaciesOnDuty.filter(pharm => (pharm.municipality === located.municipality))
    filteredPharmacies.forEach(pharmacy=> pharmacy.municipality = located.geocMunicipality.replace("-", " "))  //necessary to change to right geocoding coordinates the greek name
       
    if (filteredPharmacies.length <= 2) {
        filteredPharmacies.forEach((pharmacy)=> {
            geocode(pharmacy)
            let pharmTable = document.createElement("div")
            pharmTable.innerHTML = `${JSON.stringify(pharmacy.municipality)}: ${JSON.stringify(pharmacy.address)} - ${JSON.stringify(pharmacy.brand)} - ${JSON.stringify(pharmacy.schedule)}`
            pharmTable.style.cssText="text-align:center; margin: 0 auto;border: 1px solid black;border-radius: 5px; background-color: transparent; width: 60%;margin-top: 5px"
            mapSector.appendChild(pharmTable)
        }) 
    } 
    else {
        filteredPharmacies.forEach((pharmacy,idx)=> {
            getMarkers(pharmacy,idx)  //setTimeout browser problem?
            let pharmTable = document.createElement("div")
            pharmTable.innerHTML = `${JSON.stringify(pharmacy.municipality)}: ${JSON.stringify(pharmacy.address)} - ${JSON.stringify(pharmacy.brand)} - ${JSON.stringify(pharmacy.schedule)}`
            pharmTable.style.cssText="text-align:center; margin: 0 auto;border: 1px solid black;border-radius: 5px; background-color: transparent; width: 60%;margin-top: 5px"
            mapSector.appendChild(pharmTable)
        }) 
    }   
})
    

//Forward Geocoding - Convert addresses of pharmacies on duty to longitude-latitude 
function geocode(pharmacies) {
    const URL = `https://geocode.xyz/${pharmacies.address},${pharmacies.municipality},GR?json=1`
    fetch(URL)
    .then(response=> response.json())
    .then(data=> {
        arrayOfMarkers.push({longt: data.longt,lat:data.latt})
        console.log("array",arrayOfMarkers)
        makeMarker(map,arrayOfMarkers[arrayOfMarkers.length-1].longt,arrayOfMarkers[arrayOfMarkers.length-1].lat, 0.05, './images/open_s1g.png',pharmacies)
        
    })  
}
const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms))
}

async function getMarkers(pharmacies,idx) {
    await sleep((idx+1)*2000)
    geocode(pharmacies)
}

//show Map
function showOnMap(longitude,latitude) {
    mapSector.classList.remove("loading")
    locations.classList.remove("display-empty")
    locations.classList.add("locations")
    mapPosition.classList.add("map")
    popUp.classList.remove("display-empty")
    popUp.classList.add("pops")
    map = new ol.Map({
        target: 'map',
        layers: [
            new ol.layer.Tile({
            source: new ol.source.OSM()
            })
        ],
        view: new ol.View({
            center: ol.proj.fromLonLat([longitude, latitude]),
            zoom: 10
        })
    })

    //Marker of me (my geolocation)
    let me = {
        brand: "",
        schedule: "",
        phone: "",
        address: "My position",
        municipality: ":)"
    }
    makeMarker(map,longitude, latitude, 0.05,'./images/personMarker.png',me) 
    
    //pop up of markers
    const overlayContainer = document.getElementById("pop-up")
    const overlayLayer = new ol.Overlay ({
        element: overlayContainer
    }) 
    map.addOverlay(overlayLayer)


    const overlayName =  document.getElementById('feature-name')
    const overlaySchedule = document.getElementById("feature-schedule")
    const overlayPhone = document.getElementById("feature-phone")
    const overlayLocation = document.getElementById("feature-address")

    map.on('click',(e)=> {
        overlayLayer.setPosition(undefined)
        map.forEachFeatureAtPixel(e.pixel,function(feature) {
            let clickedCoordinate = e.coordinate
            let clickedFeatureName = feature.get('name')
            let clickedFeatureSchedule = feature.get('schedule')
            let clickedFeaturePhone = feature.get('phone')
            let clickedFeatureAddress = feature.get('address')
            let clickedFeatureMunicipality = feature.get('municipality')
            overlayLayer.setPosition(clickedCoordinate)
            overlayName.innerHTML = `<span class="pop-titles">Brand </span>: ${clickedFeatureName}`  //why not working ${clickedFeatureName ? clickedFeatureName : "-"}`
            overlaySchedule.innerHTML = `<span class="pop-titles">Open</span>: ${clickedFeatureSchedule}`
            overlayPhone.innerHTML = `<span class="pop-titles">Phone</span>: ${clickedFeaturePhone}`
            overlayLocation.innerHTML = `<span class="pop-titles">Location</span>: ${clickedFeatureAddress} (${clickedFeatureMunicipality})`
        })
    })
    return map
}

//create markers 
function makeMarker(mapLocal, long, lat , scaleOption, imgPath, pharmacies) {
    let marker = new ol.layer.Vector({
        source: new ol.source.Vector({
            features: [
                new ol.Feature({
                    geometry: new ol.geom.Point(ol.proj.fromLonLat([long, lat])),
                    municipality: `${pharmacies.municipality}`,
                    address: `${pharmacies.address}`,
                    name: `${pharmacies.brand}`,
                    phone: `${pharmacies.phone}`,
                    schedule: `${pharmacies.schedule}`
                })
            ]
        })
    })

    marker.setStyle(
        new ol.style.Style({
            image: new ol.style.Icon({
                anchor: [0.5, 0.5],
                scale: scaleOption,
                src: imgPath
            })
        })
    )
    
    mapLocal.addLayer(marker)

    return marker
}

//-----------------------------------------------------


// ------------About section -------------------------
languages.addEventListener("change",(e)=> {
    lang = e.target.value
    showAbout()
})
aboutPage.addEventListener("click",()=> {showAbout()})


function showAbout() {

    const rmvBtn = document.createElement("button")
    rmvBtn.innerHTML = "Close"
    rmvBtn.style.cssText = "font-family: 'Pacifico',cursive,sans-serif;border: none; background-color: transparent;color: rgb(85, 146, 252); float: right;"
    
    if (lang === "english") {
        introParagraph.innerHTML = "Get Pharmacies is an app that helps you find the pharmacy on duty you need"
        introParagraph.appendChild(rmvBtn)
        introParagraph.classList.remove("display-empty")
    } else {
        introParagraph.innerHTML = "Το Get Pharmacies είναι μια εφαρμογή η οποία σε βοηθάει να βρίσκεις εφημερεύοντα φαρμακεία"
        introParagraph.appendChild(rmvBtn)
        introParagraph.classList.remove("display-empty")
    }
   
    rmvBtn.addEventListener("click",()=> {
        introParagraph.classList.add("display-empty")
        introParagraph.removeChild(rmvBtn)
    })
}