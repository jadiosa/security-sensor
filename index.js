var five = require('johnny-five');
var twilio = require('twilio');
var init = false;
var trips = 0;
var ultraSensor ;
var ultraBaseline;
var ultraReadings = [];
var ultraThreshold = 10;
var ultraTriggered = false;

var photosensor;
var photoReading;
var photoThreshold = 100;
var photoTriggered = false;

var board = new five.Board();
var client = twilio('ACecffcadb4c0d69a1b51b00bf42341d5a', '33a778f57515d3ef01cb5c25a70d9609');

var lastSMS = 0;
var rateLimit = 10000;

var status;

board.on('ready', function() {

	var proximity = new five.Proximity({
	    controller: "HCSR04",
	    pin: 11
  	});

  	status = new five.Led.RGB({
  		pins:{
  			red: 6,
  			green: 5,
  			blue: 3
  		}
  	});

	proximity.on('change', ultraChange);
	proximity.on('data', ultraData);

	//photosensor = five.Sensor("A5");
	//photosensor.on('data', photoData);

	status.color("#0000FF");

});

function ultraChange(){

	if(!init){
		return;
	}

	var cm = this.cm;
	
	if(Math.abs(cm - ultraBaseline) > ultraThreshold){
		if(!ultraTriggered){
			trigger('Cyprus 801');
			return ultraTriggered = true;
		}
	}
	ultraTriggered = false;
	status.color("#0000FF");
}

function ultraData() {

	var cm = this.cm;

	if(ultraReadings.length > 10){
		ultraReadings.shift();
		if (!init){
			ultraBaseline = ultraReadings.sort()[4];
			console.log('Calculate baseline: %s', ultraBaseline)
		}
		init = true;
	}
	ultraReadings.push(cm);
}

function trigger(sensor) {
	
	status.color("#FF0000");

	var now = Date.now();

	if(now - rateLimit < lastSMS){
		return console.log('> Ratelimiting');
	}

	console.log('* Alarm  has been triggered (%s) [%s]', sensor, trips);
	++trips;
	lastSMS = now;

	//sendSMS(sensor);
}

function photoData(){
	var data = this.value;
	if(Math.abs(data - photoReading) > photoThreshold){
		if(!photoTriggered){
			trigger('laser');
		}
		photoTriggered = true ;
		return;
	}
	photoTriggered = false;
	photoReading = data;
}

function sendSMS(sensor){
	client.messages.create({
		body: 'Alarm has been trigered ' + sensor,
		to: '+573168120372',
		from: '+12017780805' 
	}, function smsResults(err, msg){
		if (err){
			console.log('*** Error ***\n', err);
			return;
		}
		if(!msg.errorCode){
			console.log('> Success');
		} else {
			console.log('> Problem: %s', msg.errorCode);
		}
	});
	console.log('Sending SMS');
}