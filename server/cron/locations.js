const dotenv = require('dotenv').config().parsed;
const { models } = require('../models');
const axios = require('axios');

const esi = axios.create({
    baseURL: 'https://esi.evetech.net',
});

async function requestStructure(id, location_id, access, refresh) {
    let structures;
    try {
        structures = await esi.get('/v2/universe/structures/'+location_id+'/',{
            headers: {
                Authorization: 'Bearer '+access
            }
        })
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
            structures = await esi.get('/v2/universe/structures/'+location_id+'/',{
                headers: {
                    Authorization: 'Bearer '+character.accessToken
                }
            });
        }
    }
    return structures.data;
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
                            type_id: result.type_id.toString(),
                            name: result.name.toString(),
                            corp: corp.toString(),
                            alli: alli.toString()
                        })
                        structure.update({
                            system: system.toString(),
                            type_id: result.type_id.toString(),
                            name: result.name.toString(),
                            corp: corp.toString(),
                            alli: alli.toString()
                        });
                    } catch (error) {
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