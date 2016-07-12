var contaRichieste = 0;

var requestify = require('requestify');

var exports = module.exports = {};
var comandi = {};

module.exports = function (ee,client, modifica_database, portapi) {

    var automa = require("./Automa_Modulo.js")(ee);

    comandi.MuoviPezzo = function MuoviPezzo(comando, vet1, vet2) {
        console.log("Entrato nella funzione MuoviPezzo");
        
        //console.log("Stato richiesta: "+ statoRichiesta);
        if (automa.richiestaEseguibile() == false) {
            
            return;
        }
        /* Aggiungo il numero di richiesta alla stringa inserita da console */
        contaRichieste++;
        console.log("Richiesta muovipezzo")
        client.write(contaRichieste + ',' + comando + ',' + vet1 + ',' + vet2 + '\n');
        ee.emit("inputComando", 0);
        //chiamata per ottenere un pezzo
        ee.on('ricevutoExec', function () {
            console.log("Entrato in evento ricevutoExec");
            requestify.get('http://localhost:' + portapi + '/api/pezzi').then(function (response) {
                console.log("portapi: " + portapi);
                var url = 'http://localhost:' + portapi + '/api/pezzi/';
                var listaPezzi = response.getBody();
                for (var i = 0; i < listaPezzi.length; i++) {
                    /* console.log("Entrato in for per aggiornamento db");
	    console.log("listaPezzi[0]: " + listaPezzi[0]);
	    console.log("posto di i(pezzo singolo): "+listaPezzi[i].posto);
	    console.log("vet1: "+ vet1); */
                if (listaPezzi[i].posto == vet1) {
                        //aggiorna il posto del pezzo 
                        
                        /* console.log("Entrato in if");		
				    console.log("vet2 in if: " + vet2); */
				    url = url + listaPezzi[i]._id + "/posto";
                        //console.log("url: " + url);
                        var put = { posto: vet2 };
                        /* requestify.put(url,put).then(function (risposta) {
					    console.log("valore posto aggiornato: "+listaPezzi[i].posto);
                    console.log(risposta.getBody().message);
                    }) */
                        console.log(url,put);
				    modifica_database(url, put);
                    }
                }
            })
        })
        
        var mex = contaRichieste + ',' + comando + ',' + vet1 + ',' + vet2;
        console.log("inviato al rPi " + mex);
        ee.emit('Logga', "RichiestaRaspberry", mex);
        //timeout();
    }
    
    
    comandi.MuoviNavetta = function MuoviNavetta(comando, vet1) {
        if (automa.richiestaEseguibile() == false) {
            return;
        }
        
        /* Aggiungo il numero di richiesta alla stringa inserita da console */
        console.log("INVIO PACCHETTO: " + contaRichieste + ',' + comando + ',' + vet1 + '\n');
        contaRichieste++;
        console.log("Richiesta muovinavetta")

        client.write(contaRichieste + ',' + comando + ',' + vet1 + '\n');
        ee.emit("inputComando", 0);
        
        var mex = contaRichieste + ',' + comando + ',' + vet1;
        ee.emit('Logga', "RichiestaRaspberry", mex);

        //timeout();
    }
    
    
    comandi.OttieniDati = function OttieniDati(comando) {
        if (automa.richiestaEseguibile() == false) {
            
            return;
        }
        
        /* Aggiungo il numero di richiesta alla stringa inserita da console */
        contaRichieste++;
        console.log("Richiesta ottienidati")

        client.write(contaRichieste + ',' + comando + '\n');
        ee.emit("inputComando", 0);
        
        var mex = contaRichieste + ',' + comando;
        ee.emit('Logga', "RichiestaRaspberry", mex);

        //timeout();
    }
    
    
    comandi.OttieniPostoNavetta = function OttieniPostoNavetta(comando) {
        if (automa.richiestaEseguibile() == false) {
            
            return;
        }
        /* Aggiungo il numero di richiesta alla stringa inserita da console */
        contaRichieste++;
        console.log("Richiesta ottienipostonavetta")

        client.write(contaRichieste + ',' + comando + '\n');
        ee.emit("inputComando", 0);
        
        var mex = contaRichieste + ',' + comando;
        ee.emit('Logga', "RichiestaRaspberry", mex);

    //timeout();
    
    }
    
    
    comandi.Reset = function Reset(comando) {
        if (automa.richiestaEseguibile() == false) {
            
            return;
        }
        
        /* Aggiungo il numero di richiesta alla stringa inserita da console */
        contaRichieste++;
        console.log("Richiesta reset")

        client.write(contaRichieste + ',' + comando + '\n');
        ee.emit("inputComando", 0);
        
        var mex = contaRichieste + ',' + comando;
        ee.emit('Logga', "RichiestaRaspberry", mex);

   // timeout();    
    }
    
    return comandi;
}