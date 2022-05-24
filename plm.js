const axios = require('axios');
const fs = require('fs');
const { isObject } = require('util');
const { isStringObject } = require('util/types');

module.exports = {

login: function(callback) {
    console.log("> PLM: DEV Authentication");
    
    let url = module.exports.config.plm.devApiUrl + 'authentication/v1/authenticate';

    let params = new URLSearchParams();
    params.append('client_id', module.exports.config.plm.clientId);
    params.append('client_secret', module.exports.config.plm.clientSecret);
    params.append('grant_type', 'client_credentials'); 
    params.append('scope', 'data:read');

    axios.post(url, params.toString()).then(function (response) {
        
        if (response.status == 200) {
            axios.defaults.headers.common['Conent-Type']    = "application/json";
            axios.defaults.headers.common['Accept']         = "application/json";
            axios.defaults.headers.common['X-user-id']      = module.exports.config.plm.user;
            axios.defaults.headers.common['X-Tenant']       = module.exports.config.plm.tenant;
            axios.defaults.headers.common['Authorization']  = "Bearer " + response.data.access_token;
                
            console.log('Login to tenant ' + module.exports.config.plm.tenant + ' successful');
            callback();
        } else {
            console.log('LOGIN FAILED');
            console.log(response.error);
        }

    }).catch(function (error) {

        console.log('LOGIN FAILED');
        console.log(error);

    });    
},

getDetails: function(wsId, dmsId, callback) {
    console.log("> PLM: GET item details"); 
    
    let url = module.exports.config.plm.apiUrl + "workspaces/" + wsId + "/items/" + dmsId;
    
    axios.get(url).then(function (response) {
        callback(response.data);
    }).catch(function (error) {
        console.log(error);
    });
    
},

getDetailsGrid: function(wsId, dmsId, callback) {
    console.log("> PLM: GET item GRID details"); 
    
    let url = module.exports.config.plm.apiUrl + "workspaces/" + wsId + "/items/" + dmsId + '/views/13/rows';
    
    axios.get(url).then(function (response) {
        console.log(response.data.rows.length + " grid rows");
        callback(response.data.rows);
    }).catch(function (error) {
        console.log(error);
    });
    
},

uploadFile: function(wsId, dmsId, fileName, folder, srcFile) {
    console.log("> PLM: Getting list of attachments");

    let url = module.exports.config.plm.apiUrl + 'workspaces/' + wsId + '/items/' + dmsId + '/attachments?asc=name';

    axios.get(url, {
        headers : {
            'Accept' : 'application/vnd.autodesk.plm.attachments.bulk+json'
        }
    }).then(function (response) {
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
        
        if(fileId !== '') {
            module.exports.createVersion(wsId, dmsId, fileName, folderId, fileId, srcFile);
        } else if(folderId === '') {
            let folderId = createFileFolder(wsId, dmsId, folder);
            module.exports.createFile(wsId, dmsId, {'id': folderId}, fileName, srcFile);
        } else {
            module.exports.createFile(wsId, dmsId, null, fileName, srcFile);
        }
    }).catch(function (error) {
        console.log(error.message);
    });
},

createFileFolder: function(wsId, dmsId, folder) {
    console.log(' > PLM: Creating folder ' + folder);
        
    let url = module.exports.config.plm.apiUrl + 'workspaces/' + wsId + '/items/' + dmsId + '/folders';
    
    axios.post(url, {
        'folderName' : folder 
    }).then(function (response) {
        
        let location    = response.headers.location;
        let temp        = location.split('/');
        let folderId    = temp[temp.length - 1];
        
        return folderId;

    }).catch(function (error) {
        console.log(error.message);
    }); 
    
},

createFile: function(wsId, dmsId, folderId, fileName, srcFile) {
    
    console.log(' > PLM: Creating file record');
    
    let stats   = fs.statSync(srcFile);
    let url     = module.exports.config.plm.apiUrl + 'workspaces/' + wsId + '/items/' + dmsId + '/attachments';
       
    axios.post(url, {
        'description'   : fileName,
        'name'          : fileName,
        'resourceName'  : fileName,
        'folder'        : folderId,
        'size'          : stats.size
    }).then(function (response) {
        module.exports.prepareUpload(response.data, function() {
            module.exports.uploadLocalFile(fileName, response.data, srcFile, function(fileId) {
                module.exports.setAttachmentStatus(wsId, dmsId, fileId);
            });          
        });
    }).catch(function (error) {
        console.log(error.message);
    });    
},

prepareUpload: function(fileData, callback) {
    console.log('> PLM: Preparing file upload to S3');

    axios({
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
    }).then(function (response) {
        callback();
    }).catch(function (error) {
        console.log(error.message);
    }); 
    
},

uploadLocalFile: function(fileName, fileData, srcFile, callback) {
    console.log('> PLM: Uploading file now');
    
    let authorization = axios.defaults.headers.common['Authorization'];

    delete axios.defaults.headers.common['Authorization'];
    
    axios.put(fileData.url, fs.readFileSync(srcFile),{
        headers : fileData.extraHeaders
    }).then(function (response) {
        axios.defaults.headers.common['Authorization'] = authorization;
        callback(fileData.id);
    }).catch(function (error) {
        console.log(error);
        console.log(error.message);
    }); 
    
}, 

setAttachmentStatus: function(wsId, dmsId, fileId) {
    console.log('> PLM: Setting attachment status');
    
    let url = module.exports.config.plm.apiUrl + 'workspaces/' + wsId + '/items/' + dmsId + '/attachments/' + fileId;
    
    axios.patch(url, {
        status : {
            'name' : 'CheckIn'
        }
    }).catch(function (error) {
        console.log(error.message);
    }); 
    
},

createVersion: function(wsId, dmsId, fileName, folderId, fileId, srcFile) {
    console.log('> PLM: Creating new version as file exists already');
    
    let stats   = fs.statSync(srcFile);
    let url     = module.exports.config.plm.apiUrl + 'workspaces/' + wsId + '/items/' + dmsId + '/attachments/' + fileId;
    
    axios.post(url, {
        'description'   : fileName,
        'fileName'      : fileName,
        'name'          : fileName,
        'resourceName'  : fileName,
        'folder'        : folderId,
        'fileTypeString': 'file/type',
        'size'          : stats.size
    }).then(function (response) {
        module.exports.prepareUpload(response.data, function() {
            module.exports.uploadLocalFile(fileName, response.data, srcFile, function(fileId) {
                module.exports.setAttachmentStatus(wsId, dmsId, fileId);
            });
        });
    }).catch(function (error) {
        console.log(error.message);
    });    
    
},

getTransitions: function(wsId, dmsId, callback) {
    console.log('> PLM: Listing available transitions');
    
    let url = module.exports.config.plm.apiUrl + 'workspaces/' + wsId + '/items/' + dmsId + '/workflows/1/transitions';
    console.log(url);
    
    axios.get(url, {}).then(function (response) {
        callback(response.data);
    }).catch(function (error) {
        console.log(error.message);
    });    
},

transition: function(wsId, dmsId, transId, step, comment) {
    console.log('> PLM: Transition transition');

    let url = module.exports.config.plm.apiUrl + 'workspaces/' + wsId + '/items/' + dmsId + '/workflows/1/transitions/' + transId;

    axios.put(url, {
        'workflowStep': step, 
        'workflowComments': comment
    }).catch(function (error) {
        console.log(error.message);
    });      

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