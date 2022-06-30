const fs = require('fs');
const pdf = require('wkhtmltopdf');
const temp = require('temp').track();
const path = require('path');
const plmapi = require('../plm.js');
const config = require('./config.js');
const { builtinModules } = require('module');

require('wkhtmltopdf').command = config.wkhtmltopdf.path;
require('../plm.js').config = config;

function htmlToPdf(htmlData, options, callback) {
    /*
    let options = {
        wsId: wsId,
        dmsId: dmsId,
        fileName: fileName,
        encoding: 'base64',
        template: config.wkhtmltopdf.templates.faktura,
        htmlTemplate: "\\pdftemplates\\faktura.html",
    }
    */
    temp.mkdir('pdfcreator', function(err, dirPath) {
        var _tmpFile = path.join(dirPath, 'out.pdf');
        if (options.htmlTemplate) {
            var templ = fs.readFileSync(__dirname + options.htmlTemplate, {encoding:'utf8', flag:'r'});
            htmlData = templ.replace("%BODY%", htmlData);
        }
        convertToPdf(htmlData, _tmpFile, options.template, (tmpFile) => {
            let stats = fs.statSync(tmpFile);
            fs.copyFileSync(tmpFile, __dirname + '/../upload/out.pdf');
            console.log('PDF taks finished: ' + Math.round(stats.size/1024) + " KB");                    
            if (stats.size > 0 ) {
                addPDFAttachment(options.wsId, options.dmsId, options.fileName, tmpFile, () => {
                    const pdfData = fs.readFileSync(tmpFile, {encoding: options.encoding});
                    fs.unlink(tmpFile, (err) => {
                        if (err) {
                            console.error("remove file failed: " + err.message);
                        }
                        callback(null, pdfData);
                    });
                });
            } else {
                callback('PDF creation failed', null);
            }
        });
    });
}

function addPDFAttachment(wsId, dmsId, fileName, tmpFile, callback) {
    plmapi.login(function() {
        plmapi.uploadFile(wsId, dmsId, fileName, null, tmpFile, async function(fileData) {
            console.log('Upload to PLM finished, FileId: ', fileData.id);

            callback();
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
    var sanitized = sanitizeHtml(fileData, config.plm.url);
    fs.writeFileSync(__dirname + '/../upload/sanitized.html', sanitized);

    pdf(sanitizeHtml(sanitized, config.plm.url), 
        pdfOptions, 
        (err, stream) => {
            if (err) console.log(err.message);
            callback(tmpFile);
    });  
}

module.exports = {htmlToPdf, callTransition, convertToPdf, sanitizeHtml, config}
