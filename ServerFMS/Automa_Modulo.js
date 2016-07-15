//Modulo_Funzioni
//DATA ULITMA MODIFICA: 15/07/16
//VERSIONE FILE: 1.0.1

/* MODIFICHE EFFETTUATE:
***08/07/16*** 
 *-Nel cambio di stato da s4 a s0 viene lanciato l'eveto ricevutoReady per fare ritornare il menu
*/

var exports = module.exports = {};
var funzioni = {};

var commandInput = 0;
var timeOut = 0;                //Timeout utilizzato per quattro timeout : TIMEOUT_WAIT_ACK, TIMEOUT_WAIT_EXEC, TIMEOUT_WAIT READY, TIMEOUT_ERROR 

    //stati
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
    
    funzioni.richiestaEseguibile = function () {                 //esportiamo la funzione richiestaEseguibile che verrà utilizzata in Modulo_Comandi
        if (commandState == S_READY) {
            return true;
        } else {
            return false;
        }
    }
      
    function attendi(messaggio) {                //funzione richiamata dal setTimeout, stampa messaggio di scadenza Timer e richiama la funzione on_I_TOUT
        ee.emit('Logga', 'ERRORE', messaggio);
        console.log(messaggio);
        on_I_TOUT();
    }

        /*Per ogni ingresso verrà eseguita una funzione contenente tutti i possibili stati in cui si può trovare l'automa in base all'ingresso ricevuto*/
    function on_I_REQUEST() {                           
        console.log("Entrato in funzione on_I_REQUEST");
        switch (commandState) { 
                                                            //switch contenente gli stati
            case S_READY:
                commandState = S_WAIT_ACK;                      //passiamo allo stato successivo
                console.log('setto timeout di WAIT_ACK');
                timeOut = setTimeout(attendi, 7000, 'Scaduto timer ACK');   //settiamo il timeout di WAIT_ACK per 7 secondi, alla scadenza del timer, senza aver ricevuto ACK, stamperà il messaggio
                console.log("Avviato timer wait_Ack");
                ee.emit('statoCambiato', commandState);
                console.log("lanciato evento statocambiato");
                break;

            case S_WAIT_ACK:
                console.log('A Request Has Been Denied');
                ee.emit('Logga', 'DENIED REQUEST', 'Denied Request');               //evento richiesta negata
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
                clearTimeout(timeOut);                                             //azzero il Timer di wait_ack perchè ha ricevuto Ack
                timeOut = setTimeout(attendi, 50000, 'Scaduto timer EXEC');        //settiamo il timeout di WAIT_EXEC, quando scadrà senza aver ricevuto Exec stamperà il messaggio di scadenza timer
                console.log("Avviato timer wait_Exec");
                commandState = S_WAIT_EXEC;
                ee.emit("statoCambiato", commandState);
                console.log("lanciato evento statocambiato");
                break;

            case S_WAIT_EXEC:
                console.log('A Protocol Error Has Occured');
                ee.emit('Logga', 'ERRORE', 'Protocol Error');                       //evento di errore protocollo: non può ricevere ACK nello stato di Wait_Exec
                commandState = S_ERROR;
                ee.emit("statoCambiato", commandState);
                console.log("lanciato evento statocambiato");
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
                clearTimeout(timeOut);                                              //azzero il Timer di wait_Exec perchè ha ricevuto Exec
                commandState = S_ERROR;                                             //settiamo il timeout di WAIT_READY per 5 secondi, quando scadrà il TimeOut senza aver ricevuto Ready, stamperà il messaggio di scadenza Timer
                ee.emit("statoCambiato", commandState);
                console.log("lanciato evento statocambiato");
                break;

            case S_WAIT_EXEC:
                console.log('A Protocol Error Has Occured');
                ee.emit('Logga', 'ERRORE', 'Protocol Error');
                commandState = S_ERROR;
                ee.emit("statoCambiato", commandState);
                console.log("lanciato evento statocambiato");
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
                console.log("lanciato evento statocambiato");
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
                console.log("lanciato evento statocambiato");
                break;

            case S_WAIT_EXEC:
                console.log('An Error Has Occured');
                ee.emit('Logga', 'ERRORE', 'Error');
                commandState = S_ERROR;
                ee.emit("statoCambiato", commandState);
                console.log("lanciato evento statocambiato");
                break;

            case S_WAIT_READY:
                ee.emit('Logga', 'ERRORE', 'Error');
                commandState = S_ERROR;
                ee.emit("statoCambiato", commandState);
                console.log("lanciato evento statocambiato");
                break;

            case S_ERROR:
                ee.emit('Logga', 'ERRORE', 'Error');
                commandState = S_ERROR;
                ee.emit("statoCambiato", commandState);
                console.log("lanciato evento statocambiato");
                break;
        }
    }   
    function on_I_READY() {
        switch (commandState) {
            case S_READY:
                clearTimeout(timeOut);                                 //azzero il Timer di wait_Ready 
                break;                                                 //Se arriva ready in qualsiasi momento vado in ready
                                                           

            case S_WAIT_ACK:
                commandState = S_READY;
                clearTimeout(timeOut);                                //azzero il Timer di wait_Exec 
                ee.emit("statoCambiato", commandState);
                console.log("lanciato evento statocambiato");
                break;

            case S_WAIT_EXEC:
                commandState = S_READY;
                clearTimeout(timeOut);
                ee.emit("statoCambiato", commandState);
                console.log("lanciato evento statocambiato");
                break;

            case S_WAIT_READY:
                console.log('Request Completed');
                commandState = S_READY;
                clearTimeout(timeOut);                               //azzero il Timer di wait_Ready 
                console.log("Annullato timer Wait_ready");
                console.log("Entrato in stato ready--Richiesta completata");
                ee.emit("statoCambiato", commandState);
                console.log("lanciato evento statocambiato");
                break;

            case S_ERROR:
                commandState = S_READY;
                clearTimeout(timeOut);                               //azzero il Timer di wait_Error 
                ee.emit("statoCambiato", commandState);
                console.log("lanciato evento statocambiato");
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
                timeOut = setTimeout(attendi, 5000, 'Scaduto timer 5 secondi da error a ready');                 //settiamo il timeout di WAIT_ERROR per 5 secondi
                break;

            case S_WAIT_EXEC:
                console.log('An Error Has Occured : Timer Exec Expired');
                ee.emit('Logga', 'ERRORE', 'Error: Timer Exec Expired');
                commandState = S_ERROR;
                console.log("entrato nello Stato_Errore");
                ee.emit("statoCambiato", commandState);
                console.log("lanciato evento statocambiato");
                break;

            case S_WAIT_READY:
                console.log('An Error Has Occured : Timer Ready Expired');
                ee.emit('Logga', 'ERRORE', 'Error: Timer Ready Expired');
                commandState = S_ERROR;
                console.log("entrato nello Stato_Errore");
                ee.emit("statoCambiato", commandState);
                console.log("lanciato evento statocambiato");
                break;

            case S_ERROR:
                console.log("cambio stato da S4-S0");
                commandState = S_READY;
                ee.emit("ricevutoReady");
                ee.emit("statoCambiato", commandState);
                console.log("lanciato evento statocambiato");
                break;
        }
    } 
    function ChangeStatus(commandInput) {                                             //funzione ChangeStatus che a seconda dell'input passato nello switch richiama una funzione
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
            default:
                console.log("Input non valido");
                ee.emit("statoCambiato");
                console.log("lanciato evento statocambiato");
        }
    }   
    ee.on("inputComando", function (commandInput) {                             //lancio evento di inputComando che richiama la funzione ChangeStatus
        ChangeStatus(commandInput);
    });  
    return funzioni;	
}