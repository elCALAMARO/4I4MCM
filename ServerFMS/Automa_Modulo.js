//Modulo_Funzioni
//DATA ULITMA MODIFICA: 08/07/16
//VERSIONE FILE: 1.0.1

/* MODIFICHE EFFETTUATE:
***08/07/16*** 
 *-Nel cambio di stato da s4 a s0 viene lanciato l'eveto ricevutoReady per fare ritornare il menu
*/

var exports = module.exports = {};
var funzioni = {};

var commandInput = 0;
var timeOut = 0;      //Timeout utilizzato per quattro timeout : TIMEOUT_WAIT_ACK, TIMEOUT_WAIT_EXEC, TIMEOUT_WAIT READY, TIMEOUT_ERROR 
const S_READY = 0;
const S_WAIT_ACK = 1;
const S_WAIT_EXEC = 2;
const S_WAIT_READY = 3;
const S_ERROR = 4;

// input 
const I_REQUEST = 0;
const I_ACK = 1;
const I_NACK = 2;
const I_EXEC = 3;
const I_ERROR = 4;
const I_READY = 5;
const I_TOUT = 6;
var commandState = S_READY;


module.exports = function (ee) {
    
    funzioni.richiestaEseguibile = function () {
        if (commandState == S_READY) {
            return true;
        } else {
            return false;
        }
    }
    
    
    function attendi(messaggio) {
        ee.emit('Logga', 'ERRORE', messaggio);
        console.log(messaggio);
        on_I_TOUT();
    }
    
    function on_I_REQUEST() {                           //funzione per ogni ingresso
        console.log("Entrato in funzione on_I_REQUEST");
        switch (commandState) { 
                                                            //switch contenente gli stati
            case S_READY:
                commandState = S_WAIT_ACK;                      //passiamo allo stato successivo
                console.log('setto timeout di WAIT_ACK');
                timeOut = setTimeout(attendi, 7000, 'Scaduto timer ACK');   //settiamo il timeout di WAIT_ACK
                console.log("Avviato timer wait_Ack");
                ee.emit("statoCambiato", commandState);
                break;

            case S_WAIT_ACK:
                console.log('A Request Has Been Denied');
                ee.emit('Logga', 'DENIED REQUEST', 'Denied Request');
                ee.emit("richiestaNegata");
                break;

            case S_WAIT_EXEC:
                console.log('A Request Has Been Denied');
                ee.emit('Logga', 'DENIED REQUEST', 'Denied Request');
                ee.emit("richiestaNegata");
                break;

            case S_WAIT_READY:
                console.log('A Request Has Been Denied');
                ee.emit('Logga', 'DENIED REQUEST', 'Denied Request');
                ee.emit("richiestaNegata");
                break;

            case S_ERROR:
                console.log('A Request Has Been Denied');
                ee.emit('Logga', 'DENIED REQUEST', 'Denied Request');
                ee.emit("richiestaNegata");
                break;
        }
    }
    
    function on_I_ACK() {
        switch (commandState) {

            case S_READY:
                
                break;

            case S_WAIT_ACK:
                console.log('annullato timeout di WAIT_ACK');
                clearTimeout(timeOut);
                timeOut = setTimeout(attendi, 50000, 'Scaduto timer EXEC');        //settiamo il timeout di WAIT_EXEC
                console.log("Avviato timer wait_Exec");
                commandState = S_WAIT_EXEC;
                ee.emit("statoCambiato", commandState);
                break;

            case S_WAIT_EXEC:
                console.log('A Protocol Error Has Occured');
                ee.emit('Logga', 'ERRORE', 'Protocol Error');
                commandState = S_ERROR;
                ee.emit("statoCambiato", commandState);
                break;

            case S_WAIT_READY:
                break;

            case S_ERROR:
                break;
        }
    }
    
    function on_I_NACK() {
        switch (commandState) {
            case S_READY:
                
                break;

            case S_WAIT_ACK:
                console.log('An Error Has Occured : Recived Nack');
                ee.emit('Logga', 'ERRORE', 'Error: Received Nack');
                clearTimeout(timeOut);
                commandState = S_ERROR;
                ee.emit("statoCambiato", commandState);
                break;

            case S_WAIT_EXEC:
                console.log('A Protocol Error Has Occured');
                ee.emit('Logga', 'ERRORE', 'Protocol Error');
                commandState = S_ERROR;
                ee.emit("statoCambiato", commandState);
                break;

            case S_WAIT_READY:
                break;

            case S_ERROR:
                break;
        }
    }
    
    function on_I_EXEC() {
        switch (commandState) {

            case S_READY:
                
                break;

            case S_WAIT_ACK:
                
                break;

            case S_WAIT_EXEC:
                console.log('Annullo timeout di wait_exec');
                clearTimeout(timeOut);
                timeOut = setTimeout(attendi, 5000, 'Scaduto timer READY');     //settiamo il timeout di WAIT_READY 
                console.log("Avviato timer wait_Ready");
                commandState = S_WAIT_READY;
                ee.emit("statoCambiato", commandState);
                break;

            case S_WAIT_READY:
                
                break;

            case S_ERROR:
                
                break;
        }
    }
    
    function on_I_ERROR() {
        switch (commandState) {

            case S_READY:
                
                break;

            case S_WAIT_ACK:
                console.log('An Error Has Occured');
                ee.emit('Logga', 'ERRORE', 'Error');
                commandState = S_ERROR;
                ee.emit("statoCambiato", commandState);
                break;

            case S_WAIT_EXEC:
                console.log('An Error Has Occured');
                ee.emit('Logga', 'ERRORE', 'Error');
                commandState = S_ERROR;
                ee.emit("statoCambiato", commandState);
                break;

            case S_WAIT_READY:
                ee.emit('Logga', 'ERRORE', 'Error');
                commandState = S_ERROR;
                ee.emit("statoCambiato", commandState);
                break;

            case S_ERROR:
                ee.emit('Logga', 'ERRORE', 'Error');
                commandState = S_ERROR;
                ee.emit("statoCambiato", commandState);
                break;
        }
    }
    
    function on_I_READY() {
        switch (commandState) {

            case S_READY:
                clearTimeout(timeOut);
                break;                                                 //Se arriva ready in qualsiasi momento vado in ready

            case S_WAIT_ACK:
                commandState = S_READY;
                clearTimeout(timeOut);
                ee.emit("statoCambiato", commandState);
                break;

            case S_WAIT_EXEC:
                commandState = S_READY;
                clearTimeout(timeOut);
                ee.emit("statoCambiato", commandState);
                break;

            case S_WAIT_READY:
                console.log('Request Completed');
                commandState = S_READY;
                clearTimeout(timeOut);
                console.log("Annullato timer Wait_ready");
                console.log("Entrato in stato ready--Richiesta completata");
                ee.emit("statoCambiato", commandState);
                break;

            case S_ERROR:
                commandState = S_READY;
                clearTimeout(timeOut);
                ee.emit("statoCambiato", commandState);
                break;
        }
    }
    
    function on_I_TOUT() {
        switch (commandState) {

            case S_READY:
                
                break;

            case S_WAIT_ACK:
                console.log('An Error Has Occured : Timer Ack Expired');
                ee.emit('Logga', 'ERRORE', 'Error: Timer Ack Expired');
                commandState = S_ERROR;
                console.log("entrato nello Stato_Errore");
                timeOut = setTimeout(attendi, 5000, 'Scaduto timer 5 secondi da error a ready');
                //setTimeout(function () { commandState = S_READY; ee.emit("statoCambiato"); }, 5000);   
                break;

            case S_WAIT_EXEC:
                console.log('An Error Has Occured : Timer Exec Expired');
                ee.emit('Logga', 'ERRORE', 'Error: Timer Exec Expired');
                commandState = S_ERROR;
                console.log("entrato nello Stato_Errore");
                ee.emit("statoCambiato", commandState);
                break;

            case S_WAIT_READY:
                console.log('An Error Has Occured : Timer Ready Expired');
                ee.emit('Logga', 'ERRORE', 'Error: Timer Ready Expired');
                commandState = S_ERROR;
                console.log("entrato nello Stato_Errore");
                ee.emit("statoCambiato", commandState);
                break;

            case S_ERROR:
                console.log("cambio stato da S4-S0");
                commandState = S_READY;
                ee.emit("ricevutoReady");
                ee.emit("statoCambiato", commandState);
                break;
        }
    }
    
    /*   funzioni.interf = function (){
    console.log("Entrato in funzione interf");
    console.log("Stato attuale: " + commandState);
    rl.question('Inserisci Input: ', function (commandInput) {
		console.log("input: " + commandInput);
		ee.emit("statoCambiato");
        ChangeStatus(commandInput);
    })
} */


  function ChangeStatus(commandInput) {
        console.log("CommandInput in changestatus: " + commandInput);
        switch (Number(commandInput)) {
            case I_REQUEST:
                on_I_REQUEST();
                break;
            case I_ACK:
                on_I_ACK();
                break;
            case I_NACK:
                on_I_NACK();
                break;
            case I_EXEC:
                on_I_EXEC();
                break;
            case I_ERROR:
                on_I_ERROR();
                break;
            case I_READY:
                on_I_READY();
                break;
        //case I_TOUT:
        //    on_I_TOUT();
        //    break;
            default:
                console.log("Input non valido");
                ee.emit("statoCambiato");
        }
    }
    
    ee.on("inputComando", function (commandInput) {
        ChangeStatus(commandInput);
    });
    
    
    return funzioni;
	
}