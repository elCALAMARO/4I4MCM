//Ciclo_Controllo
//DATA ULITMA MODIFICA: 15/07/16
//VERSIONE FILE: 1.0.1

var exports = module.exports = {};
var ciclo = {};

module.exports = function (ee, portapi, client, comandi_Navetta) {

const REQUEST = require('requestify');
    var idOperatore;
    var postoOperatore;
       
    function controlloFiniti()
    {
        var postoOperatore;
        var postoLavoro;

        console.log("Entrato in controllo finiti")
            //Questa sezione si occupa di gestire i pezzi finiti  [CONTROLLO PEZZI FINITI]
        REQUEST.get('http://localhost:' + portapi + '/api/pezzi').then(function (response) {
            var pezzi = response.getBody();
            var pezzof;      
            /*Ottengo posti Stoccaggio*/
        /**
         * NOTA: In questo ciclo sui pezzi se ci sono più pezzi finiti vengono rilevati correttamente ma il controllo con i posti di
         *       lavorazione (nel secondo ciclo) viene eseguito sempre sullo stesso pezzo (il primo che trova)
         * 
         */ 
        REQUEST.get('http://localhost:' + portapi + '/api/postiStoccaggio').then(function (response) {
            for ( var i = 0; i < pezzi.length; i++) {
                console.log( pezzi[i].nome + ', ' + pezzi[i].posto + ', ' + pezzi[i].stato + "I"  + i );
                    if ( pezzi[i].stato.toUpperCase() == 'FINITO' ) {
                        pezzof = pezzi[i];
                        console.log( "PEZZO FINITO : " + pezzof.posto )
                        REQUEST.get( 'http://localhost:' + portapi + '/api/postiOperatore/' + idOperatore ).then( function( response ) {
                            postoOperatore = response.getBody();                           
                            if ( postoOperatore.stato.toUpperCase() == 'LIBERO' ) {    
                                console.log("trovato posto op libero,valore di i: " + i);   //ESEGUITO SOLO UNA VOLTA CON I =2 (sbagliato)
                                REQUEST.get( 'http://localhost:' + portapi + '/api/postiLavoro/' ).then( function( response2 ) {
                                    for ( var j = 0; j < response2.getBody().length; j++ ) {
                                        console.log("p posto : " + pezzof.posto + " e response.posto: " + response2.getBody()[j].posto);                                   
                                        if ( pezzof.posto == response2.getBody()[j].posto ) {
                                            console.log( 'Trovato pezzo finito nel posto di lavoro' );
                                            postoLavoro = response2.getBody()[j];
                                            var ret = comandi_Navetta.MuoviPezzo( 'MP', pezzof.posto, postoOperatore.posto );
                                            if ( ret == false ) {
                                                return;
                                            }

                                            ee.once('ricevutoExec', function () {
                                                REQUEST.put('http://localhost:' + portapi + '/api/postiOperatore/' + postoOperatore._id + '/stato/', { stato: 'INSCARICO' }).then(function (response) {
                                                    console.log('Aggiorno stato Posto Operatore');
                                                    REQUEST.put('http://localhost:' + portapi + '/api/postiLavoro/' + postoLavoro._id + '/stato/', { stato: 'LIBERO' }).then(function (response) {
                                                        console.log('Aggiorno stato Posto Lavoro');
                                                    })
                                                })
                                            })
                                        }             
                                }                                                   
                            })                          
                        }
                    })                                              
                  }                  
                }
                controlloFinitiStoccaggio();
            })
        
        })
}

    function controlloFinitiStoccaggio() {
        REQUEST.get('http://localhost:' + portapi + '/api/pezzi').then(function (response) {
            var pezzi = response.getBody();
            var pezzo;
            var postoLavoro;
            
            console.log("Entrato in controllo pezzi finiti in stoccaggio")  
            /*Ottengo posti Stoccaggio*/
            REQUEST.get('http://localhost:' + portapi + '/api/postiStoccaggio').then(function (response) {             
                for (var i = 0; i < pezzi.length; i++) {
                    console.log(pezzi[i].nome + ', ' + pezzi[i].posto + ', ' + pezzi[i].stato);
                    if (pezzi[i].stato.toUpperCase() == 'FINITO') {
                        pezzo = pezzi[i];
                        REQUEST.get('http://localhost:' + portapi + '/api/postiOperatore/' + idOperatore).then(function (response) {
                            postoOperatore = response.getBody();
                            if (postoOperatore.stato.toUpperCase() == "LIBERO") {
                                REQUEST.get('http://localhost:' + portapi + '/api/postiStoccaggio/').then(function (response) {
                                    for (var j in response.getBody()) {
                                        console.log("pezzo.posto: " + pezzo.posto)
                                        if (pezzo.posto == response.getBody()[j].posto) {
                                            console.log('Trovato pezzo finito nello stoccaggio');
                                            var postoStoccaggio = response.getBody()[j];
                                            
                                            ee.once("ricevutoExec", function () {
                                                REQUEST.put('http://localhost:' + portapi + '/api/pezzi/' + pezzo._id + '/posto', { posto: postoOperatore.posto }).then(function (response) {
                                                    REQUEST.put('http://localhost:' + portapi + '/api/postiOperatore/' + postoOperatore._id + '/stato', { stato: 'INSCARICO' }).then(function (response) {
                                                        REQUEST.put('http://localhost:' + portapi + '/api/postiStoccaggio/' + postoStoccaggio._id + '/stato', { stato: 'LIBERO' }).then(function (response) {
                                                        })
                                                    })
                                                })
                                            })
                                            console.log("Parametri muoviepezzo :  " + postoOperatore.posto)
                                            var ret = comandi_Navetta.MuoviPezzo('MP', pezzo.posto, postoOperatore.posto)
                                            if (ret == false) {
                                                return;
                                            }
                                                    
                                        }
                                    }
                                })
                            }
                        })
                    }
                }
            })

          })
       }
    
    function portaLavoro(idPezzo, idPosto, idLavoro, tPosto) {  
        var postoLavoro;
        ee.once("ricevutoExec", function () {
            console.log('portato pezzo grezzo al posto di lavoro');
            REQUEST.put('http://localhost:' + portapi + '/api/pezzi/' + idPezzo + '/posto/', { posto: postoLavoro.posto }).then(function (response) {
                REQUEST.put('http://localhost:' + portapi + '/api/postiLavoro/' + idLavoro + '/stato/', { stato: 'OCCUPATO' }).then(function (response) {
                    REQUEST.put('http://localhost:' + portapi + '/api/pezzi/' + idPezzo + '/stato/', { stato: 'LAV' }).then(function (response) {
                        REQUEST.put('http://localhost:' + portapi + '/api/' + tPosto + '/' + idPosto + '/stato/', { stato: 'LIBERO' }).then(function (response) {
                            REQUEST.get('http://localhost:' + portapi + '/api/pezzi/' + idPezzo + '/tLav').then(function (response) {
                                var tLav = response.getBody();       //tLav=tempo lavorazione
                                tLav = tLav * 1000;
                                console.log('Attendo per ' + tLav + 'ms');
                                setTimeout(lavoro, tLav, idPezzo);
                            });
                        });
                    });
                });
            });
        })
        REQUEST.get('http://localhost:' + portapi + '/api/postiLavoro/' + idLavoro).then(function (response) {
             postoLavoro = response.getBody();
            REQUEST.get('http://localhost:' + portapi + '/api/' + tPosto + '/' + idPosto).then(function (response) {
                console.log('MP ' + response.getBody().posto + ' ' + postoLavoro.posto);
                var ret = comandi_Navetta.MuoviPezzo('MP', response.getBody().posto, postoLavoro.posto)
                if (ret == false) {
                    return;
                }
            });
        });
        return;
    }
    
    function lavoro(idPezzo) {
        REQUEST.put('http://localhost:' + portapi + '/api/pezzi/' + idPezzo + '/stato/', { stato: 'FINITO' }).then(function (response) {
            REQUEST.get('http://localhost:' + portapi + '/api/pezzi/' + idPezzo + '/nome/').then(function (response) {
                console.log('il pezzo ' + response.getBody() + ' ha finito il suo ciclo di lavoro');
            })
        })
    }
    
    function gestisciPezzi() {
        var processato = false;
        //Questa sezione gestisce i pezzi grezzi nello stoccaggio                                                                
        console.log("Entrato in gestisciPezzi")
        /*Ottieni Pezzi*/                           
        REQUEST.get('http://localhost:' + portapi + '/api/pezzi').then(function (response) {
            var pezzi = response.getBody();
            /*ottengo posti Stoccaggio*/
            REQUEST.get('http://localhost:' + portapi + '/api/postiStoccaggio').then(function (response) {
                for (var i in pezzi) {
                    for (var j in response.getBody()) {
                        if (response.getBody()[j].posto == pezzi[i].posto) {
                            var pezzo = pezzi[i];
                            var postoStoccaggio = response.getBody()[j]
                            if (pezzo.stato.toUpperCase() == 'GREZZO') {
                                REQUEST.get('http://localhost:' + portapi + '/api/postiLavoro').then(function (response) {
                                    for (var k in response.getBody()) {
                                        if (response.getBody()[k].capacita == pezzo.operazione) {
                                            if (response.getBody()[k].stato.toUpperCase() == 'LIBERO') {
                                                console.log('Trovato pezzo grezzo nello stoccaggio');
                                                portaLavoro(pezzo._id, postoStoccaggio._id, response.getBody()[k]._id, 'postiStoccaggio', idOperatore);
                                                return;
                                            }
                                            return;
                                        }
                                    }
                                    
                                })
                            }                 
                        }
                    }
                }
            })
        });
        controlloFiniti();
    }

    //Questa sezione rileva quando il posto operatore è carico, ne legge il Qrcode aggiungendo il pezzo al db e poi sembra manchi muovipezzo da operatore a uno stoccaggio
    function caricaParti() { 
        var url = 'http://localhost:' + portapi + '/api/'
        console.log("URL IN CARICAPARTI: " +url)
        /*Ottieni posto operatore*/
        REQUEST.get(url + 'postiOperatore/').then(function (response) {
            //postoOperatore = response.getBody()[0];          
            for (var i in response.getBody()) {
                if (response.getBody()[i].stato.toUpperCase() == 'CARICO') {
                    console.log("Trovato posto operatore carico, chiamo muovinavetta");
                    var ret = comandi_Navetta.MuoviNavetta('MN', response.getBody()[i].posto)
                    if (ret ==false ) {
                        console.log("ret = false")
                        break;
                    }
                    ee.once("ricevutoReady", function () {
                        ret = comandi_Navetta.OttieniDati('OD')
                        if (ret == false) {
                            console.log("ret = false dopo OD")              
                            return;
                        }
                        ee.once("inseritoNuovoPezzo", function (datiPezzo)
                    {
                    REQUEST.get(url + 'postiStoccaggio').then(function (response) {
                        var stoccaggio = response.getBody();
                        
                        for (var i in stoccaggio) {
                            if (stoccaggio[i].stato.toUpperCase() == 'LIBERO') {
                                var ret = comandi_Navetta.MuoviPezzo('MP', 1, stoccaggio[i].posto)
                                        if (ret == false) {
                                            break;
                                        }
                                var url = 'http://localhost:' + portapi + '/api/postiStoccaggio/' + stoccaggio[i]._id + '/stato';
                                var put = { stato: 'OCCUPATO' };
      
                                        ee.once('ricevutoReady', function () {
                                    comandi_Navetta.modifica_database(url, put);    // modifica stato posto stoccaggio in occupato
                                    put = { stato: 'LIBERO' };
                                    var urlPezzo = 'http://localhost:' + portapi + '/api/postiOperatore/' + idOperatore + '/stato';
                                    comandi_Navetta.modifica_database(urlPezzo, put);
                                })
                                break;
                            }
                        }

                    })
                })
              })
             }     
          }
    })
ee.emit("FinitocaricaParti");
}
               
    ciclo.cicloNominale = function cicloNominale() {
        //get idoperatore
        REQUEST.get('http://localhost:' + portapi + '/api/' + 'postiOperatore/').then(function (response) {
            console.log("Effetuata richiesta postoOperatore")
                idOperatore = response.getBody()[0]._id;
            ciclo.cicloNominale_2();
        })
    }             
                                 
        ciclo.cicloNominale_2 = function cicloNominale_2() { 
        if (comandi_Navetta.richiestaEseguibile() == true) {
            caricaParti(idOperatore);
                ee.once("FinitocaricaParti", gestisciPezzi)        
        }  
        setTimeout(cicloNominale_2, 7000);
    }
    return ciclo;
}
    
    