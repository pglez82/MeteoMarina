/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
var meteouk = angular.module('MeteoUKApi', []);

meteouk.service('MeteoUKService',['$q','XMLRetrieverService',function ($q,XMLRetrieverService) {
    api_key_uk='15988fef-19e2-4e31-b624-0c96315aa00b';
    baseUrl_uk = 'http://datapoint.metoffice.gov.uk/public/data/image/wxfcs/surfacepressure/gif';
    url_text_pred_uk = 'http://www.metoffice.gov.uk/public/data/CoreProductCache/ShippingForecast/Latest';
    this.GetSurfaceFC = function()
    {
        //We don't need a promise because the maps are simple urls
        var times=[0,12,24,36,48,60,72,84];
        var urls = [];
        for (var i=0;i<times.length;i++)
            urls.push({'id':i,'url':baseUrl_uk+'?key='+api_key_uk+'&timestep='+times[i]});
        return urls;
    };
    
    //This only works for the south biscay zone
    this.GetPrediccionTexto = function(provincia)
    {
        return $q(function(resolve, reject) {
            if (provincia === 'Asturias' || provincia === 'Cantabria' || provincia === 'Bizkaia' || provincia === 'Gipuzkoa')
            {
                XMLRetrieverService.GetXML(url_text_pred_uk).success(function (response) {
                    ptexto=[];
                    ptexto.fecha=response.report.issue._date;
                    ptexto.hora=response.report.issue._time;
                    ptexto.general=response.report["general-synopsis"]["gs-text"];
                    ptexto.estadomar=response.report["area-forecasts"]["area-forecast"][5].seastate;
                    ptexto.visibilidad=response.report["area-forecasts"]["area-forecast"][5].visibility;
                    ptexto.tiempo=response.report["area-forecasts"]["area-forecast"][5].weather;
                    ptexto.viento=response.report["area-forecasts"]["area-forecast"][5].wind;
                    resolve(ptexto);
                });
            }
            else
                resolve("");
        });
    };
}]);
