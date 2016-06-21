/* Parte Client per interfacciarsi con Raspberry + Interpretazione comandi */
var net = require('net');
var readLine = require('readline');
const EVENTEMITTER = require('events');
var fs = require('fs');
/* Leggo da file IP e porta Server Raspberry separati tramite il carattere '\r\n' */
var contenuto = fs.readFileSync('ipporta.txt', 'utf8');
var array = contenuto.split('\r\n');
var contaRichieste = 0;
var rl = readLine.createInterface(process.stdin, process.stdout);
var timeOut = 0;
var timeOut2 = 0;
var timeOut3 = 0;
var ee = new EVENTEMITTER();
var fs = require('fs');
var dataOrario;
var fileName /* ="serverFMS.log" */;

/* Indirizzo IP e porta Server Raspberry verranno assegnati una volta esaminato il file .txt e trascurati i commenti
i quali cominceranno col carattere '#' */
var host = '';
var port = 0;

/* Assegnamento indirizzo IP e porta Server Raspberry */
for (var i = 0; i < array.length; i++) {
    if ((array[i])[0] != '#') {
        if ((array[i]).slice(0, 2) == "IP") {
            var x = array[i].split('=')
            host = x[1].toString();
        }
        else if ((array[i]).slice(0, 5) == "PORTA") {
            var y = array[i].split('=');
            port = y[1];
        }
    }
}

rl.setPrompt('SINTASSI COMANDO: COMANDO,PAR_0,PAR_1,PARn> ');
var client = new net.Socket();
client.connect(port, host, function () {

    console.log('CLIENT CONNESSO A: ' + host + ':' + port);
    ee.emit('Logga', 'Connessione', 'Connesso al Server Raspberry');
    rl.prompt();
    // Appena questo client si collega con successo al server, inviamo dei dati che saranno ricevuti dal server quale messaggio dal client
    invioDato();

});

// Aggiungiamo il gestore dell'evento 'data' a questa socket. 'data' sicnifica in questo caso "quello che arriva dall'altra parte" (dal server)
client.on('data', function (data) {
    /* Alla ricezione di dati da parte del server, azzererò il timeout inizializzato al momento dell'invio dei dati */
    //analizzo la stringa che mi ritorna ed in base ad essa fermo i dovuti timeout
    var array = (data.toString()).split(',');
    if (array[1] == "ack\n") {
        clearTimeout(timeOut);
    }
    //per ora il server raspberry ha un errore dove exec e ready sono nello stesso messaggio, quindi ci siamo adattati.
    if (array[1].slice(0, 4) == "exec" || array[1] == "exec\n0" || array[1] == "exec\n") {
        clearTimeout(timeOut2);//l'altro errore è che exec arriva non separato da virgola con i parametri: quidndi lo estraiamo
        if (array[2] == "ready\n" || array[3] == "ready\n") {//ready è l'ultimo pezzo del messaggio e contiene /n alla fine quindi lo dobbiamo estrarre, cambia posizione a seconda del messaggio di risposta
            clearTimeout(timeOut3);
        }
    }

    clearTimeout(timeOut);
    ee.emit('Logga', 'RispostaRaspberry', data);
    rl.setPrompt('>');
    rl.prompt();
    console.log('DATI RICEVUTI DAL SERVER: ' + data);
    console.log('--------------------------------------------------------------------------------');
    rl.setPrompt('SINTASSI COMANDO: COMANDO,PAR_0,PAR_1,PARn> ');
    rl.prompt();
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

function invioDato() {
    rl.on('line', function (data) {
        riconosciComando(data);
        rl.prompt();
    })
        .on('close', function () {
            ee.emit('Logga', 'Disconessione', 'Il Server si è disconesso dal Server Raspberry');
            console.log('uscita in corso..');
            process.exit;
        }
        );
}

//queste funzioni vanno messe nei timeout, se attivate vuol dire che il pacchetto è fallito in un punto
function attendiReady(idRichiesta) {
    ee.emit('Logga', 'ERRORE', 'Richiesta fallita su READY ID richiesta fallita: ' + idRichiesta);
    console.log('Richiesta fallita su READY ' + idRichiesta);
    clearTimeout(timeOut2);
    clearTimeout(timeOut3);
    rl.prompt();
}

function attendiExec(idRichiesta) {
    ee.emit('Logga', 'ERRORE', 'Richiesta fallita su EXEC ID richiesta fallita: ' + idRichiesta);
    console.log('Richiesta fallita su EXEC ' + idRichiesta);
    clearTimeout(timeOut3);
    rl.prompt();
}

function attendiServer(idRichiesta) {
    ee.emit('Logga', 'ERRORE', 'Richiesta fallita su ACK ID richiesta fallita: ' + idRichiesta);
    console.log('Richiesta fallita su ACK ' + idRichiesta);
    rl.prompt();
}

function riconosciComando(stringaGrezza) {

    // Dividere la frase in base al carattere ','    
    var array = stringaGrezza.split(',');

    // Inizio analisi da effettuare in base alla stringa del comando
    /* Aggiunto il .toUpperCase() per fare sì che anche se scritto in minuscolo, il comando venga riconosciuto dal Server Raspberrry */
    if (array[0].toUpperCase() == "MP") {
        /* Controllo se viene inserito un parametro negativo*/
        if (array[1] < 0 || array[2] < 0) {
            console.log("Errore, non si possono inserire parametri negativi");
        }
        else {
            /* Controllo sul numero di parametri, se più, o meno, dei previsti, verrà restituito un messaggio d'errore */
            if (array.length > 3 || array.length < 2) {
                console.log("Errore, bisogna inserire due parametri");
                contaRichieste++;
                rl.prompt();
            }
            else if ((isNaN(array[1])) || (isNaN(array[2]))) {
                console.log("Errore, i parametri devono essere dei numeri e non delle stringhe");
                contaRichieste++;
                rl.prompt();
            }
            else {
                MuoviPezzo(array[0].toUpperCase(), array[1], array[2]);
            }
        }
    }
    /* Aggiunto il .toUpperCase() per fare sì che anche se scritto in minuscolo, il comando venga riconosciuto dal Server Raspberrry */
    else if (array[0].toUpperCase() == "MN") {
        /*se viene inserito un paramtro negativo*/
        if (array[1] < 0 || array[2] < 0) {
            console.log("Errore, non si possono inserire parametri negativi");
        }
        else {
            /* Controllo sul numero di parametri, se più, o meno, dei previsti, verrà restituito un messaggio d'errore */
            if (array[2] != undefined) {
                console.log("Errore, bisogna inserire solo un parametro");
                rl.prompt();
            }
            else if ((isNaN(array[1]))) {
                console.log("Errore, il parametro deve essere un numero e non una stringa");
                contaRichieste++;
                rl.prompt();
            }
            else {
                MuoviNavetta(array[0].toUpperCase(), array[1]);
            }
        }
    }
    /* Aggiunto il .toUpperCase() per fare sì che anche se scritto in minuscolo, il comando venga riconosciuto dal Server Raspberrry */
    else if (array[0].toUpperCase() == "OD") {
        /* Controllo sul numero di parametri, in questo caso non sono previsti parametri oltre al comando,
        quindi, se inseriti verrà restituito un messaggio d'errore */
        if (array[2] != undefined || array[1] != undefined) {
            console.log("Errore, non si devono inserire parametri");
            contaRichieste++;
            rl.prompt();
        }
        else {
            OttieniDati(array[0].toUpperCase());
        }
    }
    /* Aggiunto il .toUpperCase() per fare sì che anche se scritto in minuscolo, il comando venga riconosciuto dal Server Raspberrry */
    else if (array[0].toUpperCase() == "OP") {
        /* Controllo sul numero di parametri, in questo caso non sono previsti parametri oltre al comando,
        quindi, se inseriti verrà restituito un messaggio d'errore */
        if (array[2] != undefined || array[1] != undefined) {
            console.log("Errore, non si devono inserire parametri");
            contaRichieste++;
            rl.prompt();
        }
        else {
            OttieniPostoNavetta(array[0].toUpperCase());
        }
    }
    /* Aggiunto il .toUpperCase() per fare sì che anche se scritto in minuscolo, il comando venga riconosciuto dal Server Raspberrry */
    else if (array[0].toUpperCase() == "RES") {
        /* Controllo sul numero di parametri, in questo caso non sono previsti parametri oltre al comando,
        quindi, se inseriti verrà restituito un messaggio d'errore */
        if (array[2] != undefined || array[1] != undefined) {
            console.log("Errore, non si devono inserire parametri");
            contaRichieste++;
            rl.prompt();
        }
        else {
            Reset(array[0].toUpperCase());
        }
    }
    /* Controllo sul comando inserito, se no viene riconosciuto, tra quelli previsti, verrà restituito un messaggio d'errore */
    else {
        console.log("Errore, non esiste il movimento che si desidera effettuare");
    }
}

/* Parametri function: comando inserito dall'utente, parametri inseriti dall'utente */
function MuoviPezzo(comando, vet1, vet2) {
    /* Aggiungo il numero di richiesta alla stringa inserita da console */
    client.write(contaRichieste + ',' + comando + ',' + vet1 + ',' + vet2 + '\n');
    var mex = contaRichieste + ',' + comando + ',' + vet1 + ',' + vet2;
    ee.emit('Logga', "RichiestaRaspberry", mex);
    /* Inizializzo un timeout, dopo 5 secondi senza ricevere risposta, verrà restituito un messaggio di fallimento
    e all'utente sarà concesso di inserire nuovamente il comando */
    timeOut = setTimeout(attendiServer, 5000, contaRichieste);
    /* timeOut2 e timeOut3 riguardano i messaggi di 'exec' e 'ready', abbiamo inserito un tempo di 50000 ms, 
    poichè è il tempo impiegato (incrementato di 10000 ms) dal braccio per eseguire lo spostamento massimo (testato fisicamente) */
    timeOut2 = setTimeout(attendiExec, 50000, contaRichieste);
    timeOut3 = setTimeout(attendiReady, 50000, contaRichieste);
    console.log('invio..');
    contaRichieste++;
}
/* Parametri function: comando inserito dall'utente, parametro inserito dall'utente */
function MuoviNavetta(comando, vet1) {
    /* Aggiungo il numero di richiesta alla stringa inserita da console */
    client.write(contaRichieste + ',' + comando + ',' + vet1 + '\n');
    var mex = contaRichieste + ',' + comando + ',' + vet1;
    ee.emit('Logga', "RichiestaRaspberry", mex);
    /* Inizializzo un timeout, dopo 5 secondi senza ricevere risposta, verrà restituito un messaggio di fallimento
    e all'utente sarà concesso di inserire nuovamente il comando */
    timeOut = setTimeout(attendiServer, 5000, contaRichieste);
    /* timeOut2 e timeOut3 riguardano i messaggi di 'exec' e 'ready', abbiamo inserito un tempo di 50000 ms, 
    poichè è il tempo impiegato (incrementato di 10000 ms) dal braccio per eseguire lo spostamento massimo (testato fisicamente) */
    timeOut2 = setTimeout(attendiExec, 50000, contaRichieste);
    timeOut3 = setTimeout(attendiReady, 50000, contaRichieste);
    console.log('invio..');
    contaRichieste++;
}
/* Parametri function: comando inserito dall'utente */
function OttieniDati(comando) {
    /* Aggiungo il numero di richiesta alla stringa inserita da console */
    client.write(contaRichieste + ',' + comando + '\n');
    var mex = contaRichieste + ',' + comando;
    ee.emit('Logga', "RichiestaRaspberry", mex);
    /* Inizializzo un timeout, dopo 5 secondi senza ricevere risposta, verrà restituito un messaggio di fallimento
    e all'utente sarà concesso di inserire nuovamente il comando */
    timeOut = setTimeout(attendiServer, 5000, contaRichieste);
    /* timeOut2 e timeOut3 riguardano i messaggi di 'exec' e 'ready', abbiamo inserito un tempo di 50000 ms, 
    poichè è il tempo impiegato (incrementato di 10000 ms) dal braccio per eseguire lo spostamento massimo (testato fisicamente) */
    timeOut2 = setTimeout(attendiExec, 50000, contaRichieste);
    timeOut3 = setTimeout(attendiReady, 50000, contaRichieste);
    console.log('invio..');
    contaRichieste++;
}
/* Parametri function: comando inserito dall'utente */
function OttieniPostoNavetta(comando) {
    /* Aggiungo il numero di richiesta alla stringa inserita da console */
    client.write(contaRichieste + ',' + comando + '\n');
    var mex = contaRichieste + ',' + comando;
    ee.emit('Logga', "RichiestaRaspberry", mex);
    /* Inizializzo un timeout, dopo 5 secondi senza ricevere risposta, verrà restituito un messaggio di fallimento
    e all'utente sarà concesso di inserire nuovamente il comando */
    timeOut = setTimeout(attendiServer, 5000, contaRichieste);
    /* timeOut2 e timeOut3 riguardano i messaggi di 'exec' e 'ready', abbiamo inserito un tempo di 50000 ms, 
    poichè è il tempo impiegato (incrementato di 10000 ms) dal braccio per eseguire lo spostamento massimo (testato fisicamente) */
    timeOut2 = setTimeout(attendiExec, 50000, contaRichieste);
    timeOut3 = setTimeout(attendiReady, 50000, contaRichieste);
    console.log('invio..');
    contaRichieste++;
}
/* Parametri function: comando inserito dall'utente */
function Reset(comando) {
    /* Aggiungo il numero di richiesta alla stringa inserita da console */
    client.write(contaRichieste + ',' + comando + '\n');
    var mex = contaRichieste + ',' + comando;
    ee.emit('Logga', "RichiestaRaspberry", mex);
    /* Inizializzo un timeout, dopo 5 secondi senza ricevere risposta, verrà restituito un messaggio di fallimento
    e all'utente sarà concesso di inserire nuovamente il comando */
    timeOut = setTimeout(attendiServer, 5000, contaRichieste);
    /* timeOut2 e timeOut3 riguardano i messaggi di 'exec' e 'ready', abbiamo inserito un tempo di 50000 ms, 
    poichè è il tempo impiegato (incrementato di 10000 ms) dal braccio per eseguire lo spostamento massimo (testato fisicamente) */
    timeOut2 = setTimeout(attendiExec, 50000, contaRichieste);
    timeOut3 = setTimeout(attendiReady, 50000, contaRichieste);
    console.log('invio..');
    contaRichieste++;
}

ee.on('Logga', function (cat, mess) {
    WriteFile(cat, mess);
});

function WriteFile(categoria, messaggio) {
    dataOrario = new Date();
    fileName = "serverFMS.log";
    if (categoria == "Connessione" || categoria == "Disconessione") {
        dati = dataOrario.toUTCString() + "\t\r" + categoria + "\t\r" + "\t\r" + messaggio;
        fs.appendFileSync(fileName, dati += "\r\n", "UTF-8", { 'flags': 'a+' });
    }
    else if (categoria == "ERRORE") {
        dati = dataOrario.toUTCString() + "\t\r" + categoria + "\t\r" + "\t\r" + "\t\r" + messaggio;
        fs.appendFileSync(fileName, dati += "\r\n", "UTF-8", { 'flags': 'a+' });
    }
    else {
        dati = dataOrario.toUTCString() + "\t\r" + categoria + "\t\r" + messaggio;
        fs.appendFileSync(fileName, dati += "\r\n", "UTF-8", { 'flags': 'a+' });
    }
}