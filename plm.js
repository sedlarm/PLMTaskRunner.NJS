const axios = require('axios');
const fs = require('fs');
const { isObject } = require('util');
const { isStringObject } = require('util/types');

module.exports = {

login: async (callback) => {
    console.log("> PLM: DEV Authentication");
    
    try {
        let url = module.exports.config.plm.devApiUrl + 'authentication/v1/authenticate';

        let params = new URLSearchParams();
        params.append('client_id', module.exports.config.plm.clientId);
        params.append('client_secret', module.exports.config.plm.clientSecret);
        params.append('grant_type', 'client_credentials'); 
        params.append('scope', 'data:read');
    
        const response = await axios.post(url, params.toString());
        
        if (response.status == 200) {
            axios.defaults.headers.common['Conent-Type']    = "application/json";
            axios.defaults.headers.common['Accept']         = "application/json";
            axios.defaults.headers.common['X-user-id']      = module.exports.config.plm.user;
            axios.defaults.headers.common['X-Tenant']       = module.exports.config.plm.tenant;
            axios.defaults.headers.common['Authorization']  = "Bearer " + response.data.access_token;
                
            callback();
        } else {
            throw new Error('LOGIN FAILED');
            console.log(response.error);
        }

    } catch (error) {
        console.log('LOGIN FAILED', error.message);

    }    
},

getDetails: async(wsId, dmsId, callback) => {
    console.log("> PLM: GET item details"); 

    try {     
        let url = module.exports.config.plm.apiUrl + "workspaces/" + wsId + "/items/" + dmsId;
        
        const response = await axios.get(url);

        callback(response.data);
    } catch (error) {
        console.log(error.message);
    };
},

getDetailsGrid: async(wsId, dmsId, callback) => {
    console.log("> PLM: GET item GRID details"); 
    
    try {
        let url = module.exports.config.plm.apiUrl + "workspaces/" + wsId + "/items/" + dmsId + '/views/13/rows';
        
        const response = await axios.get(url);

        callback(response.data.rows);
    } catch (error) {
        console.log(error.message);
    }
},

uploadFile: async(wsId, dmsId, fileName, folder, srcFile, callback) => {
    console.log("> PLM: Getting list of attachments");

    try {
        let url = module.exports.config.plm.apiUrl + 'workspaces/' + wsId + '/items/' + dmsId + '/attachments?asc=name';

        const response = await axios.get(url, {
            headers : {
                'Accept' : 'application/vnd.autodesk.plm.attachments.bulk+json'
            }
        });

        let folderId    =  null;
        let fileId      = '';

        if(response.status === 200) {
            for(attachment of response.data.attachments) {
                if(attachment.name === fileName) {
                    fileId = attachment.id;
                } 
                if(attachment.folder !== null) {
                    if(attachment.folder.name === folder) {
                        folderId = { id : attachment.folder.id };
                    }
                }
            }
        }
        await module.exports.uploadFileInt(wsId, dmsId, fileName, folderId, fileId, srcFile);

	callback();

    } catch (error) {
        console.log(error.message);
    }
},

uploadFileInt: async(wsId, dmsId, fileName, folderId, fileId, srcFile) => {
    if(fileId !== '') {
        await module.exports.createVersion(wsId, dmsId, fileName, folderId, fileId, srcFile);
    } else if(folderId === '') {
        let folderId = await createFileFolder(wsId, dmsId, folder);
        await module.exports.createFile(wsId, dmsId, {'id': folderId}, fileName, srcFile);
    } else {
        await module.exports.createFile(wsId, dmsId, null, fileName, srcFile);
    }
},

createFileFolder: async(wsId, dmsId, folder) => {
    console.log('> PLM: Creating folder ' + folder);
        
    try {
        let url = module.exports.config.plm.apiUrl + 'workspaces/' + wsId + '/items/' + dmsId + '/folders';
    
        const response = await axios.post(url, {
            'folderName' : folder 
        });
        
        let location    = response.headers.location;
        let temp        = location.split('/');
        let folderId    = temp[temp.length - 1];
        
        return folderId;
    } catch (error) {
        console.log(error.message);
        return null;
    }
},

createFile: async(wsId, dmsId, folderId, fileName, srcFile) => {
    console.log('> PLM: Creating file record');

    try {
        let stats   = await fs.statSync(srcFile);
        let url     = module.exports.config.plm.apiUrl + 'workspaces/' + wsId + '/items/' + dmsId + '/attachments';
        
        const response = await axios.post(url, {
            'description'   : fileName,
            'name'          : fileName,
            'resourceName'  : fileName,
            'folder'        : folderId,
            'size'          : stats.size
        })
        await module.exports.processFile(wsId, dmsId, fileName, srcFile, response.data);
    } catch (error) {
        console.log(error.message);
    }    
},

prepareUpload: async(fileData, callback) => {
    console.log('> PLM: Preparing file upload to S3');

    try {
        const respons = await axios({
            method  : 'options',
            url     :  fileData.url, 
            headers : {
                'Accept'            : '*/*',
                'Accept-Encoding'   : 'gzip, deflate, br',
                'Accept-Language'   : 'en-US,en;q=0.9,de;q=0.8,en-GB;q=0.7',
                'Access-Control-Request-Headers': 'content-type,x-amz-meta-filename',
                'Access-Control-Request-Method' : 'PUT',
                'Host'              : 'plm360-aws-useast.s3.amazonaws.com',
                'Origin'            : 'https://' + module.exports.config.plm.tenant + '.autodeskplm360.net',
                'Sec-Fetch-Mode'    : 'cors',
                'Sec-Fetch-Site'    : 'cross-site'
            }
        });

        callback();
    } catch (error) {
        console.log(error.message);
    }
},

uploadLocalFile: async(fileName, fileData, srcFile, callback) => {
    console.log('> PLM: Uploading file now');
    
    try {
        let authorization = axios.defaults.headers.common['Authorization'];

        delete axios.defaults.headers.common['Authorization'];
        
        await axios.put(fileData.url, fs.readFileSync(srcFile),{
            headers : fileData.extraHeaders
        });

        axios.defaults.headers.common['Authorization'] = authorization;
        
        callback(fileData.id);
    } catch (error) {
        console.log(error.message);
    }
    
}, 

setAttachmentStatus: async(wsId, dmsId, fileId) => {
    console.log('> PLM: Setting attachment status');
    
    try {
        let url = module.exports.config.plm.apiUrl + 'workspaces/' + wsId + '/items/' + dmsId + '/attachments/' + fileId;
        
        await axios.patch(url, {
            status : {
                'name' : 'CheckIn'
            }
        });
    } catch (error) {
        console.log(error.message);
    }
},

createVersion: async(wsId, dmsId, fileName, folderId, fileId, srcFile) => {
    console.log('> PLM: Creating new version as file exists already');
    
    try {
        let stats   = fs.statSync(srcFile);
        let url     = module.exports.config.plm.apiUrl + 'workspaces/' + wsId + '/items/' + dmsId + '/attachments/' + fileId;
        
        const response = await axios.post(url, {
            'description'   : fileName,
            'fileName'      : fileName,
            'name'          : fileName,
            'resourceName'  : fileName,
            'folder'        : folderId,
            'fileTypeString': 'file/type',
            'size'          : stats.size
        });
        await module.exports.processFile(wsId, dmsId, fileName, srcFile, response.data);
    } catch (error) {
        console.log(error.message);
    } 
},

processFile: async(wsId, dmsId, fileName, srcFile, fileData) => {
    await module.exports.prepareUpload(fileData, async function() {
        await module.exports.uploadLocalFile(fileName, fileData, srcFile, async function(fileId) {
            await module.exports.setAttachmentStatus(wsId, dmsId, fileId);
        });
    });
},

getTransitions: async(wsId, dmsId, callback) => {
    console.log('> PLM: Listing available transitions');
    
    try {
        let url = module.exports.config.plm.apiUrl + 'workspaces/' + wsId + '/items/' + dmsId + '/workflows/1/transitions';
        
        const response = await axios.get(url, {});

        callback(response.data);
    } catch (error) {
        console.log(error.message);
    }
},

performTransition: async(wsId, dmsId, link, comment) => {
    console.log('> PLM: Transition transition');

    try {
        let url = module.exports.config.plm.apiUrl + 'workspaces/' + wsId + '/items/' + dmsId + '/workflows/1/transitions';

        await axios.post(url, {
            'comment': comment
            }, {
            headers : {
                'content-location' : link
            }
        });
    } catch (error) {
        console.log(error.message);
    }
},

parseTransitions: function(data) {
    var transitions = {};
    for (var i in data) {
        var trans = data[i];
        console.log('Trans: ' + trans.customLabel + '[' + trans.urn + ']');
        transitions[trans.customLabel] = trans;
    }
    return transitions;
},

parseValues: function(data) {
    const values = {}
    for(section of data.sections) {
        for(field of section.fields) {
            let fieldParams = field.urn.split(".");
            let fieldName = fieldParams[fieldParams.length - 1];

            values[fieldName] = module.exports.parseValueInt(field.value);
        }
    } 
    return values;   
},

parseGridValues: function(data) {
    const rows = Array();
    for(row of data) {
        const values = {}
        for(field of row.rowData) {
            let fieldParams = field.urn.split(".");
            let fieldName = fieldParams[fieldParams.length - 1];

            values[fieldName] = module.exports.parseValueInt(field.value);
        }
        rows.push(values);
    } 
    return rows;   
},

parseValueInt: function(fieldValue) {
    let value = '';

    if(fieldValue !== null) {
        if(typeof fieldValue === "object") value = fieldValue.title;
        else {
            value = fieldValue;
            if(typeof value === 'string') {
                value = value.replace(/&lt;/g, '<');
                value = value.replace(/&gt;/g, '>');
            }
        }
    }
    return value;
}
}