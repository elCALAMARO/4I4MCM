//Modulo_Comandi
//DATA ULITMA MODIFICA: 15/07/16
//VERSIONE FILE: 1.0.1

var contaRichieste = 0;
var requestify = require('requestify');
var exports = module.exports = {};
var comandi = {};

module.exports = function (ee,client, modifica_database, portapi,pezzo) {

    var automa = require("./Automa_Modulo.js")(ee);
    var navettaDisp = true;
    
    comandi.richiestaEseguibile = automa.richiestaEseguibile;                                       
    comandi.modifica_database = modifica_database;                                                  //Serve a caricaParti 

    comandi.MuoviPezzo = function MuoviPezzo(comando, vet1, vet2) {
        console.log("Richiesta muovipezzo")
        ee.once('statoCambiato', function (stato) {
            
            //Se automa è in stato WAIT_ACK e la navetta è disponibile proseguo,
            //altrimenti ritorna false
            if ((stato == 1) && (navettaDisp)) { navettaDisp = false } else { return false };

            /* Aggiungo il numero di richiesta alla stringa inserita da console */
            contaRichieste++;
            client.write(contaRichieste + ',' + comando + ',' + vet1 + ',' + vet2 + '\n');
       
        //chiamata per ottenere un pezzo
        ee.on('ricevutoExec', function () {
            console.log("Entrato in evento ricevutoExec");
            requestify.get('http://localhost:' + portapi + '/api/pezzi').then(function (response) {
                console.log("portapi: " + portapi);
                var url = 'http://localhost:' + portapi + '/api/pezzi/';
                var listaPezzi = response.getBody();
                for (var i = 0; i < listaPezzi.length; i++) {
         
                if (listaPezzi[i].posto == vet1) {
                        //aggiorna il posto del pezzo                                             
				    url = url + listaPezzi[i]._id + "/posto";
                        var put = { posto: vet2 };
                            modifica_database(url, put);                           
                    }
                }
            })
            })

            var mex = contaRichieste + ',' + comando + ',' + vet1 + ',' + vet2;
            console.log("inviato al rPi " + mex);
            ee.emit('Logga', "RichiestaRaspberry", mex);
        })
        ee.emit("inputComando", 0);
    }
   
    comandi.MuoviNavetta = function MuoviNavetta(comando, vet1) {
        
        ee.once("statoCambiato", function (stato) {                            
            console.log("Ricevuto stato cambiato")
            //Se automa è in stato WAIT_ACK e la navetta è disponibile proseguo,
            //altrimenti ritorna false
            if ((stato == 1) && (navettaDisp)) { navettaDisp = false } else { return false };
            
            console.log("INVIO PACCHETTO: " + contaRichieste + ',' + comando + ',' + vet1 + '\n');
            contaRichieste++;
            client.write(contaRichieste + ',' + comando + ',' + vet1 + '\n');

            var mex = contaRichieste + ',' + comando + ',' + vet1;
            ee.emit('Logga', "RichiestaRaspberry", mex);
        })
        ee.emit("inputComando", 0)

    }
        
    //acquisire codice QR e aggiornare database
    comandi.OttieniDati = function OttieniDati(comando) {
        console.log("Entrato in ottieni dati");
        var nuovoPezzo;       
        ee.once("statoCambiato", function (stato) {
            //Se automa è in stato WAIT_ACK e la navetta è disponibile proseguo,
            //altrimenti ritorna false
            if ((stato == 1) && (navettaDisp)) { navettaDisp = false } else { return false };                      
            contaRichieste++;
            console.log("Richiesta ottienidati")
            client.write(contaRichieste + ',' + comando + '\n');         
            ee.on('ricevutoDatiQr', function (datiQr) {
                nuovoPezzo = new pezzo();            
                //split per ottenere i dati contenuti nell'array del QR
                nuovoPezzo.nome = datiQr[0].split(':')[1];
                nuovoPezzo.tLav = datiQr[1].split(':')[1];
                nuovoPezzo.operazione = datiQr[2].split(':')[1];
                nuovoPezzo.stato = "GREZZO";
                nuovoPezzo.posto = 1;
                
                console.log("NOME: " + nuovoPezzo.nome);                //stampa dei campi nome, tLav, operazione, stato, posto
                console.log("TLAV: " + nuovoPezzo.tLav);
                console.log("OP: " + nuovoPezzo.operazione);
                console.log("STATO: " + nuovoPezzo.stato);
                console.log("POSTO: " + nuovoPezzo.posto);
                
                nuovoPezzo.save(function (err) {                    
                    if (err) {                        
                        ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
                    } else {
                        console.log("Inserito nuovo pezzo:" + nuovoPezzo.nome);
                        ee.emit("Logga", "Database", "Inserito un pezzo");
                    }
                });            
            })           
            ee.on("ricevutoReady", function () {
                ee.emit("inseritoNuovoPezzo", nuovoPezzo)
            })
                        
            var mex = contaRichieste + ',' + comando;
            ee.emit('Logga', "RichiestaRaspberry", mex);
        })
        ee.emit("inputComando", 0);
    }
        
    comandi.OttieniPostoNavetta = function OttieniPostoNavetta(comando) {
        /* Aggiungo il numero di richiesta alla stringa inserita da console */
        console.log("Richiesta ottienipostonavetta")
        
        ee.once("statoCambiato", function (stato) {
            //Se automa è in stato WAIT_ACK e la navetta è disponibile proseguo,
            //altrimenti ritorna false
            if ((stato == 1) && (navettaDisp)) { navettaDisp = false } else { return false };
            
            contaRichieste++;
            client.write(contaRichieste + ',' + comando + '\n');                     
            var mex = contaRichieste + ',' + comando;
            ee.emit('Logga', "RichiestaRaspberry", mex);
        })
        ee.emit("inputComando", 0);
    }
       
    comandi.Reset = function Reset(comando) {
        /* Aggiungo il numero di richiesta alla stringa inserita da console */
        console.log("Richiesta reset")      
        ee.once("statoCambiato", function (stato) {
            //Se automa è in stato WAIT_ACK e la navetta è disponibile proseguo,
            //altrimenti ritorna false
            if ((stato == 1) && (navettaDisp)) { navettaDisp = false } else { return false };           
            contaRichieste++;
            client.write(contaRichieste + ',' + comando + '\n');
                        
            var mex = contaRichieste + ',' + comando;
            ee.emit('Logga', "RichiestaRaspberry", mex);  
        })
        ee.emit("inputComando", 0);
    }
        
    ee.on("ricevutoReady", function (){
        navettaDisp = true;
    })   
    return comandi;
}