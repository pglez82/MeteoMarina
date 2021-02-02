//Aplicación con sus dependencias
var app = angular.module('meteo', ['ui.bootstrap', 'ngRoute', 'ngAnimate', 'ngGeolocation','ngStorage','AemetApi','MeteoUKApi','MeteoFranceApi','ngMap','chart.js','ngPinchZoom']);

/*
 * Servicio para obtener la localización. La obtiene con HTML5 y luego usa
 * el servicio de geocoder de google para sacar la provincia.
 */
app.service('LocationService',['$geolocation','$q',function($geolocation,$q){
    this.GetProvincia = function ()
    {
        //Devolvemos una prosime porque es una llamada asincrona. Tenemos que 
        //llamar a resolve y a reject según el caso.
        return $q(function (resolve, reject) {
            $geolocation.getCurrentPosition({
                timeout: 60000
            }).then(function (position) {
                geocoder = new google.maps.Geocoder();
                latlng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
                geocoder.geocode({'latLng': latlng}, function (results, status) {
                    if (status === google.maps.GeocoderStatus.OK) {
                        if (results[1]) {
                            for (var i = 0; i < results[0].address_components.length; i++) {
                                for (var b = 0; b < results[0].address_components[i].types.length; b++) {
                                    if (results[0].address_components[i].types[b] === "administrative_area_level_2") {
                                        resolve(results[0].address_components[i].long_name);
                                        break;
                                    }
                                }
                            }
                        } else {
                            reject('Location not found');
                        }
                    } else {
                        reject('Geocoder failed due to: ' + status);
                    }
                });
            }
            );
        });
    };
}]);

/*
 * Establecemos la navegación entre las páginas. Todo está basado en el index. 
 * El resto de páginas se cargan sobre ella sin transicción. Se puede observar
 * como se pasan parámetros de una página a otra cuando hay un submit en un form.
 */
app.config(['$routeProvider',
    function ($routeProvider) {
        $routeProvider.
                when('/entrada', {
                    templateUrl: 'entrada.html'
                }).
                when('/prediccion/:zonaSel/:soloTexto', {
                    templateUrl: 'prediccion.html'
                }).
                when('/prediccion/:indexLocal', {
                    templateUrl: 'prediccion.html'
                }).
                otherwise({
                    redirectTo: '/entrada'
                });

    }]);

/**
 * Controlador que sirve para manejar la pantalla de entrada. Muestra las zonas de navegación (zonasNavegacion)
 * y también implementa la función de buscar con el GPS la localización.
 * @param {type} param1
 * @param {type} param2
 */
app.controller('EntradaController', ['zonasNavegacion', '$scope', 'LocationService','$localStorage', function (zonasNavegacion, $scope, LocationService,$localStorage) {
        $scope.zonaSel = "";
        $scope.soloTexto = false;
        this.zonasNavegacion = zonasNavegacion;

        //Establecemos esta función en el scope para que pueda ser llamada por 
        //el botón GPS
        $scope.GetPosicion = function () {
            LocationService.GetProvincia().then(function (string) {
                $scope.zonaSel = string;
            });
        };
        
        //Cargamos el último sitio seleccionado
        $scope.zonaSel = $localStorage.zonaSel;
        
        //Cargamos lo que el usuario haya salvado
        $scope.predicciones = $localStorage.predicciones;
        
 
    }]);

/**
 * Controlador para manejar la pantalla de predicción.
 */
app.controller('PrediccionController', ['$scope','$routeParams', '$filter', 'AemetService','MeteoUKService','MeteoFranceService','zonasNavegacion','$localStorage','NgMap',"$sce", function ($scope, $routeParams, $filter, AemetService,MeteoUKService,MeteoFranceService,zonasNavegacion,$localStorage,NgMap,$sce) {
        $scope.googleMapsUrl="https://maps.googleapis.com/maps/api/js?libraries=places&key=AIzaSyAeOa6EGipSyLGQYfrevnsQ80DpsNPwQc0";
        
        if ($routeParams.indexLocal)
        {
            $scope.pred = $localStorage.predicciones[$routeParams.indexLocal];
            $scope.datosSalvados = true;
            return;
        }
        var pred = this;
        $scope.dialogoAbierto = false;
        $localStorage.zonaSel = $routeParams.zonaSel;
        pred.provincia = $routeParams.zonaSel;
        pred.soloTexto = $routeParams.soloTexto;
        pred.zonasNavegacion = zonasNavegacion;
        pred.lat = pred.zonasNavegacion[pred.provincia].latlon[0];
        pred.lon = pred.zonasNavegacion[pred.provincia].latlon[1];
        pred.timestamp = new Date();

        pred.prediccionMar = {nombreZona: "", textoSituacion: "", tendencia:{},predicciones: [], timestamp:{}};
        pred.tempMar = null;
        pred.prediccionesProvincia = [];
        pred.datosestacion = {};

        corregirMayusculas = function(str) {
            return str.replace(/.+?[\.\?\!](\s|$)/g, function (txt) {
                return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            });
        }
        
        parseLocalTime = function(str) {
            var d = new Date();
            return new Date(new Date(str).getTime()+(d.getTimezoneOffset()*60000));
        };

        
        
        
        AemetService.GetPrediccionMaritima(pred.provincia).success(function(response)
        {
            pred.prediccionMar.aviso  = corregirMayusculas(response.root.aviso.texto);
            pred.prediccionMar.textoSituacion = response.root.situacion.texto;
            pred.prediccionMar.timestamp = {
                "inicio": parseLocalTime(response.root.origen.inicio),
                "fin" : parseLocalTime(response.root.origen.fin),
                "elaborado" : parseLocalTime(response.root.origen.elaborado)
            };
            pred.prediccionMar.tendencia.timestamp = {
                "elaborado": null,
                "inicio": parseLocalTime(response.root.tendencia.inicio),
                "fin": parseLocalTime(response.root.tendencia.fin)
            };
            pred.prediccionMar.tendencia.texto = corregirMayusculas(response.root.tendencia.texto);
            for (i = 0; i < response.root.prediccion.zona.length; i++)
            {
                if (response.root.prediccion.zona[i]._nombre.indexOf(pred.provincia) > -1)
                {
                    if (response.root.prediccion.zona[i].subzona.constructor === Array)
                    {
                        for (j = 0; j < response.root.prediccion.zona[i].subzona.length; j++) {
                            pred.prediccionMar.predicciones.push({nombre: response.root.prediccion.zona[i].subzona[j]._nombre,
                                texto: corregirMayusculas(response.root.prediccion.zona[i].subzona[j].texto)});
                        }
                    }
                    else
                        pred.prediccionMar.predicciones.push({nombre: response.root.prediccion.zona[i].subzona._nombre,
                            texto: corregirMayusculas(response.root.prediccion.zona[i].subzona.texto)});
                }
            }
        });
        
        
        
        pred.estaciones = AemetService.GetEstacionesProvincia(pred.provincia);
        NgMap.getMap().then(function(map) {
            pred.map = map;
          });
        $scope.MostrarDatosEstacion = function(event,estacion)
        {
            pred.datosestacion = {};
            AemetService.GetDatosEstacion(estacion).then(function(response)
            {
                pred.datosestacion.lat = response.data[0].lat;
                pred.datosestacion.lon = response.data[0].lon;
                pred.datosestacion.vv=[];
                pred.datosestacion.vv.push([]);
                pred.datosestacion.vv.push([]);
                pred.datosestacion.horas=[];
                pred.datosestacion.series = ['Velocidad viento (nudos)', 'Dirección viento (grados)'];
                for (var i=0;i<response.data.length;i++)
                {
                    //Obtenemos la velocidad media del viento. Está en m/s la pasamos a nudos
                    pred.datosestacion.vv[0].push(response.data[i].vv*3.6/1.852);
                    //Obtenemos la dirección del viento en grados
                    pred.datosestacion.vv[1].push(response.data[i].dv);
                    pred.datosestacion.horas.push(new Date(response.data[i].fint));
                }
                pred.datosestacion.datasetOverride = [{ yAxisID: 'y-axis-1' }, { yAxisID: 'y-axis-2' }];
                pred.datosestacion.opciones = {
                     scales: {
                        yAxes: [
                         {id: 'y-axis-1',type: 'linear',display: true,position: 'left'},
                         {id: 'y-axis-2',type: 'linear',display: true,position: 'right',ticks: {min: 0,max: 360}}
                       ],
                         xAxes: [{type: 'time',ticks: {maxRotation: 90}
                 }]}};
                 });
                pred.map.showInfoWindow('bar',estacion); 
        };
        
        //Función que obtiene la prediccion de una provincia para una fecha
        //determinada
        this.ProccessPrediccionProvincia = function(fecha,info){
            AemetService.GetPrediccionProvincia(pred.provincia,fecha).
                success(function (response) {
                    pred.prediccionesProvincia.push({"texto": response.root.prediccion.txt_prediccion.p,
                        "elaborado": parseLocalTime(response.root.elaborado),
                        "timestamp": {
                            "elaborado":parseLocalTime(response.root.elaborado),
                            "inicio":parseLocalTime(response.root.validez_ini),
                            "fin": parseLocalTime(response.root.validez_fin),
                        },
                        "tempCiudades": response.root.prediccion.ciudad,
                        "info": info,
                        "tempCollapsed": true});
                });
        };
        
        hoy = new Date();
        manana = new Date();
        manana.setDate(hoy.getDate() + 1);
        s = $filter('date')(hoy, "yyyy-MM-dd");
        s2 = $filter('date')(manana, "yyyy-MM-dd");
        //Obtenemos la información de la provincia para hoy y mañana
        this.ProccessPrediccionProvincia(s,"hoy");
        this.ProccessPrediccionProvincia(s2,"mañana");
        
        pred.otrasPredicciones = [];
        //MetOffice uk text prediction
        MeteoUKService.GetPrediccionTexto(pred.provincia).then(function(response)
        {
           pred.otrasPredicciones.meteouk = response;
        });
        
        MeteoFranceService.GetPrediccionTexto(pred.provincia).then(function(response)
        {
            pred.otrasPredicciones.meteofrance=[];
            pred.otrasPredicciones.meteofrance.boletin=$sce.trustAsHtml(response.boletin);
            pred.otrasPredicciones.meteofrance.hora=$sce.trustAsHtml(response.hora);
        });
        
        if (pred.soloTexto==="false")
        {
            pred.mapaFrentes = MeteoUKService.GetSurfaceFC();
            AemetService.GetMapasPrediccionMar(pred.provincia).then(function(response)
            {
                pred.mapasMar = response;
            });
            AemetService.GetMapsSignificativos(pred.provincia).then(function(response)
            {
                pred.mapasSig = response.datos;
            });
            AemetService.GetTempAgua().success(function(response)
            {
                pred.tempMar = response.datos;
            });
        }
                
        $scope.GuardarPrediccion = function()
        {
            if ($localStorage.predicciones)
            {
                $localStorage.predicciones.push(pred);
            }
            else
            {
                $localStorage.predicciones = [];
                $localStorage.predicciones.push(pred);
            }
            $scope.datosSalvados = true;
            $scope.dialogoAbierto = true;
        };
    }]);

app.directive('situacionActual', function () {
    return{
        restrict: 'E',
        templateUrl: 'situacion-actual.html'
    };
});

app.directive('prediccionMar', function () {
    return{
        restrict: 'E',
        templateUrl: 'prediccion-mar.html'
    };
});

app.directive('otrasPred', function () {
    return{
        restrict: 'E',
        templateUrl: 'otras-predicciones.html'
    };
});

app.directive('prediccionProvincia', function () {
    return{
        restrict: 'E',
        templateUrl: 'prediccion-provincia.html'
    };
});

app.directive('imprimirTimestamp', function() {
    return {
        restrict: 'E',
        scope: { timestamp: '=' },
        templateUrl: 'imprimir-timestamp.html'
    };
});

app.directive('prediccionesSalvadas', function () {
    return{
        restrict: 'E',
        templateUrl: 'predicciones-salvadas.html'
    };
});

app.directive('datosObservacion', function () {
    return{
        restrict: 'E',
        templateUrl: 'datos-observacion.html'
    };
});