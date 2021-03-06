const dotenv = require('dotenv').config().parsed;
const { models } = require('../models');
const axios = require('axios');

const esi = axios.create({
    baseURL: 'https://esi.evetech.net',
});

async function requestAssets(id, access, refresh, page=1) {
    let assets;
    try {
        assets = await esi.get('/v5/characters/'+id+'/assets/?page='+page,{
            headers: {
                Authorization: 'Bearer '+access
            }
        });
        return {
            assets: assets.data,
            pages: assets.headers['x-pages']
        };
    } catch (error) {
        // Access token expired, refresh
        if (error.response.status == 403) {
            let refreshRequest = await esi.post('https://login.eveonline.com/v2/oauth/token',
            {
                grant_type: 'refresh_token',
                refresh_token: refresh
            },
            {
                headers: {
                    Authorization: 'Basic '+Buffer.from(dotenv.ESI_CLIENT_ID + ':' + dotenv.ESI_CLIENT_SECRET).toString('base64')
                }
            })
            character = await models.character.findOne({
                where: {
                    id: id
                }
            });
            character = await character.update({
                accessToken: refreshRequest.data.access_token,
                refreshToken: refreshRequest.data.refresh_token
            });
            try {
                assets = await esi.get('/v5/characters/'+id+'/assets/?page='+page,{
                    headers: {
                        Authorization: 'Bearer '+character.accessToken
                    }
                });
                return {
                    assets: assets.data,
                    pages: assets.headers['x-pages']
                };
            } catch (errorTwo) {
                if (errorTwo.response.status == 500) {
                    if (errorTwo.response.data.error.includes('Requested page does not exist')){
                        return false;
                    }
                }
                throw errorTwo;
            }
        } else if(error.response.status == 500) {
            if (error.response.data.error.includes('Requested page does not exist')) {
                return false;
            }
        }
        throw error;
    }
}

async function process() {
    let characters = await models.character.findAll()
    for (let i = 0; i < characters.length; i++) {
        const element = characters[i];
        let totalAssets = [];
        let assets;
        let page = 1;
        let maxPage = 2;
        do {
            try {
                assetsObject = await requestAssets(element.id,element.accessToken,element.refreshToken, page);
            } catch (error) {
                console.log(error);
            }
            if (assetsObject.assets.length) {
                totalAssets = totalAssets.concat(assetsObject.assets);
                maxPage = assetsObject.pages;
                page++;
            }
        } while (page < maxPage)
        let locations = [];
        for (let j = 0; j < totalAssets.length; j++) {
            const asset = totalAssets[j];
            if (asset.location_flag !== "Hangar") {
                continue;
            }
            if (!(locations.includes(asset.location_id))) {
                locations.push(asset.location_id);
            }
        }
        let knownLocations = await models.structure.findAll({
            where: {
                character_id: element.id
            }
        });
        let simplifiedKnownLocation = [];
        for (let l = 0; l < knownLocations.length; l++) {
            const knownLocation = knownLocations[l];
            simplifiedKnownLocation.push(knownLocation.location_id)
        }
        for (let k = 0; k < locations.length; k++) {
            const location = locations[k];
            if (simplifiedKnownLocation.includes(location.toString())) {
                let index = simplifiedKnownLocation.indexOf(location.toString());
                simplifiedKnownLocation.splice(index,1);
            } else {
                let name = '';
                let system = '';
                let region = '';
                let corp = '';
                let alli = '';
                let type_id = '';
                if (parseInt(location) < 1000000000000) {
                    let station = await esi.get('/v2/universe/stations/'+location.toString()+'/');
                    name = station.data.name;
                    type_id = station.data.type_id;
                    let systemData = await esi.get('/v4/universe/systems/'+station.data.system_id+'/');
                    system = systemData.data.name;
                    let constData = await esi.get('/v1/universe/constellations/'+systemData.data.constellation_id+'/');
                    let regionData = await esi.get('/v1/universe/regions/'+constData.data.region_id+'/');
                    region = regionData.data.name;
                    let corporation = await esi.get('/v4/corporations/'+station.data.owner+'/');
                    corp = corporation.data.name;
                    if (corporation.data.alliance_id) {
                        let alliance = await esi.get('/v4/alliances/'+corporation.data.alliance_id+'/');
                        alli = alliance.data.name;
                    }
                }
                await models.structure.create({
                    location_id: location.toString(),
                    character_id: element.id.toString(),
                    system: system.toString(),
                    region: region.toString(),
                    type_id: type_id.toString(),
                    name: name.toString(),
                    corp: corp.toString(),
                    alli: alli.toString(),
                    vulnerability: ''
                });
            }
        }
        for (let m = 0; m < simplifiedKnownLocation.length; m++) {
            const loc = simplifiedKnownLocation[m];
            models.structure.destroy({
                where: {
                    location_id: loc,
                    character_id: element.id.toString()
                }
            })
        }
    }
}

process();