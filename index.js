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

pendingTextsRef.on('child_added', function(snapshot) {
  console.log('child added');
  var text = snapshot.val();
  console.log(text);
  console.log(snapshot.key);
  snapshot.ref.remove();
  
  twilioClient.messages.create({
    body: text.name + ', I am available to see you now. '+
        'Please come to my office so we can discuss: "' + text.topic + '"',
    to: text.phone,  // Text this number
    from: process.env.TWILIO_PHONE // From a valid Twilio number
  }, function(err, message) {
      if(err) {
        console.log(err.message);
        processedTextsRef.child(snapshot.key).set({
            text: text, 
            isSent: false, 
            error: err, 
            message: message,
        });
      }else{
        processedTextsRef.child(snapshot.key).set({
            text: text, 
            isSent: true, 
            error: null, 
            message: message,
        });
      }
  });
});

var pendingEmailsRef = rootRef.child('emails').child('pending');
var processedEmailsRef = rootRef.child('emails').child('processed');

pendingEmailsRef.on('child_added', function(snapshot) {
  console.log('child added');
  var email = snapshot.val();
  console.log(email);
  console.log(snapshot.key);
  snapshot.ref.remove();
  
  email.from = '<postmaster@'+process.env.MAILGUN_DOMAIN+'>';
  email.subject = 

  mailgunClient.messages().send(
    {
        from: '<postmaster@'+process.env.MAILGUN_DOMAIN+'>',
        to: email.address,
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
            .set(processedEmail);
    }
  );
});

/*
mailgunClient.messages().send(
{
    from: '<postmaster@'+process.env.MAILGUN_DOMAIN+'>',
    to: 'alex.aralis@gmail.com',
    subject: 'Mutant Hours Registration',
    text: 'You have been registered to the Mutant Hours Service with this email address.',
},
function(error, body){
    console.log(body);
    if(error){
        console.log(error);
    }
}
);
*/

/*
server.listen(3030, function() {
  console.log('listening on http://localhost:3030');
});
*/
