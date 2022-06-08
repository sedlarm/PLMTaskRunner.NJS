exports.plm = {
    clientId:       '87qnxTyaQAIEjMA7T30D9yge3B7GRmNq',
    clientSecret:   'aMrvtblmfLHvqtLM',
    tenant:         'futurefarming',
    user:           'roman.kovarik@fuxsy.eu',

    devApiUrl:      'https://developer.api.autodesk.com/',
    apiUrl:         'https://futurefarming.autodeskplm360.net/api/v3/',
    url:            'https://futurefarming.autodeskplm360.net/',
}

exports.wkhtmltopdf = {
    path:           'C:\\Program Files\\wkhtmltopdf\\bin\\wkhtmltopdf.exe',
    templates: {
        faktura: {
            'marginTop'       : '0.5cm',   // default is 0, units: mm, cm, in, px
            'marginRight'     : '0.5cm',
            'marginBottom'    : '0.5cm',
            'marginLeft'      : '0.5cm',
            'encoding': 'utf-8',
            'pageSize' : 'A4', 
            'orientation': 'portrait',
        }
    }
}

exports.api = {
    basicAuth: {
        users: { test: 'test123' },
    }
}
