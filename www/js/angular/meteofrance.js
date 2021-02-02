/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
var meteofrance = angular.module('MeteoFranceApi', []);



meteofrance.service('MeteoFranceService',['$http','$q',function ($http,$q) {
    url_text_pred_mf = 'http://www.vigimeteo.com/data/VBFR01_LFPW_.txt?'+(+new Date);
    url_date = "http://www.vigimeteo.com/data/VDFR01_LFPW_.txt?"+(+new Date);
    
    //This only works for the south biscay zone
    this.GetPrediccionTexto = function(provincia)
    {
        return $q(function(resolve, reject) {
            if (provincia === 'Asturias' || provincia === 'Cantabria' || provincia === 'Bizkaia' || provincia === 'Gipuzkoa')
            {
                $http.get(url_text_pred_mf).then(function (response) {
                    phtml=[];
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(response.data,'text/html');
                    var cant=doc.getElementById('cantabrico');
                    //Remove h2 element with title
                    cant.removeChild(cant.childNodes[1]);
                    //Get the date for the bulletin
                    $http.get(url_date).then(function(response2) {
                        var doc2 = parser.parseFromString(response2.data,'text/html');
                        phtml.hora = doc2.firstChild.innerHTML;
                        phtml.boletin = cant.innerHTML;
                        resolve(phtml);
                    });
                    
                });
            }
            else
                resolve("");
        });
    };
}]);