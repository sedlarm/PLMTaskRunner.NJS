const fs = require('fs');
const pdf = require('wkhtmltopdf');
const temp = require('temp').track();
const plmapi = require('../plm.js');
const config = require('./config.js');
const { builtinModules } = require('module');

require('wkhtmltopdf').command = config.wkhtmltopdf.path;
require('../plm.js').config = config;

function htmlToPdf(wsId, dmsId, pdfData, callback) {
    plmapi.login(function() {
        plmapi.getDetails(wsId, dmsId, (data) => {
            console.log("Found ITEM: " + data.title);
            let values = plmapi.parseValues(data);
            let fileName = values.CISLO_FAKTURY + ".pdf";
            convertToPdf(pdfData, './upload/' + fileName, config.wkhtmltopdf.templates.faktura, (tmpFile) => {
                let stats = fs.statSync(tmpFile);
                console.log('PDF taks finished: ' + Math.round(stats.size/1024) + " KB");                    
                if (stats.size > 0 ) {
                    plmapi.uploadFile(wsId, dmsId, fileName, null, tmpFile, (result) => {
                        const pdfData = fs.readFileSync(tmpFile, {encoding: 'base64'});
                        fs.unlink(tmpFile, (err) => {
                            if (err) {
                                console.log("remove file failed: " + err.message);
                            }
                            callback(null, pdfData);
                        });
                    });
                } else {
                    callback('PDF creation failed', null);
                }
            });
        });
    });     
}

function callTransition(wsId, dmsId, transId) {
    plmapi.getTransitions(wsId, dmsId, (tdata) => {
        var transitions = plmapi.parseTransitions(tdata);
        var trans = Object.values(tdata).find(element => element.customLabel == transId);
        if (trans) {
            let comment = 'run by PLMTaskRunner service';
            console.log('Perform transition ' + trans.customLabel + ' (' + dmsId + ')');
            plmapi.performTransition(wsId, dmsId, trans.__self__, comment);
        } else {
            console.log('Error: Transition "' + trans.customLabel + '" not found');   
        }
    });
}

function sanitizeHtml(html, absoluteUrl) {
    return html.replaceAll(/(baseUrl:\s*\'|src=\"|src=\'|href=\")(\/)/g, '$1' + absoluteUrl);
}

function convertToPdf(fileData, tmpFile, pdfOptions, callback) {
    pdfOptions.debug = false;
    pdfOptions.quiet = true;
    pdfOptions.output = tmpFile;
    //causing blank first page
    //pdfOptions.enableLocalFileAccess = 'None';
    pdfOptions.loadErrorHandling = 'ignore';

    pdf(sanitizeHtml(fileData, config.plm.url), 
        pdfOptions, 
        (err, stream) => {
            if (err) console.log(err.message);
            callback(tmpFile);
    });  
}

module.exports = {htmlToPdf, callTransition, config}
