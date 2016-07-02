// Create references for libraries
require('dotenv').load();
var express = require('express');
var http = require('http');
var firebase = require('firebase');
var twilio = require('twilio');

//mailgun setup
var mailgun = require('mailgun-js');
var mailgunClient = mailgun(
    {
        apiKey: process.env.MAILGUN_KEY, 
        domain: process.env.MAILGUN_DOMAIN,
    }
);

// Express server setup
var app = express();
var server = http.createServer(app);

// Authenticate with firebase
firebase.initializeApp({
  serviceAccount: "firebase-credentials.json",
  databaseURL: "https://mutant-hours-4ea44.firebaseio.com"
});
var rootRef = firebase.database().ref();

// Authenticate with twilio
var twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

// Listen for new texts being added
var pendingTextsRef = rootRef.child('texts').child('pending');
var processedTextsRef = rootRef.child('texts').child('processed');
var usersRef = rootRef.child('users');

pendingTextsRef.on('child_added', function(snapshot) {
  var text = snapshot.val();
  var infoRef = usersRef.child(text.senderUid).child('info');
  console.log('child added');
  console.log(text);
  console.log(snapshot.key);
  
  infoRef.on('value', function(infoSnapshot){
    console.log(infoSnapshot.val());
    var info = infoSnapshot.val();

	  twilioClient.messages.create({
	    body: 'Hello ' + text.name + ', \nProfessor '+info.displayName+' is available to see you now. '+
		'Please go to their office to discuss: "' + text.topic + '" \n'+
		'If you would like to reschedule email Professor '+info.displayName+' at <'+info.email+'>.',
	    to: text.phone,  // Text this number
	    from: process.env.TWILIO_PHONE // From a valid Twilio number
	  }, function(err, message) {
	      var processedText = {
		text:text,
	      };
	      if(err) {
		console.log(err.message);
		console.log(message);
		processedText.isSent = false;
		processedText.error = err;
	      }else{
		processedText.isSent = true;
		processedText.message = message;
	      }

	      processedTextsRef.child(snapshot.key)
		.set(processedText)
		.then(function(){
		  snapshot.ref.remove();
		});
	  });
  });
});

/*
var pendingEmailsRef = rootRef.child('emails').child('pending');
var processedEmailsRef = rootRef.child('emails').child('processed');

pendingEmailsRef.on('child_added', function(snapshot) {
  console.log('child added');
  var pendingInfo = snapshot.val();
  console.log(pendingInfo);
  console.log(snapshot.key);
  
  mailgunClient.messages().send(
    {
        from: '<postmaster@'+process.env.MAILGUN_DOMAIN+'>',
        to: pendingInfo.address,
        subject: 'Mutant Hours Registration',
        text: 'You have been registered to the Mutant Hours Service with this email address.',
    },
    function(error, body){
        var processedEmail = {
            email: email,
            body: body,
            error: error,
            isSent: null,
        };

        if(error){
            console.log(error);
            processedEmail.isSent = false;
            
        }else{
            console.log(body);
            processedEmail.isSent = true;
        }

        processedEmailsRef
            .child(snapshot.key)
            .set(processedEmail)
            .then(function(){
                snapshot.ref.remove();
            });
    }
  );
});

*/

/*
server.listen(3030, function() {
  console.log('listening on http://localhost:3030');
});
*/
