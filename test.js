
const f = require('./futurefarming/functions.js'); 
const fs = require('fs');
require('wkhtmltopdf').command = 'C:\\Program Files\\wkhtmltopdf\\bin\\wkhtmltopdf.exe';

let wsId = 274;
let dmsId = 14349;
let transId = ''; //'ODESLAT_DO_ABBRA';
const myArgs = process.argv.slice(2);


fs.readFile(myArgs[0], 'utf8', (err, data) => {
    fs.writeFileSync('./upload/test_sanitized.html', f.sanitizeHtml(data, f.config.plm.url));
    if (!err) {
        var _tmpFile = './upload/out.pdf';
        let options = {
            wsId: wsId,
            dmsId: dmsId,
            fileName: 'test.pdf',
            encoding: 'base64',
            template: {
                'marginTop'       : '0.5cm',   // default is 0, units: mm, cm, in, px
                'marginRight'     : '0.75cm',
                'marginBottom'    : '0.5cm',
                'marginLeft'      : '0.75cm',
                'encoding': 'utf-8',
                'pageSize' : 'A4', 
                'orientation': 'portrait',
            },
            htmlTemplate: "\\futurefarming\\pdftemplates\\faktura.html",
        }        
        if (options.htmlTemplate) {
            var templ = fs.readFileSync(__dirname + options.htmlTemplate, {encoding:'utf8', flag:'r'});
            data = templ.replace("%BODY%", data);
        }
        f.convertToPdf(data, _tmpFile, options.template, (tmpFile) => {
            console.log("OK");
        });
    } else {
        console.error(err.message);
    }
});