//ServerFMS
//DATA ULITMA MODIFICA: 12/07/16
//VERSIONE FILE: 1.3.6

/* MODIFICHE EFFETTUATE:
***05/07/16*** 
-Corretto cicloNominale1, ora viene eseguito correttamente
-Inizio aggiunta menu opzioni dopo fine ciclo (non si vede finchè non si preme una freccia)
-Il DB ora viene aggiornato dopo lo spostamento di un pezzo
-Eliminato evento inutilizzato "ciclo1" e sostituito con "ricevutoReady" eseguito una volta sola(nel cicloNominale1)
-Sostituite alcune variabili posizioneAttuale con 1, dato che risultavano undefined
-Corretto selezione, modifica e eliminazione dei singoli pezzi (id_nome_pezzo_ott, id_nome_canc, scelta_modifica) 

***06/07/16***
-Pulizia interfaccia (rimozione console.log() inutili)
-Il menu dell'interfaccia è ora utilizzabile solo dopo l'arrivo di un pacchetto READY
-Modifica funzione modifica_database in modo che accetti i parametri url e put, in modo che sia richiamabile per fare aggiornamenti di pezzi o posti
-Il database ora viene aggiornato soltanto dopo l'arrivo del relativo exec
-Il cicloNominale1 è ora completamente funzionante, la gestione degli errori dipende tuttavia dalle implementazioni iniziali delle API e dei comandi


 ***07/07/16***
-Corretto orario scritto nel file di log (adesso mostra l'ora locale)
-Aggiunte alcune voci nel menu per tornare indietro da diverse sottosezioni
  
  
 ***08/07/16***
 -Integrato codice macchina a stati con modulo separato (Automa_Modulo) 
  
 
 ***12/07/16*** 
 -Separati comandi navetta in un modulo separato (Modulo_Comandi)
 -L'automa è ora gestito e richiamato solo da Modulo_Comandi

  
  
 
//***DA FARE: sistemare ancora la duplicazione dell'interfaccia dopo diversi comandi dati di seguito attraverso il menu "invia comando"
//--CAUSA: evento ricevutoReady nella funzone comandi() 


/* Parte Client per interfacciarsi con Raspberry + Interpretazione comandi */
var net = require('net');
var readLine = require('readline');
const EVENTEMITTER = require('events');
var fs = require('fs');
var requestify = require('requestify');
var inquirer = require("inquirer");
/* Leggo da file IP e porta Server Raspberry separati tramite il carattere '\r\n' */
var contenuto = fs.readFileSync('config.txt', 'utf8');
var array = contenuto.split('\r\n');
var rl = readLine.createInterface(process.stdin, process.stdout);
var ee = new EVENTEMITTER();
var fs = require('fs');
var dataOrario;
var hostdb;
var portdb;
var portapi;
var client = new net.Socket();

 

var statoConn = 0;

/* Indirizzo IP e porta Server Raspberry verranno assegnati una volta esaminato il file .txt e trascurati i commenti
i quali cominceranno col carattere '#' */
var host = '';
var port = 0;



/* Assegnamento indirizzo IP e porta Server Raspberry */
for (var i = 0; i < array.length; i++) {
    if ((array[i])[0] != '#') {
        if (array[i].split('=')[0] == "IP_SERVER") {
            var x = array[i].split('=')
            host = x[1].toString();
        } else if (array[i].split('=')[0] == "IP_DB") {
            var x = array[i].split('=')
            hostdb = x[1].toString();
        } else if (array[i].split('=')[0] == "PORTA_SERVER") {
            var y = array[i].split('=');
            port = y[1];
        } else if (array[i].split('=')[0] == "PORTA_DB") {
            var y = array[i].split('=');
            portdb = y[1];
        } else if (array[i].split('=')[0] == "PORTA_API") {
            var y = array[i].split('=');
            portapi = y[1];
        }
    }
}


var comandi_Navetta = require("./Modulo_Comandi.js")(ee, client, modifica_database, portapi);


/* Inizio parte di interazione con il DB*/
var express = require('express'); //necessario alla connessione tra il server e eventualmente una app
var mongoose = require('mongoose');//trasforma i dati del DB in un oggetto
var bodyParser = require('body-parser');//conversione in JSON dei dati
var app = express();



/*Lo Schema sarà diverso per ogni collezione.*/
var schema = mongoose.Schema;
/*I vari Schema sono posti qui e non in un js a parte per motivi di velocità di lettura*/


//PEZZI: ogni pezzo, sia esso GREZZO, LAV o FINITO 
var pezzo = mongoose.model('pezzi', new schema({
    nome: String,
    posto: Number,
    stato: String,
    tLav: Number,
    operazione: Number
}), 'pezzi');


//POSTI OPERATORE: Il posto operatore, il primo della linea dei posti. Sarà solo un documento.
var postoOperatore = mongoose.model('postiOperatore', new schema({
    posto: Number,
    stato: String
}), 'postiOperatore');


//POSTI STOCCAGGIO: Posti della linea esclusi Operatore e Lavoro. Dal 6 al 12.
var postoStoccaggio = mongoose.model('postiStoccaggio', new schema({
    posto: Number,
    stato: String
}), 'postiStoccaggio');


//POSTI LAVORO: Posti della linea in cui lavoreranno le macchine. Dal 2 al 5
var postoLavoro = mongoose.model('postiLavoro', new schema({
    posto: Number,
    stato: String,
    capacita: Number
}), 'postiLavoro');

/*
* Si deve parsare l'arrivo dei dati come JSON
*/
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


var router = require('express').Router();

//parte necessaria a bypassare il proxy.//
router.use(function (req, res, next) {
    
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3294');
    
    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    
    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    
    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);
    
    console.log('Connessione al DB')
    next();
});

//CONNESSIONE AL DB BancoDidattico//

mongoose.connect('mongodb://' + hostdb + ':' + portdb + '/BancoDidattico/');



//radice principale della route
router.get('/', function (req, res) {
    res.json({ message: 'connesso a radice principale' });
});

/*ogni parte modificabile di ogni documento di ogni collezione ha la propria route*/
/*ogni collezione avrà una route iniziale per mostrare il proprio contenuto*/




/************************************************
************INIZIO SEZIONE PEZZI*****************
************************************************/

router.route('/pezzi')
    .get(function (req, res) {
    pezzo.find(function (err, piece) {
        if (err) {
            res.sendStatus(err);
            console.log("C'e' stato un errore:" + err);
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        };
        res.json(piece);
        ee.emit('Logga', "Database", " Richiesta dei pezzi nel db");
    });
})
    .post(function (req, res) {
    var nuovoPezzo = new pezzo();
    if (req.body.nome) {
        nuovoPezzo.nome = req.body.nome;
    }
    if (req.body.posto) {
        nuovoPezzo.posto = req.body.posto * 1;
    }
    if (req.body.stato) {
        nuovoPezzo.stato = req.body.stato;
    }
    if (req.body.tLav) {
        nuovoPezzo.tLav = req.body.tLav * 1;
    }
    if (req.body.operazione) {
        nuovoPezzo.operazione = req.body.operazione * 1;
    }
    nuovoPezzo.save(function (err) {
        if (err) {
            res.send(err);
            var frase = 'An Error Has Occured: ' + err;
            console.log(frase);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        } else {
            var frase = 'Inserito nuovo pezzo:' + nuovoPezzo.nome;
            res.json({ message: 'Inserito nuovo pezzo:' + nuovoPezzo.nome });
            
            ee.emit("Logga", "Database", "Inserito un pezzo");
        }
    });
})
    .delete(function (req, res) {
    pezzo.remove(function (err, call) {
        if (err) {
            res.send(err);
            console.log('An Error Has Occured: ' + err);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        } else {
            res.json({ message: 'Tutti i pezzi sono stati cancellati' });
            
            ee.emit("Logga", "Database", 'Cancellazione di tutti i pezzi');
        }
    });
})


router.route('/pezzi/:pezzi_id')
    .get(function (req, res) {
    pezzo.findById(req.params.pezzi_id, function (err, piece) {
        if (err) {
            res.send(err);
            console.log('An Error Has Occured: ' + err);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        };
        res.send(piece);
        
        ee.emit("Logga", "Database", " Richiesta Id di un pezzo");
    });
})
    .delete(function (req, res) {
    pezzo.remove({ _id: req.params.pezzi_id }, function (err, student) {
        if (err) {
            res.send(err);
            console.log('An Error Has Occured: ' + err);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        } else {
            res.json({ message: 'Pezzo cancellato' });
            
            ee.emit("Logga", "Database", "Cancellazione di un pezzo");
        }
    });
});


router.route('/pezzi/:pezzi_id/nome')
    .get(function (req, res) {
    pezzo.findById(req.params.pezzi_id, function (err, piece) {
        if (err) {
            res.send(err);
            console.log('An Error Has Occured: ' + err);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        };
        res.send(piece.nome);
        
        ee.emit("Logga", "Database", "Richiesta nome di un pezzo");
    });
})
    .put(function (req, res) {
    pezzo.findById(req.params.pezzi_id, function (err, pezzo) {
        if (err) {
            res.sendStatus(err);
            console.log("C'e' stato un errore: " + err);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        }
        if (req.body.nome) {
            pezzo.nome = req.body.nome;
        } pezzo.save(function (err) {
            if (err) {
                res.sendStatus(err);
                console.log("C'e' stato un errore: " + err);
                
                ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
            };
            res.json({ message: 'Pezzo Aggiornato a:' + pezzo.nome });
            
            ee.emit("Logga", "Database", "Aggiorna il nome di un pezzo");
        });
    });
})


router.route('/pezzi/:pezzi_id/posto')
    .get(function (req, res) {
    pezzo.findById(req.params.pezzi_id, function (err, piece) {
        if (err) {
            res.send(err);
            console.log('An Error Has Occured: ' + err);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        };
        res.send(JSON.stringify(piece.posto));
        
        ee.emit('Logga', "Database", "Richiesta del posto di un pezzo");
    });
})
    .put(function (req, res) {
    pezzo.findById(req.params.pezzi_id, function (err, pezzo) {
        if (err) {
            res.sendStatus(err);
            console.log("C'e' stato un errore: " + err);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        };
        if (req.body.posto) {
            pezzo.posto = req.body.posto;
        }
        pezzo.save(function (err) {
            if (err) {
                res.sendStatus(err);
                console.log("C'e' stato un errore: " + err);
                
                ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
            };
            res.json({ message: 'Pezzo Aggiornato a:' + pezzo.posto });
            
            ee.emit('Logga', "Database", "Aggiornamento del posto di un pezzo");
        });
    });
})


router.route('/pezzi/:pezzi_id/stato')
    .get(function (req, res) {
    pezzo.findById(req.params.pezzi_id, function (err, piece) {
        if (err) {
            res.send(err);
            console.log('An Error Has Occured: ' + err);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        };
        res.send(piece.stato);
        
        ee.emit('Logga', "Database", "Richiesta dello stato di un pezzo");
    });
})
    .put(function (req, res) {
    pezzo.findById(req.params.pezzi_id, function (err, pezzo) {
        if (err) {
            res.sendStatus(err);
            console.log("C'e' stato un errore: " + err);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        };
        if (req.body.stato) {
            pezzo.stato = req.body.stato;
        }
        pezzo.save(function (err) {
            if (err) {
                res.sendStatus(err);
                console.log("C'e' stato un errore: " + err);
                
                ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
            };
            res.json({ message: 'Pezzo Aggiornato a:' + pezzo.stato });
            
            ee.emit('Logga', "Database", "Aggiornamento dello stato di un pezzo");
        });
    });
})


router.route('/pezzi/:pezzi_id/tLav')
    .get(function (req, res) {
    pezzo.findById(req.params.pezzi_id, function (err, piece) {
        if (err) {
            res.send(err);
            console.log('An Error Has Occured: ' + err);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        };
        res.send(JSON.stringify(piece.tLav));
        
        ee.emit('Logga', "Database", "Richiesta del tempo di lavorazione di un pezzo");
    });
})
    .put(function (req, res) {
    pezzo.findById(req.params.pezzi_id, function (err, pezzo) {
        if (err) {
            res.sendStatus(err);
            console.log("C'e' stato un errore: " + err);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        };
        if (req.body.tLav) {
            pezzo.tLav = req.body.tLav;
        }
        pezzo.save(function (err) {
            if (err) {
                res.sendStatus(err);
                console.log("C'e' stato un errore: " + err);
                
                ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
            };
            res.json({ message: 'Pezzo Aggiornato a:' + pezzo.tLav });
            
            ee.emit('Logga', "Database", "Aggiornamento del tempo di lavorazione di un pezzo");
        });
    });
})


router.route('/pezzi/:pezzi_id/operazione')
    .get(function (req, res) {
    pezzo.findById(req.params.pezzi_id, function (err, piece) {
        if (err) {
            res.send(err);
            console.log('An Error Has Occured: ' + err);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        };
        res.send(JSON.stringify(piece.operazione));
        
        ee.emit('Logga', "Database", "Richiesta dell'operazione di un pezzo");
    });
})
    .put(function (req, res) {
    pezzo.findById(req.params.pezzi_id, function (err, pezzo) {
        if (err) {
            res.sendStatus(err);
            console.log("C'e' stato un errore: " + err);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        };
        if (req.body.operazione) {
            pezzo.operazione = req.body.operazione;
        }
        pezzo.save(function (err) {
            if (err) {
                res.sendStatus(err);
                console.log("C'e' stato un errore: " + err);
                
                ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
            };
            res.json({ message: 'Pezzo Aggiornato a:' + pezzo.operazione });
            
            ee.emit('Logga', "Database", "Aggiornamento dell'operazione di un pezzo");
        });
    });
})
//----------------------------------------------------------------------------------------------------------//

/************************************************
************INIZIO SEZIONE POSTI OPERATORE******
************************************************/
router.route('/postiOperatore')
    .get(function (req, res) {
    postoOperatore.find(function (err, operatore) {
        if (err) {
            res.send(err);
            console.log("C'e' stato un errore: " + err);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        };
        res.json(operatore);
        
        ee.emit('Logga', "Database", "Richiesta di tutti i posti del posto operatore");
    });
})
    .post(function (req, res) {
    var nuovoPostoOperatore = new postoOperatore();
    
    if (req.body.posto) {
        nuovoPostoOperatore.posto = req.body.posto * 1;
    }
    if (req.body.stato) {
        nuovoPostoOperatore.stato = req.body.stato;
    }
    nuovoPostoOperatore.save(function (err) {
        if (err) {
            res.send(err);
            console.log('An Error Has Occured: ' + err);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        } else {
            res.json({ message: 'Inserito nuovo posto operatore al posto:' + nuovoPostoOperatore.posto });
            
            ee.emit('Logga', "Database", "Inserimento nuovo posto operatore");
        }
    });
})
    .delete(function (req, res) {
    postoOperatore.remove(function (err, call) {
        if (err) {
            res.send(err);
            console.log('An Error Has Occured: ' + err);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        } else {
            res.json({ message: 'Tutti i posti operatore sono stati cancellati' });
            
            ee.emit('Logga', "Database", "Cancella tutti i posti del posto operatore");
        }
    });
})


router.route('/postiOperatore/:postiOperatore_id')
    .get(function (req, res) {
    postoOperatore.findById(req.params.postiOperatore_id, function (err, operatore) {
        if (err) {
            res.send(err);
            console.log("C'e' stato un errore: " + err);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        } else {
            res.send(operatore);
            
            ee.emit('Logga', "Database", "Richiesta dell'id di un posto del posto operatore");
        }
    });
})
    .delete(function (req, res) {
    postoOperatore.remove({ _id: req.params.postiOperatore_id }, function (err, student) {
        if (err) {
            res.send(err);
            console.log('An Error Has Occured: ' + err);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        } else {
            res.json({ message: 'Posto operatore cancellato' });
            
            ee.emit('Logga', "Database", "Cancellazione dell'id di un posto operatore");
        }
    });
});


router.route('/postiOperatore/:postiOperatori_id/posto')
    .get(function (req, res) {
    postoOperatore.findById(req.params.postiOperatori_id, function (err, operatore) {
        if (err) {
            res.send(err);
            console.log("C'e' stato un errore: " + err);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        };
        res.send(JSON.stringify(operatore.posto));
        
        ee.emit('Logga', "Database", "Richiesta di un posto del posto operatore");
    });
})
    .put(function (req, res) {
    postoOperatore.findById(req.params.postiOperatori_id, function (err, operatore) {
        if (err) {
            res.send(err);
            console.log("C'e' stato un errore: " + err);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        };
        if (req.body.posto) {
            operatore.posto = req.body.posto;
        }
        operatore.save(function (err) {
            if (err) {
                res.send(err);
                console.log("C'e' stato un errore: " + err);
                
                ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
            };
            res.json({ message: 'Posto Operatore Aggiornato a:' + operatore.posto });
            
            ee.emit('Logga', "Database", "Aggiornare un posto del posto operatore");
        });
    });
})


router.route('/postiOperatore/:postiOperatori_id/stato')
    .get(function (req, res) {
    postoOperatore.findById(req.params.postiOperatori_id, function (err, operatore) {
        if (err) {
            res.send(err);
            console.log("C'e' stato un errore: " + err);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        };
        res.send(operatore.stato);
        
        ee.emit('Logga', "Database", "Richiesta di uno stato del posto operatore");
    });
})
    .put(function (req, res) {
    postoOperatore.findById(req.params.postiOperatori_id, function (err, operatore) {
        if (err) {
            res.send(err);
            console.log("C'e' stato un errore: " + err);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        };
        if (req.body.stato) {
            operatore.stato = req.body.stato;
        }
        operatore.save(function (err) {
            if (err) {
                res.send(err);
                console.log("C'e' stato un errore: " + err);
                
                ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
            };
            res.json({ message: 'Posto Operatore Aggiornato a:' + operatore.stato });
            
            ee.emit('Logga', "Database", "Aggiornamento di uno stato del posto operatore");
        });
    });
})

//----------------------------------------------------------------------------------------------------------//

/************************************************
************INIZIO SEZIONE POSTI LAVORO**********
************************************************/

router.route('/postiLavoro')
    .get(function (req, res) {
    console.log('entrato in get');
    postoLavoro.find(function (err, lavoro) {
        console.log('entrato in find');
        if (err) {
            res.send(err);
            console.log('An Error Has Occured: ' + err);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        };
        res.json(lavoro);
        console.log(JSON.stringify(lavoro));
        
        ee.emit('Logga', "Database", "Ottieni tutti i postilavoro");
    });
})
    .post(function (req, res) {
    var nuovoPostoLavoro = new postoLavoro();
    
    if (req.body.posto) {
        nuovoPostoLavoro.posto = req.body.posto * 1;
    }
    if (req.body.stato) {
        nuovoPostoLavoro.stato = req.body.stato;
    }
    if (req.body.capacita) {
        nuovoPostoLavoro.capacita = req.body.capacita;
    }
    nuovoPostoLavoro.save(function (err) {
        if (err) {
            res.send(err);
            console.log('An Error Has Occured: ' + err);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        } else {
            res.json({ message: 'Inserito nuovo posto lavoro al posto:' + nuovoPostoLavoro.posto });
            
            ee.emit('Logga', "Database", "Inserisci i postilavoro");
        }
    });
})
    .delete(function (req, res) {
    postoLavoro.remove(function (err, call) {
        if (err) {
            res.send(err);
            console.log('An Error Has Occured: ' + err);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        } else {
            res.json({ message: 'Tutti i posti lavoro sono stati cancellati' });
            
            ee.emit('Logga', "Database", "Cancella i postilavoro");
        }
    });
})

router.route('/postiLavoro/:postiLavoro_id')
    .get(function (req, res) {
    postoLavoro.findById(req.params.postiLavoro_id, function (err, lavoro) {
        if (err) {
            res.send(err);
            console.log("C'e' stato un errore: " + err);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        } else {
            res.send(lavoro);
            
            ee.emit('Logga', "Database", "Richiesta dell'id di un postolavoro");
        }
    });
})
    .delete(function (req, res) {
    postoLavoro.remove({ _id: req.params.postiLavoro_id }, function (err, student) {
        if (err) {
            res.send(err);
            console.log('An Error Has Occured: ' + err);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        } else {
            res.json({ message: 'Posto lavoro cancellato' });
            
            ee.emit('Logga', "Database", "Cancellazione dell'id di un postolavoro");
        }
    });
});


router.route('/postiLavoro/:postiLavoro_id/posto')
    .get(function (req, res) {
    postoLavoro.findById(req.params.postiLavoro_id, function (err, lavoro) {
        if (err) {
            res.send(err);
            console.log("C'e' stato un errore: " + err);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        };
        res.send(JSON.stringify(lavoro.posto));
        
        ee.emit('Logga', "Database", "Richiesta del posto di un postolavoro");
    });
})
    .put(function (req, res) {
    postoLavoro.findById(req.params.postiLavoro_id, function (err, lavoro) {
        if (err) {
            res.send(err);
            console.log("C'e' stato un errore: " + err);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        };
        if (req.body.posto) {
            lavoro.posto = req.body.posto;
        }
        lavoro.save(function (err) {
            if (err) {
                res.send(err);
                console.log("C'e' stato un errore: " + err);
                
                ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
            };
            res.json({ message: 'Posto Lavoro Aggiornato a:' + lavoro.posto });
            
            ee.emit('Logga', "Database", "Aggiornamento del posto di un postolavoro");
        }); mongoose.connection.close();
    });
})


router.route('/postiLavoro/:postiLavoro_id/stato')
    .get(function (req, res) {
    postoLavoro.findById(req.params.postiLavoro_id, function (err, lavoro) {
        if (err) {
            res.send(err);
            console.log("C'e' stato un errore: " + err);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        };
        res.send(lavoro.stato);
        
        ee.emit('Logga', "Database", "Richiesta dello stato di un postolavoro");
    });
})
    .put(function (req, res) {
    postoLavoro.findById(req.params.postiLavoro_id, function (err, lavoro) {
        if (err) {
            res.send(err);
            console.log("C'e' stato un errore: " + err);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        };
        if (req.body.stato) {
            lavoro.stato = req.body.stato;
        }
        lavoro.save(function (err) {
            if (err) {
                res.send(err);
                console.log("C'e' stato un errore: " + err);
                
                ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
            };
            res.json({ message: 'Posto Lavoro Aggiornato a:' + lavoro.stato });
            
            ee.emit('Logga', "Database", "Aggiornamento dello stato di un postolavoro");
        });
    });
})


router.route('/postiLavoro/:postiLavoro_id/capacita')
    .get(function (req, res) {
    postoLavoro.findById(req.params.postiLavoro_id, function (err, lavoro) {
        if (err) {
            res.send(err);
            console.log("C'e' stato un errore: " + err);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        };
        res.send(JSON.stringify(lavoro.capacita));
        
        ee.emit('Logga', "Database", "Richiesta della capacita di un postolavoro");
    });
})
    .put(function (req, res) {
    postoLavoro.findById(req.params.postiLavoro_id, function (err, lavoro) {
        if (err) {
            res.send(err);
            console.log("C'e' stato un errore: " + err);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        };
        if (req.body.capacita) {
            lavoro.capacita = req.body.capacita;
        }
        lavoro.save(function (err) {
            if (err) {
                res.send(err);
                console.log("C'e' stato un errore: " + err);
                
                ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
            };
            res.json({ message: 'Posto Lavoro Aggiornato a:' + lavoro.capacita });
            
            ee.emit('Logga', "Database", "Aggiornamento della capacita di un postolavoro");
        });
    });
})
//----------------------------------------------------------------------------------------------------------//

/************************************************
************INIZIO SEZIONE POSTI STOCCAGGIO******
************************************************/

router.route('/postiStoccaggio')
    .get(function (req, res) {
    postoStoccaggio.find(function (err, stoccaggio) {
        if (err) {
            res.send(err);
            console.log("C'e' stato un errore: " + err);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        };
        res.json(stoccaggio);
        
        ee.emit('Logga', "Database", "Ottenere tutti i postiStoccaggio");
    });
})
    .post(function (req, res) {
    var nuovoPostoStoccaggio = new postoStoccaggio();
    
    if (req.body.posto) {
        nuovoPostoStoccaggio.posto = req.body.posto * 1;
    }
    if (req.body.stato) {
        nuovoPostoStoccaggio.stato = req.body.stato;
    }
    nuovoPostoStoccaggio.save(function (err) {
        if (err) {
            res.send(err);
            console.log('An Error Has Occured: ' + err);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        } else {
            res.json({ message: 'Inserito nuovo posto stoccaggio al posto:' + nuovoPostoStoccaggio.posto });
            
            ee.emit('Logga', "Database", "Inserimento di un posto Stoccaggio");
        }
    });
})
    .delete(function (req, res) {
    postoStoccaggio.remove(function (err, call) {
        if (err) {
            res.send(err);
            console.log('An Error Has Occured: ' + err);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        } else {
            res.json({ message: 'Tutti i posti stoccaggio sono stati cancellati' });
            
            ee.emit('Logga', "Database", "Cancellare tutti i postiStoccaggio");
        }
    });
})


router.route('/postiStoccaggio/:postiStoccaggio_id')
    .get(function (req, res) {
    postoStoccaggio.findById(req.params.postiStoccaggio_id, function (err, stoccaggio) {
        if (err) {
            res.send(err);
            console.log("C'e' stato un errore: " + err);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        } else {
            res.send(stoccaggio);
            
            ee.emit('Logga', "Database", "Richiesta dell'id di un postoStoccaggio");
        }
    });
})
    .delete(function (req, res) {
    postoStoccaggio.remove({ _id: req.params.postiStoccaggio_id }, function (err, student) {
        if (err) {
            res.send(err);
            console.log('An Error Has Occured: ' + err);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        } else {
            res.json({ message: 'Posto stoccaggio cancellato' });
            
            ee.emit('Logga', "Database", "Cancellazione dell'id di un postoStoccaggio");
        }
    });
});


router.route('/postiStoccaggio/:postiStoccaggio_id/posto')
    .get(function (req, res) {
    postoStoccaggio.findById(req.params.postiStoccaggio_id, function (err, stoccaggio) {
        if (err) {
            res.send(err);
            console.log("C'e' stato un errore: " + err);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        };
        res.send(JSON.stringify(stoccaggio.posto));
        
        ee.emit('Logga', "Database", "Richiesta di un posto di postoStoccaggio");
    });
})
    .put(function (req, res) {
    postoStoccaggio.findById(req.params.postiStoccaggio_id, function (err, stoccaggio) {
        if (err) {
            res.send(err);
            console.log("C'e' stato un errore: " + err);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        };
        if (req.body.posto) {
            stoccaggio.posto = req.body.posto;
        }
        stoccaggio.save(function (err) {
            if (err) {
                res.send(err);
                console.log("C'e' stato un errore: " + err);
                
                ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
            };
            res.json({ message: 'Posto Operatore Aggiornato a:' + stoccaggio.posto });
            
            ee.emit('Logga', "Database", "Aggiornamento di un posto di postoStoccaggio");
        });
    });
})


router.route('/postiStoccaggio/:postiStoccaggio_id/stato')
    .get(function (req, res) {
    mongoose.connect('mongodb://128.1.164.7:27017/BancoDidattico/postiStoccaggio');
    postoStoccaggio.findById(req.params.postiStoccaggio_id, function (err, stoccaggio) {
        if (err) {
            res.send(err);
            console.log("C'e' stato un errore: " + err);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        };
        res.send(stoccaggio.stato);
        
        ee.emit('Logga', "Database", "Richiesta di uno stato di postoStoccaggio");
    });
})
    .put(function (req, res) {
    postoStoccaggio.findById(req.params.postiStoccaggio_id, function (err, stoccaggio) {
        if (err) {
            res.send(err);
            console.log("C'e' stato un errore: " + err);
            
            ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
        };
        if (req.body.stato) {
            stoccaggio.stato = req.body.stato;
        }
        stoccaggio.save(function (err) {
            if (err) {
                res.send(err);
                console.log("C'e' stato un errore: " + err);
                
                ee.emit("Logga", "ERRORE", 'An Error Has Occured: ' + err);
            };
            res.json({ message: 'Posto Stoccaggio Aggiornato a:' + stoccaggio.stato });
            
            ee.emit('Logga', "Database", "Aggiornamento di uno stato di postoStoccaggio");
        });
    });
})


app.use('/api', router);

/*
*La porta in ascolto è stata scelta dall'utente, visto che tutte le porte sono aperte. *
*/

app.listen(portapi);
console.log('Magic happens on port ' + portapi);

//creazione menu
connessioneClient();
menu();

function menu() {
    var preguntas = [
        {
            type: "list",
            message: "scegli operazione",
            name: "servicios",
            choices: [
                {
                    name: "-[1]Test Comandi"
                },
                {
                    name: "-[2]Test DB"
                },
                {
                    name: "-[3]Test cicli "
                },
                {
                    name: "-[4]Default"
                },
                {
                    name: "-[#]Esci"
                }
            ]
        }];
    inquirer.prompt(preguntas).then(function (respuestas) {
        controlloconnessione()       //effettua la connessione
        
        
        if (respuestas.servicios == "-[1]Test Comandi") { //codice per entrare nella lista test Comandi
            comandi();
            return;

        } else if (respuestas.servicios == "-[2]Test DB") {  // codice per entrare all interno della lista test db              
            database();
            return;
              
        } else if (respuestas.servicios == "-[3]Test cicli ") {  //codice per entrare all'interno della lista Test cicli
            cicli();
            return;

        } else if (respuestas.servicios == "-[4]Default") {         // default utilizzato per eventuali aggiunte
            console.log("Non c'è niente qui.");
            menu();
            return;

        } else if (respuestas.servicios == '-[#]Esci') {
            process.exit();

        } else {
            console.log("Errore");
            return;
        }
    });
};

var p;
//muove il pezzo nei posti di stoccaggio stabiliti 
function muoviStoccaggio(posIniziale, urlPezzo) {
    console.log("Entrato nella funzione muoviStoccaggio");
  
    var stoccaggio;
    controlloconnessione()
    
    //chiamata ai posti di stoccaggio
    requestify.get('http://localhost:' + portapi + '/api/postiStoccaggio').then(function (response) {
        
        stoccaggio = response.getBody();
        console.log(response.getBody());
    }).then(function (risposta) {
        
        //sposta il pezzo da posto operatore al primo posto libero
        pezzo_posto_libero(stoccaggio, urlPezzo);
        
    });
};

//muove pezzo nel posto operatore 
function muoviOperatore(posizioneAttuale, urlOp, urlPezzo) {

    console.log("Entrato in muovioperatore, posizione attuale: " + posizioneAttuale);
    //richiamo la funzione per connettere il client al server 
    controlloconnessione();
    
    comandi_Navetta.MuoviPezzo('MP', posizioneAttuale, 1)
    var putPosto = { posto: 1 };
    var putStato = { stato: 'LIBERO' };
    var url = 'http://localhost:' + portapi + '/api/postiStoccaggio/' + p._id + '/stato';
    
    ee.on('ricevutoExec', function () {
        modifica_database(url, putStato);
        
        urlPezzo += '/posto';
        modifica_database(urlPezzo, putPosto);
        
        
        putStato = { stato: 'INSCARICO' };
        modifica_database(urlOp, putStato);
	
    })
};

//esecuzione primo ciclo. La navetta si muove con il pezzo dall'operatore 
//allo stoccaggio; La navetta ritorna al posto operatore; 
//poi dal posto operatore va al posto stoccaggio, prende il pezzo e lo riporta al posto operatore.    
function cicloNominale1() {
    
    //richiamo la funzione per connettere il client al server 
    controlloconnessione()
    
    //chiamata per ottenere posti operatore
    requestify.get('http://localhost:' + portapi + '/api/postiOperatore').then(function (response) {
        
        var ids = [];
        var pos = [];
        for (var i in response.getBody()) {
            ids.push({ _id: response.getBody()[i]._id });
            pos.push({ name: response.getBody()[i].posto });
        }
        var id = [
            {
                type: "list",
                message: "Scegli posto Operatore",
                name: "postiOperatore",
                choices: pos
            }];
        inquirer.prompt(id).then(function (risposta) {
            
            var url = 'http://localhost:' + portapi + '/api/postiOperatore/'
            for (var i in pos) {
                if (risposta.postiOperatore == pos[i].name) {
                    urlOp = url + ids[i]._id;
                    
                    requestify.get(url).then(function (response) {
                        console.log(response.getBody());
                        
                        requestify.get('http://localhost:' + portapi + '/api/pezzi').then(function (response) {
                            
                            var ids = [];
                            var nome = [];
                            for (var i in response.getBody()) {
                                ids.push({ _id: response.getBody()[i]._id });
                                nome.push({ name: response.getBody()[i].nome });
                            }
                            
                            console.log('Selezionare un pezzo da caricare: ');
                            var pezziId = [
                                {
                                    type: "list",
                                    message: "Scegli pezzo",
                                    name: "pezzi",
                                    choices: nome
                                }];
                            inquirer.prompt(pezziId).then(function (risposta) {
                                
                                var url = 'http://localhost:' + portapi + '/api/pezzi/'
                                for (var i in nome) {
                                    if (risposta.pezzi == nome[i].name) {
                                        url = url + ids[i]._id;
                                        
                                        requestify.get(url).then(function (response) {
                                            var input = [
                                                {
                                                    type: "input",
                                                    message: "Premi un tasto per continuare",
                                                    name: "scelta",
                                                }];
                                            inquirer.prompt(input).then(function (risposta) {
                                                url += '/posto';
                                                var res1 = muoviStoccaggio(1, url);
                                                
                                                var put = { stato: 'LIBERO' };
                                                urlOp += '/stato';
                                                
                                                console.log("urlOp prima di evento: " + urlOp);
                                                ee.once('ricevutoExec', function () {
                                                    console.log("urlOp dopo evento: " + urlOp);
                                                    modifica_database(urlOp, put);
                                                });
                                                
                                                ee.once('ricevutoReady', function () {
                                                    console.log("Entrato in evento.on ricevutoReady");
                                                    requestify.get(url).then(function (response) {
                                                        
                                                        var temp = response.getBody();
                                                        //if (res1 == 0) {
                                                        //console.log("res1: " + res1);
                                                        var res2 = muoviOperatore(temp, urlOp, url);
                                                        // return res2;
                                                        //console.log("Ritornato res2: " + res2);
                                                        
                                                        ee.once('ricevutoReady', function () {
                                                            menu();
                                                            return;
                                                        });
                                                        //lista per tornare al menù oppure selezionare il ciclo 
                                                    });
                                                });
                                            });
                                        })
                                    }
                                }
                            });
                        })
                    })
                }
            }
        })
    })
}

//invia i dati al server richiamando una funzione al suo interno.
function invioDato(data) {
    riconosciComando(data);
}

//queste funzioni vanno messe nei timeout, se attivate vuol dire che il pacchetto è fallito in un punto
//function attendiReady(idRichiesta) {
//    ee.emit('Logga', 'ERRORE', 'Richiesta fallita su READY ID richiesta fallita: ' + idRichiesta);
    
//    console.log('Richiesta fallita su READY ' + idRichiesta);
//    clearTimeout(timeOut2);
//    clearTimeout(timeOut3);
//    rl.prompt();
//}

//function attendiExec(idRichiesta) {
//    ee.emit('Logga', 'ERRORE', 'Richiesta fallita su EXEC ID richiesta fallita: ' + idRichiesta);
    
//    console.log('Richiesta fallita su EXEC ' + idRichiesta);
//    clearTimeout(timeOut3);
//    rl.prompt();
//}

//function attendiServer(idRichiesta) {
//    ee.emit('Logga', 'ERRORE', 'Richiesta fallita su ACK ID richiesta fallita: ' + idRichiesta);
    
//    console.log('Richiesta fallita su ACK ' + idRichiesta);
//    rl.prompt();
//}

function riconosciComando(stringaGrezza) {
    // Dividere la frase in base al carattere ','    
    var array = stringaGrezza.split(',');
    
    // Inizio analisi da effettuare in base alla stringa del comando
    /* Aggiunto il .toUpperCase() per fare sì che anche se scritto in minuscolo, il comando venga riconosciuto dal Server Raspberrry */
    if (array[0].toUpperCase() == "MP") {
        /* Controllo se viene inserito un parametro negativo*/
        if (array[1] < 0 || array[2] < 0) {
            console.log("Errore, non si possono inserire parametri negativi");
            comandi();
            return;
        }
        /* Controllo sul numero di parametri, se più, o meno, dei previsti, verrà restituito un messaggio d'errore */
        if (array.length > 3 || array.length < 2) {
            console.log("Errore, bisogna inserire due parametri");
            comandi();
            return;
        }
        if ((isNaN(array[1])) || (isNaN(array[2]))) {
            console.log("Errore, i parametri devono essere dei numeri e non delle stringhe");
            comandi();
            return;
        }
        
        comandi_Navetta.MuoviPezzo(array[0].toUpperCase(), array[1], array[2]);
        return;
    } 
	
    else if (array[0].toUpperCase() == "MN") {
        /* Aggiunto il .toUpperCase() per fare sì che anche se scritto in minuscolo, 
         * /il comando venga riconosciuto dal Server Raspberrry */
        /*se viene inserito un paramtro negativo*/
        if (array[1] < 0 || array[2] < 0) {
            console.log("Errore, non si possono inserire parametri negativi");
            comandi();
            return;
        }
        
        /* Controllo sul numero di parametri, se più, o meno, dei previsti, verrà restituito un messaggio d'errore */
        if (array[2] != undefined) {
            console.log("Errore, bisogna inserire solo un parametro");
            comandi();
            return;
        }
        
        if ((isNaN(array[1]))) {
            console.log("Errore, il parametro deve essere un numero e non una stringa");
            //  contaRichieste++;
            comandi();
            return;
        }
        
        comandi_Navetta.MuoviNavetta(array[0].toUpperCase(), array[1]);
        return;
                 
    }

    else if (array[0].toUpperCase() == "OD") {
        /* Aggiunto il .toUpperCase() per fare sì che anche se scritto in minuscolo,
         * / il comando venga riconosciuto dal Server Raspberrry */

        /* Controllo sul numero di parametri, in questo caso non sono previsti parametri oltre al comando,
        quindi, se inseriti verrà restituito un messaggio d'errore */
        if (array[2] != undefined || array[1] != undefined) {
            console.log("Errore, non si devono inserire parametri");
            //  contaRichieste++;
            comandi();
            return;
        } else {
            comandi_Navetta.OttieniDati(array[0].toUpperCase());
            return;
        }
    }
    else if (array[0].toUpperCase() == "OP") {
        /* Aggiunto il .toUpperCase() per fare sì che anche se scritto in minuscolo,
         * / il comando venga riconosciuto dal Server Raspberrry */

        /* Controllo sul numero di parametri, in questo caso non sono previsti parametri oltre al comando,
        quindi, se inseriti verrà restituito un messaggio d'errore */
        if (array[2] != undefined || array[1] != undefined) {
            console.log("Errore, non si devono inserire parametri");
            //   contaRichieste++;
            comandi();
            return;
        } else {
            comandi_Navetta.OttieniPostoNavetta(array[0].toUpperCase());
            return;
        }
    } 
    else if (array[0].toUpperCase() == "RES") {
        /* Aggiunto il .toUpperCase() per fare sì che anche se scritto in minuscolo, 
         * /il comando venga riconosciuto dal Server Raspberrry */

        /* Controllo sul numero di parametri, in questo caso non sono previsti parametri oltre al comando,
        quindi, se inseriti verrà restituito un messaggio d'errore */
        if (array[2] != undefined || array[1] != undefined) {
            console.log("Errore, non si devono inserire parametri");
            //      contaRichieste++;
            comandi();
            return;
        } else {
            comandi_Navetta.Reset(array[0].toUpperCase());
            return;
        }
    }
    else {
        /* Controllo sul comando inserito, se no viene riconosciuto, tra quelli previsti, 
         * /verrà restituito un messaggio d'errore */      
        console.log("Errore, non esiste il movimento che si desidera effettuare");
        comandi();
        return;
    }
}

///* Parametri function: comando inserito dall'utente, parametri inseriti dall'utente */
//function MuoviPezzo(comando, vet1, vet2) {												//Muove pezzo da vet1 a vet2 e poi torna in posizione 1(posto operatore)
//    console.log("Entrato nella funzione MuoviPezzo");
//    //console.log("Stato richiesta: "+ statoRichiesta);
//    if (modulo.richiestaEseguibile() == false) {
        
//        return;
//    }
//    /* Aggiungo il numero di richiesta alla stringa inserita da console */
//    contaRichieste++;
//    client.write(contaRichieste + ',' + comando + ',' + vet1 + ',' + vet2 + '\n');
//    ee.emit("inputComando", 0);
//    //chiamata per ottenere un pezzo
//    ee.on('ricevutoExec', function () {
//        console.log("Entrato in evento ricevutoExec");
//        requestify.get('http://localhost:' + portapi + '/api/pezzi').then(function (response) {
            
//            var url = 'http://localhost:' + portapi + '/api/pezzi/';
//            var listaPezzi = response.getBody();
//            for (var i = 0; i < listaPezzi.length; i++) {
//                /* console.log("Entrato in for per aggiornamento db");
//	console.log("listaPezzi[0]: " + listaPezzi[0]);
//	console.log("posto di i(pezzo singolo): "+listaPezzi[i].posto);
//	console.log("vet1: "+ vet1); */
//            if (listaPezzi[i].posto == vet1) {
//                    //aggiorna il posto del pezzo 
                    
//                    /* console.log("Entrato in if");		
//				console.log("vet2 in if: " + vet2); */
//				url = url + listaPezzi[i]._id + "/posto";
//                    //console.log("url: " + url);
//                    var put = { posto: vet2 };
//                    /* requestify.put(url,put).then(function (risposta) {
//					console.log("valore posto aggiornato: "+listaPezzi[i].posto);
//                console.log(risposta.getBody().message);
//                }) */
//				modifica_database(url, put);
//                }
//            }
//        })
//    })
    
    
    
    
//    var mex = contaRichieste + ',' + comando + ',' + vet1 + ',' + vet2;
//    console.log("inviato al rPi " + mex);
//    ee.emit('Logga', "RichiestaRaspberry", mex);
//    //timeout();
//}

///* Parametri function: comando inserito dall'utente, parametro inserito dall'utente */
//function MuoviNavetta(comando, vet1) {
//    console.log("Richiesto mn");
//    console.log(modulo)
//    if (modulo.richiestaEseguibile() == false) {
//        return;
//    }
    
//    /* Aggiungo il numero di richiesta alla stringa inserita da console */
//    console.log("INVIO PACCHETTO: " + contaRichieste + ',' + comando + ',' + vet1 + '\n');
//    contaRichieste++;
//    client.write(contaRichieste + ',' + comando + ',' + vet1 + '\n');
//    ee.emit("inputComando", 0);
    
//    var mex = contaRichieste + ',' + comando + ',' + vet1;
//    ee.emit('Logga', "RichiestaRaspberry", mex);

//    //timeout();
//}

///* Parametri function: comando inserito dall'utente */
//function OttieniDati(comando) {
//    if (modulo.richiestaEseguibile() == false) {
        
//        return;
//    }
    
//    /* Aggiungo il numero di richiesta alla stringa inserita da console */
//    contaRichieste++;
//    client.write(contaRichieste + ',' + comando + '\n');
//    ee.emit("inputComando", 0);
    
//    var mex = contaRichieste + ',' + comando;
//    ee.emit('Logga', "RichiestaRaspberry", mex);

//    //timeout();
//}

///* Parametri function: comando inserito dall'utente */
//function OttieniPostoNavetta(comando) {
//    if (modulo.richiestaEseguibile() == false) {
        
//        return;
//    }
//    /* Aggiungo il numero di richiesta alla stringa inserita da console */
//    contaRichieste++;
//    client.write(contaRichieste + ',' + comando + '\n');
//    ee.emit("inputComando", 0);
    
//    var mex = contaRichieste + ',' + comando;
//    ee.emit('Logga', "RichiestaRaspberry", mex);

//    //timeout();
    
//}

///* Parametri function: comando inserito dall'utente */
//function Reset(comando) {
//    if (modulo.richiestaEseguibile() == false) {
        
//        return;
//    }
    
//    /* Aggiungo il numero di richiesta alla stringa inserita da console */
//    contaRichieste++;
//    client.write(contaRichieste + ',' + comando + '\n');
//    ee.emit("inputComando", 0);
    
//    var mex = contaRichieste + ',' + comando;
//    ee.emit('Logga', "RichiestaRaspberry", mex);

//   // timeout();    
//}

//evento per il file di log 
ee.on('Logga', function (cat, mess) {
    WriteFile(cat, mess);
});

//funzione che compila il file di log
function WriteFile(categoria, messaggio) {
    
    dataOrario = new Date().toLocaleString();
    const FILENAME = "serverFMS.log";
    
    
    if (categoria == "Connessione" || categoria == "Disconessione") {
        dati = "[" + dataOrario + "]-[" + categoria + "]-[" + messaggio + "]";
        fs.appendFileSync(FILENAME, dati += "\r\n", "UTF-8", { 'flags': 'a+' });
    } else if (categoria == "ERRORE") {
        dati = "[" + dataOrario + "]-[" + categoria + "]-[" + messaggio + "]";
        fs.appendFileSync(FILENAME, dati += "\r\n", "UTF-8", { 'flags': 'a+' });
    } else if (categoria == "Database") {
        dati = "[" + dataOrario + "]-[" + categoria + "]-[" + messaggio + "]";
        fs.appendFileSync(FILENAME, dati += "\r\n", "UTF-8", { 'flags': 'a+' });
    } else {
        dati = "[" + dataOrario + "]-[" + categoria + "]-[" + messaggio + "]";
        fs.appendFileSync(FILENAME, dati += "\r\n", "UTF-8", { 'flags': 'a+' });
    }
    fs.appendFileSync(FILENAME, "--\n");
};



client.on('data', function (data) {
    
    /* Alla ricezione di dati da parte del server, azzererò il timeout inizializzato al momento dell'invio dei dati */
    //analizzo la stringa che mi ritorna ed in base ad essa fermo i dovuti timeout
    var array = (data.toString()).split(',');
    console.log(array);
    
    if (array[1].startsWith("ack")) {
        //clearTimeout(timeOut);
        ee.emit("inputComando", 1);
    }

    else if (array[1].startsWith("exec")) {
        //clearTimeout(timeOut);
        ee.emit("inputComando", 3)
        console.log("Ricevuto Exec");
        ee.emit('ricevutoExec');
        console.log("Lanciato evento 'ricevutoExec'");
    }

    else if (array[1].startsWith("ready")) {
        //clearTimeout(timeOut3);
        ee.emit("inputComando", 5)
        ee.emit('ricevutoReady');
        console.log("Lanciato evento 'ricevutoReady'");
    }

    else if (array[1].startsWith("nack")) {
        ee.emit("inputComando", 2);
    }

    else if (array[1].startsWith("err")) {
        ee.emit("inputComando", 4);
    }
    
    ee.emit('Logga', 'RispostaRaspberry', data);
    rl.setPrompt('>');
    rl.prompt();
    
/* client.on('data', function (data) {

    /* Alla ricezione di dati da parte del server, azzererò il timeout inizializzato al momento dell'invio dei dati */
/*   /*   //analizzo la stringa che mi ritorna ed in base ad essa fermo i dovuti timeout
    var array = (data.toString()).split(',');
console.log(array);
    if (array[1] == "ack\n") {
        clearTimeout(timeOut);
        statoRichiesta = 2;
    }
    //per ora il server raspberry ha un errore dove exec e ready sono nello stesso messaggio, quindi ci siamo adattati.
    if (array[1].slice(0, 4) == "exec" || array[1] == "exec\n0" || array[1] == "exec\n" || array[1] == "exec") {

        clearTimeout(timeOut2);
        statoRichiesta = 3;
		console.log("Ricevuto Exec");
		ee.emit('ricevutoExec');
		console.log("Lanciato evento 'ricevutoExec'");
        //l'altro errore è che exec arriva non separato da virgola con i parametri: quidndi lo estraiamo
        /* if (array[1] == "ready\n" || array[2] == "ready\n") {
            clearTimeout(timeOut3);
            statoRichiesta = 0;
			ee.emit('ricevutoReady');
			console.log("Lanciato evento 'ricevutoReady'");                                                        //COMMENTATO TEMPORANEAMENTE(FORSE)
        } */
 /*    }
    if (array[1] == "ready\n" || array[2] == "ready\n") {
        //ready è l'ultimo pezzo del messaggio e contiene /n alla fine quindi lo dobbiamo estrarre,
        //cambia posizione a seconda del messaggio di risposta
        clearTimeout(timeOut3);
        statoRichiesta = 0;
		ee.emit('ricevutoReady');
		console.log("Lanciato evento 'ricevutoReady'");
    }  
    clearTimeout(timeOut);

    ee.emit('Logga', 'RispostaRaspberry', data);
    rl.setPrompt('>');
    rl.prompt(); */ 		 																		
})

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
    
    client.setTimeout(7000, function () {
        client.connect(port, host, function () {
            
            console.log('CLIENT CONNESSO A: ' + host + ':' + port);
            ee.emit('Logga', 'Connessione', 'Connesso al Server Raspberry');
            
            rl.prompt();
            // Appena questo client si collega con successo al server, inviamo dei dati che saranno
            //ricevuti dal server quale messaggio dal client
        });
    });
});

//utilizzata per l'inserimento dei comandi.
function comandi() {
    controlloconnessione();
    var permesso = [
        {
            type: 'list',
            name: 'comando',
            message: 'Scegli', 
            choices: [
                "Invia comando",
                "menù"
            ]
        }];
    inquirer.prompt(permesso).then(function (respuestas) {
        if (respuestas.comando == "menù") {
            menu();
            return;
        }
        else if (respuestas.comando == "Invia comando") {
            permesso2 = [
                {
                    type: 'input',
                    name: 'comando',
                    message: 'Inserire comando', 
                }];
            inquirer.prompt(permesso2).then(function (risposta) {
                invioDato(risposta.comando);
                
                ee.once('ricevutoReady', function () {
                    console.log("menù comandi chiamato da funzione comandi");
                    comandi();
                    return;	
                });
            })
            return;
        }
        return;
    });
    return;
};

// funzione riguaradante i pezzi
function seconda() {
    //creo secondo oggetto
    var query1 = 
 [{
            type: "list",
            message: "Scegli Query",
            name: "query",
            choices: [
                {
                    name: "Cancellare",      
                },
                {
                    name: "Inserire"
                },
                {
                    name: "Ottenere"
                },
                {
                    name: "Modificare"
                },
                {
                    name: "Torna a scelta posto"
                },
                {
                    name: "menù"
                }
            ],
        }
    ];// stampa l'elenco delle operazioni (per i pezzi)
    inquirer.prompt(query1).then(function (risposta) {
        if (risposta.query == "Cancellare") {
            
            cancellare_pezzi();
                      
        } else if (risposta.query == "Inserire") {
            
            inserire_pezzi();
                      
        } else if (risposta.query == "Ottenere") {
            
            ottenere_pezzi();
                      
        } else if (risposta.query == "Modificare") {
            
            modificare_pezzi();
                       
        } else if (risposta.query == "Torna a scelta posto") {
            
            database();
        } else if (risposta.query == "menù") {
            menu();
            return;

        }
    });
};

//funzione utilizzata quando si vuole tornare alla lista.
function database() {
    
    var bancoDidattico = [
        {
            type: "list",
            name: "progetto",
            message: "Scegli",
            choices: [
                "Pezzi",
                "postiOperatore",
                "postiStoccaggio",
                "postiLavoro",
                "menù"
            ]
        }]; // stampa oggetto
    inquirer.prompt(bancoDidattico).then(function (risposta) {
        if (risposta.progetto == "Pezzi") {
            
            seconda();

        } else if (risposta.progetto == "postiOperatore") {
            
            seconda1(risposta.progetto);
       
        } else if (risposta.progetto == "postiStoccaggio") {
            
            seconda1(risposta.progetto);
       
        } else if (risposta.progetto == "postiLavoro") {
            
            seconda1(risposta.progetto);
        } else if (risposta.progetto == "menù") {
            
            menu()
            return;
        }
    });
}

// funzione che riguarda i posti
function seconda1(tipo) {
    
    var query1 = 
 [{
            type: "list",
            message: "Scegli Query",
            name: "query",
            choices: [
                {
                    name: "Cancellare",      
                },
                {
                    name: "Inserire"
                },
                {
                    name: "Ottenere"
                },
                {
                    name: "Modificare"
                },
                {
                    name: "torna scelta posto"
                }, 
                {
                    name: "menù"
                }
            ],
        }
    ]; // stampa l'elenco delle operazioni (per i posti)
    inquirer.prompt(query1).then(function (risposta) {
        
        if (risposta.query == "Cancellare") {
            
            cancellare_posti(tipo);
                       
        } else if (risposta.query == "Inserire") {
            
            inserire_posti(tipo);
                       
        } else if (risposta.query == "Ottenere") {
            
            ottenere_posti(tipo);
                       
        } else if (risposta.query == "Modificare") {
            
            modificare_posti(tipo);
                       
        } else if (risposta.query == "menù") {
            
            menu();
            return;

        } else if (risposta.query == "torna scelta posto") {
            
            database();
        }
    });
};

// funzione per cancellare i pezzi richiesti dall utente
function cancellare_pezzi() {
    
    var pezzi = [
        {
            type: "list",
            message: "Scegli Query",
            name: "pezzetto",
            choices: [
                {
                    name: "pezzo singolo"
                },
                {
                    name: "tutti i pezzi"
                },
                {
                    name: "torna scelta posto"
                }, 
                {
                    name: "menù"
                }
            ]
        }];
    inquirer.prompt(pezzi).then(function (risposta) {
        
        if (risposta.pezzetto == "pezzo singolo") {
            console.log("Cancellazione di un pezzo singolo");
            
            //chiamata per ottenere pezzo
            requestify.get('http://localhost:' + portapi + '/api/pezzi').then(function (response) {
                
                //entra nel database e prende l id e il nome del pezzo da cancellare
                id_nome_pezzo_canc();
               
            })
        } else if (risposta.pezzetto == "tutti i pezzi") {
            console.log('Cancellazione di tutti i pezzi');
            
            var url = 'http://localhost:' + portapi + '/api/pezzi/'
            //chiamata per ottenere tutti i pezzi
            requestify.delete(url).then(function (response) {
                console.log(response.getBody().message);
                
                opzioniMenu();
            })
        } else if (risposta.pezzetto == "menù") {
            menu();
            return;

        } else if (risposta.pezzetto == "torna scelta posto") {
            database();

        } else {
            console.log('ERRORE!');
            
            opzioniMenu();
        }
    });
};

// funzione per inserire i pezzi richiesti dall utente
function inserire_pezzi() {
    var pezzi = [
        {
            type: "list",
            message: "Scegli Query",
            name: "pezzetto",
            choices: [{
                    name: 'pezzo singolo'
                },
                {
                    name: "Torna a scelta posto"
                },
                {
                    name: "Menù"
                }
            ]
        
        }];
    inquirer.prompt(pezzi).then(function (risposta) {
        
        if (risposta.pezzetto == "pezzo singolo") {
            console.log("Inserimento del pezzo :");
            
            //dati da inserire per creare un pezzo da inserire
            dati_pezzo_nuovo();
                           
        } else if (risposta.pezzetto == "Torna a scelta posto") {
            database();

        } else if (risposta.pezzetto == "Menù") {
            menu();
            return;

        } else {
            console.log('ERRORE!');
            opzioniMenu();
        }
    });
};

// funzione per ottenere i pezzi richiesti dall utente
function ottenere_pezzi() {
    
    var pezzi = [
        {
            type: "list",
            message: "Scegli Query",
            name: "pezzetto",
            choices: [
                {
                    name: "pezzo singolo"
                },
                {
                    name: "tutti i pezzi"
                },
                {
                    name: "Torna a scelta posto"
                },
                {
                    name: "menù"
                }
            ]
        }];
    inquirer.prompt(pezzi).then(function (risposta) {
        if (risposta.pezzetto == "pezzo singolo") {
            console.log("Ottenere un pezzo :");
            
            //chiamata per ottenere un pezzo
            requestify.get('http://localhost:' + portapi + '/api/pezzi').then(function (response) {
                
                //entra nel database e prende l id e il nome del pezzo che si vuole ottenere
                id_nome_pezzo_ott();
            })
        } else if (risposta.pezzetto == "tutti i pezzi") {
            console.log('Ottenere dei pezzi :');
            
            //chiamata per ottenere i pezzi
            requestify.get('http://localhost:' + portapi + '/api/pezzi').then(function (response) {
                console.log(response.getBody());
                
                opzioniMenu();
            })
        } else if (risposta.pezzetto == "Torna a scelta posto") {
            database();

        } else if (risposta.pezzetto == "menù") {
            menu();
            return;

        } else {
            console.log('ERRORE!');
            opzioniMenu();
        }
    });
};

// funzione per modificare i pezzi richiesti dall utente
function modificare_pezzi() {
    var pezzi = [
        {
            type: "list",
            message: "Scegli Query",
            name: "pezzetto",
            choices: [
                {
                    name: "pezzo singolo"
                }, {
                    name: "Torna a scelta posto"
                },
                {
                    name: "menù"
                }
            ]
        }];
    inquirer.prompt(pezzi).then(function (risposta) {
        if (risposta.pezzetto == "pezzo singolo") {
            console.log('Modificare un pezzo :');
            
            //chiamata per ottenere un pezzo
            requestify.get('http://localhost:' + portapi + '/api/pezzi').then(function (response) {
                
                // Get the response body (JSON parsed or jQuery object for XMLs)
                var ids = [];
                var nome = [];
                for (var i in response.getBody()) {
                    ids.push({ _id: response.getBody()[i]._id });
                    nome.push({ name: response.getBody()[i].nome });
                }
                var pezziId = [
                    {
                        type: "list",
                        message: "Scegli pezzo",
                        name: "pezzi",
                        choices: nome
                    }];
                inquirer.prompt(pezziId).then(function (risposta) {
                    
                    //scelgo cosa voglio modificare del pezzo 
                    
                    scelta_modifica(risposta, ids, nome);
                });
            });
        } else if (risposta.pezzetto == "menù") {
            menu();
            return;

        } else if (risposta.pezzetto == "Torna a scelta posto") {
            database();

        } else {
            console.log('ERRORE!');
            
            opzioniMenu();
        }
    });
}




// funzione per cancellare i posti richiesti dall utente
function cancellare_posti(tipo) {
    
    var posto = [
        {
            type: "list",
            message: "Scegli Query",
            name: "post",
            choices: [
                {
                    name: "posto singolo"
                },
                {
                    name: "tutti i posti"
                },
                
                {
                    name: "torna a scelta posto"
                },
                {
                    name: "menù"
                }
            ]
        }];
    inquirer.prompt(posto).then(function (risposta) {
        
        if (risposta.post == "posto singolo") {
            console.log("Cancellazione del posto  :");
            
            if (tipo == 'postiOperatore') {
                requestify.get('http://localhost:' + portapi + '/api/postiOperatore').then(function (response) {
                    
                    // Get the response body (JSON parsed or jQuery object for XMLs)
                    var ids = [];
                    var pos = [];
                    for (var i in response.getBody()) {
                        ids.push({ _id: response.getBody()[i]._id });
                        pos.push({ name: response.getBody()[i].posto });
                    }
                    var id = [
                        {
                            type: "list",
                            message: "Scegli posto Operatore",
                            name: "postiOperatore",
                            choices: pos
                        }];
                    inquirer.prompt(id).then(function (risposta) {
                        
                        var url = 'http://localhost:' + portapi + '/api/postiOperatore/'
                        for (var i in pos) {
                            if (risposta.postiOperatore == pos[i].name) {
                                url = url + ids[i]._id;
                                requestify.delete(url).then(function (response) {
                                    console.log(response.getBody().message);
                                    
                                    opzioniMenu();
                                })
                            }
                        }
                    })
                });
            } else if (tipo == 'postiStoccaggio') {
                
                requestify.get('http://localhost:' + portapi + '/api/postiStoccaggio').then(function (response) {
                    
                    // Get the response body (JSON parsed or jQuery object for XMLs)
                    var ids = [];
                    var pos = [];
                    for (var i in response.getBody()) {
                        ids.push({ _id: response.getBody()[i]._id });
                        pos.push({ name: response.getBody()[i].posto });
                    }
                    var id = [
                        {
                            type: "list",
                            message: "Scegli posto Stoccaggio",
                            name: "postiStoccaggio",
                            choices: pos
                        }];
                    inquirer.prompt(id).then(function (risposta) {
                        
                        
                        var url = 'http://localhost:' + portapi + '/api/postiStoccaggio/'
                        for (var i in pos) {
                            if (risposta.postiStoccaggio == pos[i].name) {
                                url = url + ids[i]._id;
                                requestify.delete(url).then(function (response) {
                                    console.log(response.getBody().message);
                                    
                                    opzioniMenu();
                                })
                            }
                        }
                    })
                });
            } else if (tipo == 'postiLavoro') {
                
                requestify.get('http://localhost:' + portapi + '/api/postiLavoro').then(function (response) {
                    
                    // Get the response body (JSON parsed or jQuery object for XMLs)
                    var ids = [];
                    var pos = [];
                    for (var i in response.getBody()) {
                        ids.push({ _id: response.getBody()[i]._id });
                        pos.push({ name: response.getBody()[i].posto });
                    }
                    var id = [
                        {
                            type: "list",
                            message: "Scegli posto Lavoro",
                            name: "postiLavoro",
                            choices: pos
                        }];
                    inquirer.prompt(id).then(function (risposta) {
                        
                        
                        var url = 'http://localhost:' + portapi + '/api/postiLavoro/'
                        for (var i in pos) {
                            if (risposta.postiLavoro == pos[i].name) {
                                url = url + ids[i]._id;
                                requestify.delete(url).then(function (response) {
                                    console.log(response.getBody().message);
                                    
                                    opzioniMenu();
                                })
                            }
                        }
                    })
                })
            } else {
                console.log('ERRORE');
                opzioniMenu();
            }
        } else if (risposta.post == "tutti i posti") {
            console.log('Cancellazione dei posti :');
            
            if (tipo == 'postiOperatore') {
                var url = 'http://localhost:' + portapi + '/api/postiOperatore/';
                
                requestify.delete(url).then(function (response) {
                    console.log(response.getBody().message);
                    
                    opzioniMenu();
                });
            } else if (tipo == 'postiStoccaggio') {
                var url = 'http://localhost:' + portapi + '/api/postiStoccaggio/';
                requestify.delete(url).then(function (response) {
                    console.log(response.getBody().message);
                    
                    opzioniMenu();
                });
            } else if (tipo == 'postiLavoro') {
                var url = 'http://localhost:' + portapi + '/api/postiLavoro/';
                
                requestify.delete(url).then(function (response) {
                    console.log(response.getBody().message);
                    
                    opzioniMenu();
                });
            } else {
                console.log('ERRORE');
                
                opzioniMenu();
            }
        } else if (risposta.post == "torna a scelta posto") {
            database();

        } else if (risposta.post == "menù") {
            menu();
            return;

        } else {
            console.log('ERRORE!');
            opzioniMenu();
        }
    });
};

// funzione per inserire i posti richiesti dall utente
function inserire_posti(tipo) {
    
    var posto = [
        {
            type: "list",
            message: "Scegli Query",
            name: "post",
            choices: [
                {
                    name: "posto singolo"
                },
                {
                    name: "Torna a scelta posto"
                },
                {
                    name: "menù"
                }]
        }];
    inquirer.prompt(posto).then(function (risposta) {
        
        
        if (risposta.post == "posto singolo") {
            console.log("Inserimento del posto  :");
            
            if (tipo == 'postiOperatore') {
                
                var url = 'http://localhost:' + portapi + '/api/postiOperatore/'
                var nuovoOperatore = [
                    {
                        type: "input",
                        message: "Scegli posto: ",
                        name: "posto"
                    },
                    {
                        type: "input",
                        message: "Scegli stato: ",
                        name: "stato"
                    }];
                inquirer.prompt(nuovoOperatore).then(function (risposta) {
                    
                    var operatore = {
                        posto: risposta.posto,
                        stato: risposta.stato
                    };
                    requestify.post(url, operatore).then(function (risposta) {
                        console.log(risposta.getBody().message);
                        
                        opzioniMenu();
                    })
                })
            } else if (tipo == 'postiStoccaggio') {
                
                var url = 'http://localhost:' + portapi + '/api/postiStoccaggio/'
                var nuovoStoccaggio = [
                    {
                        type: "input",
                        message: "Scegli posto: ",
                        name: "posto"
                    },
                    {
                        type: "input",
                        message: "Scegli stato: ",
                        name: "stato"
                    }];
                inquirer.prompt(nuovoStoccaggio).then(function (risposta) {
                    
                    var stoccaggio = {
                        posto: risposta.posto,
                        stato: risposta.stato
                    };
                    requestify.post(url, stoccaggio).then(function (risposta) {
                        console.log(risposta.getBody().message);
                        
                        opzioniMenu();
                    })
                })
            } else if (tipo == 'postiLavoro') {
                
                var url = 'http://localhost:' + portapi + '/api/postiLavoro/'
                var nuovoLavoro = [
                    {
                        type: "input",
                        message: "Scegli posto: ",
                        name: "posto"
                    },
                    {
                        type: "input",
                        message: "Scegli stato: ",
                        name: "stato"
                    },
                    {
                        type: "input",
                        message: "Scegli capacita': ",
                        name: "capacita"
                    }];
                inquirer.prompt(nuovoLavoro).then(function (risposta) {
                    
                    var stoccaggio = {
                        posto: risposta.posto,
                        stato: risposta.stato,
                        capacita: risposta.capacita
                    };
                    requestify.post(url, stoccaggio).then(function (risposta) {
                        console.log(risposta.getBody().message);
                        
                        opzioniMenu();
                    })
                })
            } else {
                console.log('ERRORE');
                
                opzioniMenu();
            }
        } else {
            console.log('ERRORE!');
            
            opzioniMenu();
        }
    });
}

// funzione per ottenere i posti richiesti dall utente
function ottenere_posti(tipo) {
    
    var posto = [
        {
            type: "list",
            message: "Scegli Query",
            name: "post",
            choices: [
                {
                    name: "posto singolo"
                },
                {
                    name: "tutti i posti"
                },
               
                {
                    name: "Torna a scelta posto"
                },
                {
                    name: "Menù"
                }
            ]
        }];
    inquirer.prompt(posto).then(function (risposta) {
        
        if (risposta.post == "posto singolo") {
            console.log("Ottenere il posto :");
            if (tipo == 'postiOperatore') {
                requestify.get('http://localhost:' + portapi + '/api/postiOperatore').then(function (response) {
                    
                    // Get the response body (JSON parsed or jQuery object for XMLs)
                    var ids = [];
                    var pos = [];
                    for (var i in response.getBody()) {
                        ids.push({ _id: response.getBody()[i]._id });
                        pos.push({ name: response.getBody()[i].posto });
                    }
                    var id = [
                        {
                            type: "list",
                            message: "Scegli posto Operatore",
                            name: "postiOperatore",
                            choices: pos
                        }];
                    inquirer.prompt(id).then(function (risposta) {
                        
                        
                        var url = 'http://localhost:' + portapi + '/api/postiOperatore/'
                        for (var i in pos) {
                            if (risposta.postiOperatore == pos[i].name) {
                                url = url + ids[i]._id;
                                requestify.get(url).then(function (response) {
                                    console.log(response.getBody());
                                    
                                    opzioniMenu();
                                })
                            }
                        }
                    })
                })
            } else if (tipo == 'postiStoccaggio') {
                requestify.get('http://localhost:' + portapi + '/api/postiStoccaggio').then(function (response) {
                    
                    // Get the response body (JSON parsed or jQuery object for XMLs)
                    var ids = [];
                    var pos = [];
                    for (var i in response.getBody()) {
                        ids.push({ _id: response.getBody()[i]._id });
                        pos.push({ name: response.getBody()[i].posto });
                    }
                    var id = [
                        {
                            type: "list",
                            message: "Scegli posto Stoccaggio",
                            name: "postiStoccaggio",
                            choices: pos
                        }];
                    inquirer.prompt(id).then(function (risposta) {
                        
                        var url = 'http://localhost:' + portapi + '/api/postiStoccaggio/'
                        for (var i in pos) {
                            if (risposta.postiStoccaggio == pos[i].name) {
                                url = url + ids[i]._id;
                                
                                requestify.get(url).then(function (response) {
                                    console.log(response.getBody());
                                    
                                    opzioniMenu();
                                })
                            }
                        }
                    })
                })
            } else if (tipo == 'postiLavoro') {
                
                requestify.get('http://localhost:' + portapi + '/api/postiLavoro').then(function (response) {
                    
                    // Get the response body (JSON parsed or jQuery object for XMLs)
                    var ids = [];
                    var pos = [];
                    for (var i in response.getBody()) {
                        ids.push({ _id: response.getBody()[i]._id });
                        pos.push({ name: response.getBody()[i].posto });
                    }
                    var id = [{
                            type: "list",
                            message: "Scegli posto Lavoro",
                            name: "postiLavoro",
                            choices: pos
                        }];
                    inquirer.prompt(id).then(function (risposta) {
                        
                        var url = 'http://localhost:' + portapi + '/api/postiLavoro/'
                        for (var i in pos) {
                            if (risposta.postiLavoro == pos[i].name) {
                                url = url + ids[i]._id;
                                
                                requestify.get(url).then(function (response) {
                                    console.log(response.getBody());
                                    
                                    opzioniMenu();
                                })
                            }
                        }
                    })
                })
            } else {
                console.log('ERRORE!');
                
                opzioniMenu();
            }
        } else if (risposta.post == "tutti i posti") {
            console.log('Ottenere i posti :');
            
            if (tipo == 'postiOperatore') {
                requestify.get('http://localhost:' + portapi + '/api/postiOperatore').then(function (response) {
                    console.log(response.getBody());
                    
                    opzioniMenu();
                })
            } else if (tipo == 'postiStoccaggio') {
                
                requestify.get('http://localhost:' + portapi + '/api/postiStoccaggio').then(function (response) {
                    console.log(response.getBody());
                    
                    opzioniMenu();
                })
            } else if (tipo == 'postiLavoro') {
                
                requestify.get('http://localhost:' + portapi + '/api/postiLavoro').then(function (response) {
                    console.log(response.getBody());
                    
                    opzioniMenu();
                })
            }
        } else if (risposta.post == "Menù") {
            menu();
            return;

        } else if (risposta.post == "Torna a scelta posto") {
            database();

        } else {
            console.log('ERRORE!');
            
            opzioniMenu();
        }
    });
};

// funzione per modificare i posti richiesti dall utente
function modificare_posti(tipo) {
    var posto = [
        {
            type: "list",
            message: "Scegli Query",
            name: "post",
            choices: [
                {
                    name: "posto singolo"
                },
                {
                    name: "Torna a scelta posto"
                },
                {
                    name: "Menù"
                }
            ]
        }];
    inquirer.prompt(posto).then(function (risposta) {
        
        
        if (risposta.post == "posto singolo") {
            
            console.log('Modificare il posto :');
            if (tipo == 'postiOperatore') {
                
                requestify.get('http://localhost:' + portapi + '/api/postiOperatore').then(function (response) {
                    
                    // Get the response body (JSON parsed or jQuery object for XMLs)
                    var ids = [];
                    var pos = [];
                    for (var i in response.getBody()) {
                        ids.push({ _id: response.getBody()[i]._id });
                        pos.push({ name: response.getBody()[i].posto });
                    }
                    var id = [
                        {
                            type: "list",
                            message: "Scegli posto Operatore",
                            name: "postiOperatore",
                            choices: pos
                        }];
                    inquirer.prompt(id).then(function (risposta) {
                        
                        var url = 'http://localhost:' + portapi + '/api/postiOperatore/'
                        for (var i in pos) {
                            if (risposta.postiOperatore == pos[i].name) {
                                url = url + ids[i]._id;
                            }
                        }
                        var mod = [{
                                type: 'list',
                                message: "Scegli cosa modificare: ",
                                name: 'modifica',
                                choices: [
                                    'Posto',
                                    'Stato'
                                ]
                            }]
                        inquirer.prompt(mod).then(function (risposta) {
                            
                            if (risposta.modifica == 'Posto') {
                                url += '/posto';
                                
                                var operatoreModificato = [
                                    {
                                        type: "input",
                                        message: "Scegli posto: ",
                                        name: "posto"
                                    }]
                                inquirer.prompt(operatoreModificato).then(function (risposta) {
                                    requestify.put(url, { posto: risposta.posto }).then(function (risposta) {
                                        console.log(risposta.getBody().message);
                                        
                                        opzioniMenu();
                                    })
                                })
                            } else if (risposta.modifica == 'Stato') {
                                url += '/stato';
                                
                                var operatoreModificato = [
                                    {
                                        type: "input",
                                        message: "Scegli stato: ",
                                        name: "stato"
                                    }]
                                inquirer.prompt(operatoreModificato).then(function (risposta) {
                                    requestify.put(url, { stato: risposta.stato }).then(function (risposta) {
                                        console.log(risposta.getBody().message);
                                        
                                        opzioniMenu();
                                    })
                                })
                            } else {
                                console.log('ERRORE');
                                
                                opzioniMenu();
                            }
                        })
                    })
                })
            } else if (tipo == 'postiStoccaggio') {
                requestify.get('http://localhost:' + portapi + '/api/postiStoccaggio').then(function (response) {
                    
                    // Get the response body (JSON parsed or jQuery object for XMLs)
                    var ids = [];
                    var pos = [];
                    for (var i in response.getBody()) {
                        ids.push({ _id: response.getBody()[i]._id });
                        pos.push({ name: response.getBody()[i].posto });
                    }
                    var id = [
                        {
                            type: "list",
                            message: "Scegli posto Stoccaggio",
                            name: "postiOperatore",
                            choices: pos
                        }];
                    inquirer.prompt(id).then(function (risposta) {
                        
                        var url = 'http://localhost:' + portapi + '/api/postiStoccaggio/'
                        for (var i in pos) {
                            if (risposta.postiOperatore == pos[i].name) {
                                url = url + ids[i]._id;
                            }
                        }
                        var mod = [{
                                type: 'list',
                                message: "Scegli cosa modificare: ",
                                name: 'modifica',
                                choices: [
                                    'Posto',
                                    'Stato'
                                ]
                            }]
                        inquirer.prompt(mod).then(function (risposta) {
                            
                            if (risposta.modifica == 'Posto') {
                                url += '/posto';
                                
                                var stoccaggioModificato = [
                                    {
                                        type: "input",
                                        message: "Scegli posto: ",
                                        name: "posto"
                                    }]
                                inquirer.prompt(stoccaggioModificato).then(function (risposta) {
                                    requestify.put(url, { posto: risposta.posto }).then(function (risposta) {
                                        console.log(risposta.getBody().message);
                                        
                                        opzioniMenu();
                                    })
                                })
                            } else if (risposta.modifica == 'Stato') {
                                url += '/stato';
                                
                                var stoccaggioModificato = [
                                    {
                                        type: "input",
                                        message: "Scegli stato: ",
                                        name: "stato"
                                    }]
                                inquirer.prompt(stoccaggioModificato).then(function (risposta) {
                                    requestify.put(url, { stato: risposta.stato }).then(function (risposta) {
                                        console.log(risposta.getBody().message);
                                        
                                        opzioniMenu();
                                    })
                                })
                            } else {
                                console.log('ERRORE');
                                
                                opzioniMenu();
                            }
                        })
                    })
                })
            } else if (tipo == 'postiLavoro') {
                requestify.get('http://localhost:' + portapi + '/api/postiLavoro').then(function (response) {
                    
                    // Get the response body (JSON parsed or jQuery object for XMLs)
                    var ids = [];
                    var pos = [];
                    for (var i in response.getBody()) {
                        ids.push({ _id: response.getBody()[i]._id });
                        pos.push({ name: response.getBody()[i].posto });
                    }
                    var id = [
                        {
                            type: "list",
                            message: "Scegli posto Lavoro",
                            name: "postiLavoro",
                            choices: pos
                        }];
                    inquirer.prompt(id).then(function (risposta) {
                        
                        var url = 'http://localhost:' + portapi + '/api/postiLavoro/'
                        for (var i in pos) {
                            if (risposta.postiLavoro == pos[i].name) {
                                url = url + ids[i]._id;
                            }
                        }
                        var mod = [{
                                type: 'list',
                                message: "Scegli cosa modificare: ",
                                name: 'modifica',
                                choices: [
                                    'Posto',
                                    'Stato',
                                    "Capacita'"
                                ]
                            }]
                        inquirer.prompt(mod).then(function (risposta) {
                            
                            if (risposta.modifica == 'Posto') {
                                url += '/posto';
                                var lavoroModificato = [
                                    {
                                        type: "input",
                                        message: "Scegli posto: ",
                                        name: "posto"
                                    }]
                                inquirer.prompt(lavoroModificato).then(function (risposta) {
                                    requestify.put(url, { posto: risposta.posto }).then(function (risposta) {
                                        console.log(risposta.getBody().message);
                                        
                                        opzioniMenu();
                                    })
                                })
                            } else if (risposta.modifica == 'Stato') {
                                url += '/stato';
                                
                                var lavoroModificato = [
                                    {
                                        type: "input",
                                        message: "Scegli stato: ",
                                        name: "stato"
                                    }]
                                inquirer.prompt(lavoroModificato).then(function (risposta) {
                                    requestify.put(url, { stato: risposta.stato }).then(function (risposta) {
                                        console.log(risposta.getBody().message);
                                        
                                        opzioniMenu();
                                    })
                                })
                            } else if (risposta.modifica == "Capacita'") {
                                url += '/capacita';
                                
                                var lavoroModificato = [
                                    {
                                        type: "input",
                                        message: "Scegli capacita': ",
                                        name: "capacita"
                                    }]
                                inquirer.prompt(lavoroModificato).then(function (risposta) {
                                    requestify.put(url, { capacita: risposta.capacita }).then(function (risposta) {
                                        console.log(risposta.getBody().message);
                                        
                                        opzioniMenu();
                                    })
                                })
                            } else {
                                console.log('ERRORE');
                                
                                opzioniMenu();
                            }
                        })
                    })
                })
            } else {
                console.log('ERRORE');
                
                opzioniMenu();
            }
        } else if (risposta.post == "Menù") {
            menu();
            return;

        } else if (risposta.post == "Torna a scelta posto") {
            database();

        } else {
            console.log('ERRORE!');
            
            opzioniMenu();
        }
    });
}

//ti permette di sceglire tra eseguire il ciclo oppure tornare al menù.
function cicli() {
    
    var ciclo = [
        {
            type: "list",
            name: "cicli",
            message: "Scegli",
            choices: [
                {
                    name : "Ciclo1"
                },
                {
                    name : "menù"
                }
            ]
        }]; // stampa oggetto 
    inquirer.prompt(ciclo).then(function (risposta) {
        
        
        if (risposta.cicli == "Ciclo1") {
            console.log('esecuzione ciclo');
            var res = cicloNominale1();
            if (res == 0) {
                opzioniCicli();
            }
        } else if (risposta.cicli == "menù") {
            menu();
            return;

        }
    })
}

//effettua la connessione tra client e server
function connessioneClient() {
    if (statoConn == 0) {     
        client.connect(port, host, function () {
            statoConn = 1;
            ee.emit('Logga', 'Connessione', 'Connesso al Server Raspberry');
        })
    }
};

//controlla che sia attiva o no la connessione 
function controlloconnessione() {
    console.log("Entrato nella funzione controlloconnessione");
    if (statoConn == 0) {
        client.connect(port, host, function () {
            statoConn = 1;
            ee.emit('Logga', 'Connessione', 'Connesso al Server Raspberry');
        })
            // Appena questo client si collega con successo al server, inviamo dei dati che saranno ricevuti dal server quale messaggio dal client
      
    }
}
//permette di tornare indietro e al menu 
function opzioniMenu() {
    var option = [
        {
            type: "list",
            name: "progetto",
            message: "Scegli",
            choices: [
                "Menù",
                "torna scelta posto"
            ]
        }]; // stampa oggetto
    inquirer.prompt(option).then(function (risposta) {
        if (risposta.progetto == "Menù") {
            menu();
            return;

        } else if (risposta.progetto == "torna scelta posto") {
            database();

        }
    });
};

//permette di tornare al menu, ai comandi o al ciclo 
function opzioniCicli() {
    var option = [
        {
            type: "list",
            name: "progetto",
            message: "Scegli",
            choices: [
                "Menù",
                "Vai a schermata comandi",
                "Vai a schermata ciclo"
            ]
        }]; // stampa oggetto
    
    inquirer.prompt(option).then(function (risposta) {
        if (risposta.progetto == "Menù") {
            menu();
            return;
        } else if (risposta.progetto == "Vai a schermata comandi") {
            comandi();
        }
        else if (risposta.progetto == "Vai a schermata ciclo") {
            cicli();
        }
    })
};

//sposta il pezzo da posto operatore al primo posto libero
function pezzo_posto_libero(stoccaggio, urlPezzo) {
    console.log("Entrato nella funzione pezzo_posto_libero");
    for (var i in stoccaggio) {
        
        if (stoccaggio[i].stato.toUpperCase() == 'LIBERO') {
            console.log("Entrato nella funzione pezzo_posto_libero in if " + stoccaggio[i].stato + stoccaggio[i].posto);
            comandi_Navetta.MuoviPezzo('MP', 1, stoccaggio[i].posto);
            p = stoccaggio[i];
            var url = 'http://localhost:' + portapi + '/api/postiStoccaggio/' + p._id + '/stato';
            var put = { stato: 'OCCUPATO' };
            
            //requestify.put(url, { stato: 'OCCUPATO' }).then(function (response) {
            // Get the response body (JSON parsed or jQuery object for XMLs)
            // console.log('Posto di stoccaggio ' + p.posto + ' OCCUPATO');
            // return;
            //});
            ee.once('ricevutoExec', function () {
                modifica_database(url, put);    // modifica stato posto stoccaggio in occupato
                put = { posto: p.posto };
                console.log("urlPezzo in pezzo_posto_libero: " + urlPezzo);
                modifica_database(urlPezzo, put);
            })
            break;
		   
        }
    }
}

//modifica il database con il nuovo pezzo
function modifica_database(url, put) {
    console.log("Entrato in modifica_database");
    
    requestify.put(url, put).then(function (response) {
        // Get the response body (JSON parsed or jQuery object for XMLs)
        console.log("Messaggio da modifica_database: " + response.getBody().message);
      
    });
}

//spiegazione all'interno
//function timeout() {
//    /* Inizializzo un timeout, dopo 5 secondi senza ricevere risposta, verrà restituito un messaggio di fallimento
//    e all'utente sarà concesso di inserire nuovamente il comando */
//    timeOut = setTimeout(attendiServer, 5000, contaRichieste);
    
//    /* timeOut2 e timeOut3 riguardano i messaggi di 'exec' e 'ready', abbiamo inserito un tempo di 50000 ms, 
//    poichè è il tempo impiegato (incrementato di 10000 ms) dal braccio per eseguire lo spostamento massimo (testato fisicamente) */
//    timeOut2 = setTimeout(attendiExec, 50000, contaRichieste);
//    timeOut3 = setTimeout(attendiReady, 50000, contaRichieste);
//    console.log('invio..');
//    //contaRichieste++;
  
//}

//entra nel database e prende l id e il nome del pezzo da cancellare
function id_nome_pezzo_canc() {
    // Get the response body (JSON parsed or jQuery object for XMLs)
    var ids = [];
    var nome = [];
    requestify.get('http://localhost:' + portapi + '/api/pezzi').then(function (response) {
        for (var i in response.getBody()) {
            ids.push({ _id: response.getBody()[i]._id });
            nome.push({ name: response.getBody()[i].nome });
        }
        var pezziId = [
            {
                type: "list",
                message: "Scegli pezzo",
                name: "pezzi",
                choices: nome
            }];
        inquirer.prompt(pezziId).then(function (risposta) {
            
            
            var url = 'http://localhost:' + portapi + '/api/pezzi/'
            for (var i in nome) {
                if (risposta.pezzi == nome[i].name) {
                    url = url + ids[i]._id;
                    requestify.delete(url).then(function (response) {
                        console.log(response.getBody().message);
                        
                        opzioniMenu();
                    })
                }
            }
        })
    });
}

//dati da inserire per creare un pezzo da inserire
function dati_pezzo_nuovo() {
    var pezzo = {};
    var question = [{
            type: 'input',
            name: 'nome',
            message: 'nome del pezzo:'
        },
        {
            type: 'input',
            name: 'posto',
            message: 'posto del pezzo:'
        },
        {
            type: 'input',
            name: 'stato',
            message: 'stato del pezzo:'
        },
        {
            type: 'input',
            name: 'tLav',
            message: 'tempo di lavorazione del pezzo:'
        }, 
        {
            type: 'input',
            name: 'operazione',
            message: 'operazione da fare sul pezzo:'
        }];
    inquirer.prompt(question).then(function (risposta) {
        var url = 'http://localhost:' + portapi + '/api/pezzi/'
        var pezzo = {
            nome: risposta.nome,
            posto: risposta.posto,
            stato: risposta.stato.toUpperCase(),
            tLav: risposta.tLav,
            operazione: risposta.operazione
        }
        
        //chiamata per inserire il nuovo pezzo
        requestify.post(url, pezzo).then(function (response) {
            console.log(response.getBody().message);
            
            opzioniMenu();
        })
    });
}

//entra nel database e prende l id e il nome del pezzo che si vuole ottenere
function id_nome_pezzo_ott() {
    // Get the response body (JSON parsed or jQuery object for XMLs)
    var ids = [];
    var nome = [];
    requestify.get('http://localhost:' + portapi + '/api/pezzi').then(function (response) {
        for (var i in response.getBody()) {
            ids.push({ _id: response.getBody()[i]._id });
            nome.push({ name: response.getBody()[i].nome });
        }
        var pezziId = [
            {
                type: "list",
                message: "Scegli pezzo",
                name: "pezzi",
                choices: nome
            }];
        
        inquirer.prompt(pezziId).then(function (risposta) {
            
            var url = 'http://localhost:' + portapi + '/api/pezzi/'
            for (var i in nome) {
                if (risposta.pezzi == nome[i].name) {
                    url = url + ids[i]._id;
                    requestify.get(url).then(function (response) {
                        console.log(response.getBody());
                        
                        opzioniMenu();
                    })
                }
            }
        })
    })
}



//scelgo cosa voglio modificare del pezzo 
function scelta_modifica(risposta, ids, nome) {
    var url = 'http://localhost:' + portapi + '/api/pezzi/'
    for (var i in nome) {
        if (risposta.pezzi == nome[i].name) {
            url = url + ids[i]._id;
            var parte =
 [{
                    type: "list",
                    message: "Scegli parte",
                    name: "parte",
                    choices: [
                        {
                            name: "nome",
                        },
                        {
                            name: "posto"
                        },
                        {
                            name: "stato"
                        },
                        {
                            name: "tLav"
                        },
                        {
                            name: "operazione"
                        }
                    ]
                }];
            inquirer.prompt(parte).then(function (risposta) {
                
                //modifico nome
                if (risposta.parte == 'nome') {
                    url += '/nome';
                    var question = [{
                            type: 'input',
                            name: 'nome',
                            message: 'nome del pezzo:'
                        }]
                    inquirer.prompt(question).then(function (risposta) {
                        requestify.put(url, { nome: risposta.nome }).then(function (response) {
                            console.log(response.getBody().message);
                            
                            opzioniMenu();
                        })
                    });
                } else if (risposta.parte == 'posto') {  //modifico posto
                    
                    url += '/posto';
                    var question = [{
                            type: 'input',
                            name: 'posto',
                            message: 'posto del pezzo:'
                        }]
                    inquirer.prompt(question).then(function (risposta) {
                        requestify.put(url, { posto: risposta.posto }).then(function (response) {
                            console.log(response.getBody().message);
                            
                            opzioniMenu();
                        })
                    });
                } else if (risposta.parte == 'stato') {      //modifico stato
                    
                    url += '/stato';
                    var question = [{
                            type: 'input',
                            name: 'stato',
                            message: 'stato del pezzo:'
                        }]
                    inquirer.prompt(question).then(function (risposta) {
                        requestify.put(url, { stato: risposta.stato.toUpperCase() }).then(function (response) {
                            console.log(response.getBody().message);
                            
                            opzioniMenu();
                        })
                    });
                } else if (risposta.parte == 'tLav') {         //modifico tLav
                    
                    url += '/tLav';
                    var question = [{
                            type: 'input',
                            name: 'tLav',
                            message: 'tempo di lavorazione del pezzo:'
                        }]
                    inquirer.prompt(question).then(function (risposta) {
                        requestify.put(url, { tLav: risposta.tLav }).then(function (response) {
                            console.log(response.getBody().message);
                            
                            opzioniMenu();
                        })
                    });
                } else if (risposta.parte == 'operazione') {           //modifico operazione
                    
                    url += '/operazione';
                    var question = [{
                            type: 'input',
                            name: 'operazione',
                            message: 'operazione da fare sul pezzo:'
                        }]
                    inquirer.prompt(question).then(function (risposta) {
                        requestify.put(url, { operazione: risposta.operazione }).then(function (response) {
                            console.log(response.getBody().message);
                            
                            opzioniMenu();
                        })
                    });
                } else {
                    console.log('ERRORE!');
                    
                    opzioniMenu();
                }
            });
        }
    }
}
/* function menuComandi() {
    var option =
 [{
            type: "list",
            message: "Scegli menù",
            name: "menu",
            choices: [
                {
                    name: "Esegui un altro comando",
                },
                {
                    name: "Vai al menù principale"
                }
            ]
        }];
    inquirer.prompt(option).then(function (risposta) {
        //modifico nome
        if (risposta.menu == "Esegui un altro comando") {
            comandi();
        }
        else if (risposta.menu == "Vai al menù principale") {
            menu();
        }
    })
} */
function menuCicli() {
    var option =
 [{
            type: "list",
            message: "Scegli menù",
            name: "menu",
            choices: [
                {
                    name: "Esegui un altro ciclo",
                },
                {
                    name: "Vai al menù principale"
                }
            ]
        }];
    inquirer.prompt(option).then(function (risposta) {
        //modifico nome
        if (risposta.menu == "Esegui un altro ciclo") {
            cicli();
        }
        else if (risposta.menu == "Vai al menù principale") {
            menu();
            return;
        }
    })
};