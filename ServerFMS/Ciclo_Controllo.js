//Ciclo_Controllo
//DATA ULITMA MODIFICA: 12/07/16
//VERSIONE FILE: 1.0.0

/* MODIFICHE EFFETTUATE:

*/

var exports = module.exports = {};
var ciclo = {};


module.exports = function (ee) {
    /* Modifiche da Effettuare:
1_Aggiornare i valori di statoRichiesta
2_Togliere i 3 timer e utilizzarne solo uno
3_Sostituire le tre funzioni attendi con una sola 
4_Aggiornare statoRichiesta nella funzione Muovipezzo, cancellare i timeout e aggiungere l'unico timeout da utilizzare 
5_Cambiare il codice di evento data con i nuovi valori di statoRichiesta
*/

const REQUEST = require('requestify')
   
    
    /*
Valori di statoRichiesta:
0 = Ready
1 = Busy
2 = Ack
3 = Exec
4 = Error
*/
var statoRichiesta = 0;
    
    
    function portaLavoro(port, idPezzo, idPosto, idLavoro, tPosto, idOperatore) {       //tPosto = Ottieni Posto
        REQUEST.get('http://localhost:' + port + '/api/postiLavoro/' + idLavoro).then(function (response) {
            var postoLavoro = response.getBody();
            REQUEST.get('http://localhost:' + port + '/api/' + tPosto + '/' + idPosto).then(function (response) {
                console.log('MP ' + response.getBody().posto + ' ' + postoLavoro.posto);
                var res = MuoviPezzo('MP', response.getBody().posto, postoLavoro.posto);
                if (res == 0) {
                    console.log('portato pezzo grezzo al posto di lavoro');
                    REQUEST.put('http://localhost:' + port + '/api/pezzi/' + idPezzo + '/posto/', { posto: postoLavoro.posto }).then(function (response) {
                        REQUEST.put('http://localhost:' + port + '/api/postiLavoro/' + idLavoro + '/stato/', { stato: 'OCCUPATO' }).then(function (response) {
                            REQUEST.put('http://localhost:' + port + '/api/pezzi/' + idPezzo + '/stato/', { stato: 'LAV' }).then(function (response) {
                                REQUEST.put('http://localhost:' + port + '/api/' + tPosto + '/' + idPosto + '/stato/', { stato: 'LIBERO' }).then(function (response) {
                                    REQUEST.get('http://localhost:' + port + '/api/pezzi/' + idPezzo + '/tLav').then(function (response) {
                                        var tLav = response.getBody();       //tLav=tempo lavorazione
                                        tLav = tLav * 1000;
                                        console.log('Attendo per ' + tLav + 'ms');
                                        setTimeout(lavoro, tLav, port, idPezzo, idOperatore);
                                    });
                                });
                            });
                        });
                    });
                }
            });
        });
    }
    
    function lavoro(port, idPezzo, idOperatore) {
        REQUEST.put('http://localhost:' + port + '/api/pezzi/' + idPezzo + '/stato/', { stato: 'FINITO' }).then(function (response) {
            REQUEST.get('http://localhost:' + port + '/api/pezzi/' + idPezzo + '/nome/').then(function (response) {
                //ee.emit('Logga', 'Cicli', 'Lo Stato del Pezzo ' + response.getBody() + ' è stato modificato in FINITO');
                console.log('il pezzo ' + response.getBody() + ' ha finito il suo ciclo di lavoro');
                gestisciPezzi(port, idOperatore);
            })
        })
    }
    
    function gestisciPezzi(port, idOperatore) {
        /*Ottieni Pezzi*/
        REQUEST.get('http://localhost:' + port + '/api/pezzi').then(function (response) {
            var pezzi = response.getBody();
            /*ottengo posti Stoccaggio*/
            REQUEST.get('http://localhost:' + port + '/api/postiStoccaggio').then(function (response) {
                for (var i in pezzi) {
                    for (var j in response.getBody()) {
                        console.log(pezzi[i].nome + ', ' + pezzi[i].posto + ', ' + pezzi[i].stato);
                        console.log(response.getBody()[j].posto + ', ' + response.getBody()[j].stato);
                        if (response.getBody()[j].posto == pezzi[i].posto) {
                            var pezzo = pezzi[i];
                            var postoStoccaggio = response.getBody()[j]
                            if (pezzo.stato.toUpperCase() == 'GREZZO') {
                                REQUEST.get('http://localhost:' + port + '/api/postiLavoro').then(function (response) {
                                    for (var k in response.getBody()) {
                                        if (response.getBody()[k].capacita == pezzo.operazione) {
                                            if (response.getBody()[k].stato.toUpperCase() == 'LIBERO') {
                                                console.log('Trovato pezzo grezzo nello stoccaggio');
                                                portaLavoro(port, pezzo._id, postoStoccaggio._id, response.getBody()[k]._id, 'postiStoccaggio', idOperatore);
                                            }
                                        }
                                    }
                                })
                            }
                        }
                    }
                }
            })
        })
        REQUEST.get('http://localhost:' + port + '/api/pezzi').then(function (response) {
            var pezzi = response.getBody();
            /*Ottengo posti Stoccaggio*/
            REQUEST.get('http://localhost:' + port + '/api/postiStoccaggio').then(function (response) {
                var i = 0;
                for (var i in pezzi) {
                    console.log(pezzi[i].nome + ', ' + pezzi[i].posto + ', ' + pezzi[i].stato);
                    if (pezzi[i].stato.toUpperCase() == 'FINITO') {
                        var pezzo = pezzi[i];
                        REQUEST.get('http://localhost:' + port + '/api/postiOperatore/' + idOperatore).then(function (response) {
                            var postoOperatore = response.getBody();
                            if (response.getBody().stato.toUpperCase() == 'LIBERO') {
                                REQUEST.get('http://localhost:' + port + '/api/postiLavoro/').then(function (response) {
                                    for (var j in response.getBody()) {
                                        if (pezzo.posto == response.getBody()[j].posto) {
                                            console.log('Trovato pezzo finito nel posto di lavoro');
                                            var postoLavoro = response.getBody()[j];
                                            
                                            res = MuoviPezzo('MP', pezzo.posto, postoOperatore.posto);
                                            if (res == 0) {
                                                REQUEST.put('http://localhost:' + port + '/api/pezzi/' + pezzo._id + '/posto/', { posto: postoOperatore.posto }).then(function (response) {
                                                    console.log('Aggiorno posto Pezzo');
                                                    REQUEST.put('http://localhost:' + port + '/api/postiOperatore/' + postoOperatore._id + '/stato/', { stato: 'INSCARICO' }).then(function (response) {
                                                        console.log('Aggiorno stato Posto Operatore');
                                                        REQUEST.put('http://localhost:' + port + '/api/postiLavoro/' + postoLavoro._id + '/stato/', { stato: 'LIBERO' }).then(function (response) {
                                                            console.log('Aggiorno stato Posto Lavoro');
                                                        })
                                                    })
                                                })
                                            }
                                            
                                            REQUEST.get('http://localhost:' + port + '/api/postiStoccaggio/').then(function (response) {
                                                for (var j in response.getBody()) {
                                                    if (pezzi[i].posto == response.getBody()[j].posto) {
                                                        console.log('Trovato pezzo finito nello stoccaggio');
                                                        var postoStoccaggio = response.getBody()[j];
                                                        
                                                        var res = MuoviPezzo('MP', pezzo.posto, postoOperatore.posto);

                                                    }
                                                    if (res == 0) {
                                                        REQUEST.put('http://localhost:' + port + '/api/pezzi/' + pezzo._id + '/posto', { posto: postoOperatore.posto }).then(function (response) {
                                                            REQUEST.put('http://localhost:' + port + '/api/postiOperatore/' + postoOperatore._id + '/stato', { stato: 'INSCARICO' }).then(function (response) {
                                                                REQUEST.put('http://localhost:' + port + '/api/postiStoccaggio/' + postoStoccaggio._id + '/stato', { stato: 'LIBERO' }).then(function (response) {
                                                                })
                                                            })
                                                        })
                                                    }
                                                }
                                            })
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
    
    function caricaParti(port) {
        var url = 'http://localhost:' + port + '/api/'
        /*Ottieni posto operatore*/
        REQUEST.get(url + 'postiOperatore/').then(function (response) {
            for (var i in response.getBody()) {
                if (response.getBody()[i].stato.toUpperCase() == 'CARICO') {
                    MuoviNavetta('MN', response.getBody()[i].posto);
                    /* variabile posticcia (b. agg. Provvisorio, che si può rimuovere rapidamente: una parete p.;
                 un ponte, un palco posticcio. c. agg. In senso fig., artificioso, ambiguo, falso: una vita p.;
                 atteggiamenti, sentimenti posticci.) che simula il risultato di OttieniDati */
                var datiPezzo = {
                        nome: 'p1',
                        tLav: 10,
                        operazione: 1,
                        posto: response.getBody()[i].posto,
                        stato: 'GREZZO'
                    }
                    var operazione = datiPezzo.operazione;
                    REQUEST.post(url + 'pezzi', datiPezzo).then(function (response) {
                        REQUEST.get(url + 'postiLavoro').then((response) => {
                            var flag = false;
                            for (var i in response.getBody()) {
                                if (response.getBody()[i].stato == 'LIBERO') {
                                    flag = true;
                                }
                            }
                            /* Ci sarebbe da rifare una get sui pezzi e
                        controllare quale pezzo ha lo stesso nome di datiPezzo*/
                        var oggetto = {
                                flag: flag

                            };
                            return oggetto;
                        })
                })
            }
}
})
}

function cicloNominale(port) {
    //var url = 'http://localhost:.' + port + '/api/'
    //var risultatoFunzione = caricaParti(port)
    //if (caricaParti(port)) {
    //} else {
    //    REQUEST.get(url + 'postiOperatore/').then(function (response) {
    //        for (var i in response.getBody()) {
    //            if (response.getBody()[i].stato.toUpperCase() == 'CARICO') {
    //                gestisciPezzi(port, response.getBody[i]._id);
    //            }
    //        }
    //    })
    //}
    
    gestisciPezzi(port, '5773d8ebc2a8ae7010560672');
    setTimeout(cicloNominale, 2000, port);
}

var timeOut; var timeOut2; var timeOut3;
contaRichieste = 0

function MuoviPezzo(comando, vet1, vet2) {
    if (statoRichiesta != 0) {
        return 1;
    }
    statoRichiesta = 1;
    /* Aggiungo il numero di richiesta alla stringa inserita da console */
    client.write(contaRichieste + ',' + comando + ',' + vet1 + ',' + vet2 + '\n');
    var mex = contaRichieste + ',' + comando + ',' + vet1 + ',' + vet2;
    /* Inizializzo un timeout, dopo 5 secondi senza ricevere risposta, verrà restituito un messaggio di fallimento
    e all'utente sarà concesso di inserire nuovamente il comando */
    timeOut = setTimeout(attendiServer, 5000, contaRichieste);
    /* timeOut2 e timeOut3 riguardano i messaggi di 'exec' e 'ready', abbiamo inserito un tempo di 50000 ms, 
    poichè è il tempo impiegato (incrementato di 10000 ms) dal braccio per eseguire lo spostamento massimo (testato fisicamente) */
    timeOut2 = setTimeout(attendiExec, 50000, contaRichieste);
    timeOut3 = setTimeout(attendiReady, 50000, contaRichieste);
    console.log('invio..');
    contaRichieste++;
    return 0;
}
function attendiReady(idRichiesta) {
    ee.emit('Logga', 'ERRORE', 'Richiesta fallita su READY ID richiesta fallita: ' + idRichiesta);
    console.log('Richiesta fallita su READY ' + idRichiesta);
    clearTimeout(timeOut2);
    clearTimeout(timeOut3);
}

function attendiExec(idRichiesta) {
    ee.emit('Logga', 'ERRORE', 'Richiesta fallita su EXEC ID richiesta fallita: ' + idRichiesta);
    console.log('Richiesta fallita su EXEC ' + idRichiesta);
    clearTimeout(timeOut3);
}

function attendiServer(idRichiesta) {
    ee.emit('Logga', 'ERRORE', 'Richiesta fallita su ACK ID richiesta fallita: ' + idRichiesta);
    console.log('Richiesta fallita su ACK ' + idRichiesta);
}

var client = new require('net').Socket();
host = '128.1.116.25';
port = 5501

client.connect(port, host, function () {
    console.log('CLIENT CONNESSO A: ' + host + ':' + port);
    // Appena questo client si collega con successo al server, inviamo dei dati che saranno ricevuti dal server quale messaggio dal client
});

client.on('data', function (data) {
    /* Alla ricezione di dati da parte del server, azzererò il timeout inizializzato al momento dell'invio dei dati */
    //analizzo la stringa che mi ritorna ed in base ad essa fermo i dovuti timeout
    var array = (data.toString()).split(',');
    if (array[1] == "ack\n") {
        statoRichiesta = 2;
        clearTimeout(timeOut);
    }
    //per ora il server raspberry ha un errore dove exec e ready sono nello stesso messaggio, quindi ci siamo adattati.
    if (array[1].slice(0, 4) == "exec" || array[1] == "exec\n0" || array[1] == "exec\n") {
        statoRichiesta = 3;
        clearTimeout(timeOut2);//l'altro errore è che exec arriva non separato da virgola con i parametri: quidndi lo estraiamo
    }
    if (array[1] == "ready\n" || array[1] == "ready\n") {
        //ready è l'ultimo pezzo del messaggio e contiene /n alla fine quindi lo dobbiamo estrarre, 
        //cambia posizione a seconda del messaggio di risposta
        statoRichiesta = 0;
        clearTimeout(timeOut3);
    }
    
    clearTimeout(timeOut);
    ee.emit('Logga', 'RispostaRaspberry', data);
    console.log('DATI RICEVUTI DAL SERVER: ' + data);
    console.log('--------------------------------------------------------------------------------');
  
    // Chiudiamo la socket e liberiamo completamente le risorse
    //client.destroy();

});

// Aggiungiamo il gestore dell'evento 'close' a questa (istanza di) socket
client.on('close', function () {
    ee.emit('Logga', 'Disconessione', 'Il Server Raspberry si è disconesso');
    console.log('Connessione TCP chiusa.');
    client.destroy();
});

client.on('error', function (errore) {
    statoRichiesta = 4;
    ee.emit('Logga', 'ERRORE', errore);
    console.error('Si è verificato un errore: ' + errore);
    client.setTimeout(5000, function () {
        client.connect(port, host, function () {
            console.log('CLIENT CONNESSO A: ' + host + ':' + port);
            ee.emit('Logga', 'Connessione', 'Connesso al Server Raspberry');
            rl.prompt();
            // Appena questo client si collega con successo al server, inviamo dei dati che saranno ricevuti dal server quale messaggio dal client
        });
    });
});
cicloNominale('6000');
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    

    
    return ciclo;
	
}