const dotenv = require('dotenv').config().parsed;
const { models } = require('../models');
const axios = require('axios');

const esi = axios.create({
    baseURL: 'https://esi.evetech.net',
});
let esiErrorLimit = 100
let esiErrorReset = 60

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

async function requestStructure(id, location_id, access, refresh) {
    if (esiErrorLimit <= 5) {
        await sleep((esiErrorReset*1000));
    }
    let structures;
    try {
        structures = await esi.get('/v2/universe/structures/'+location_id+'/',{
            headers: {
                Authorization: 'Bearer '+access
            }
        });
        esiErrorLimit = parseInt(structures.headers["x-esi-error-limit-remain"]);
        esiErrorReset = parseInt(structures.headers["x-esi-error-limit-reset"]);
        return structures.data;
    } catch (error) {
        esiErrorLimit = parseInt(error.response.headers["x-esi-error-limit-remain"]);
        esiErrorReset = parseInt(error.response.headers["x-esi-error-limit-reset"]);
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
                structures = await esi.get('/v2/universe/structures/'+location_id+'/',{
                    headers: {
                        Authorization: 'Bearer '+character.accessToken
                    }
                });
                esiErrorLimit = parseInt(structures.headers["x-esi-error-limit-remain"]);
                esiErrorReset = parseInt(structures.headers["x-esi-error-limit-reset"]);
                return structures.data;
            } catch (error) {
                esiErrorLimit = parseInt(error.response.headers["x-esi-error-limit-remain"]);
                esiErrorReset = parseInt(error.response.headers["x-esi-error-limit-reset"]);
                throw error;
            }
        } else {
            throw error;
        }
    }
}

async function process() {
    let structures = await models.structure.findAll();
    for (let i = 0; i < structures.length; i++) {
        const structure = structures[i];
        if (parseInt(structure.location_id) > 1000000000000) {
            let location = await models.location.findOne({where: {location_id: structure.location_id}});
            if (!location) {
                let characters = await models.character.findAll();
                for (let j = 0; j < characters.length; j++) {
                    const character = characters[j];
                    try {
                        let result = await requestStructure(character.id,structure.location_id,character.accessToken,character.refreshToken);
                        let systemInfo = await esi.get('/v4/universe/systems/'+result.solar_system_id+'/');
                        let system = systemInfo.data.name;
                        let constData = await esi.get('/v1/universe/constellations/'+systemInfo.data.constellation_id+'/');
                        let regionData = await esi.get('/v1/universe/regions/'+constData.data.region_id+'/');
                        let region = regionData.data.name;
                        let corpInfo = await esi.get('/v4/corporations/'+result.owner_id+'/');
                        let corp = corpInfo.data.ticker;
                        let alli = '';
                        if (corpInfo.data.alliance_id) {
                            let alliInfo = await esi.get('/v4/alliances/'+corpInfo.data.alliance_id+'/');
                            alli = alliInfo.data.name
                        }
                        await models.location.create({
                            location_id: structure.location_id.toString(),
                            system: system.toString(),
                            region: region.toString(),
                            type_id: result.type_id.toString(),
                            name: result.name.toString(),
                            corp: corp.toString(),
                            alli: alli.toString()
                        })
                        structure.update({
                            system: system.toString(),
                            region: region.toString(),
                            type_id: result.type_id.toString(),
                            name: result.name.toString(),
                            corp: corp.toString(),
                            alli: alli.toString()
                        });
                        break;
                    } catch (error) {
                        if (typeof error.response !== 'undefined') {
                            console.log('Requesting '+structure.location_id+' for character '+character.name+' returned '+error.response.status)
                        } else {
                            console.log(error);
                        }
                        continue;
                    }
                    
                }
            } else {
                structure.update({
                    system: location.system,
                    type_id: location.type_id,
                    name: location.name,
                    corp: location.corp,
                    alli: location.alli
                });
            }
        }
    }
}

process();