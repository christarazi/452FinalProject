var errorField = $("#error");
var greetingBox = $("#greeting");
var chatMessage = $("#chatMessage");
var chatBox = $("#chat");
var setBtn = $("#setUserName");
var secretKey = $("#secretKey")
var sendBtn = $("#sendMessage");
var username = $("span.current-name")[0].innerHTML;
var socket = io();

// Bind the enter (return) key press event to click the send button.
chatMessage.bind("keypress", function (e) {
	if (e.keyCode === 13 && document.activeElement === $("#chatMessage")[0]) {
		sendBtn.click();
	}
});

// Respond to receiving a new message on the chat.
socket.on("newChatMessage", function(data) {

	// This is for color coding where the messages are coming from.
	var colorClass;
	if (data.from === username)
		colorClass = "current-name";
	else
		colorClass = "names-others";

	// Decrypt the message received from the server with the secret key provided by the user.
	var bytes = CryptoJS.AES.decrypt(data.message, secretKey.val(), 
		{ mode: CryptoJS.mode.CTR, padding: CryptoJS.pad.Pkcs7 });
	var decrypted = bytes.toString(CryptoJS.enc.Utf8);

	// If the decrypted message is empty that means the user has the wrong secret key.
	if (decrypted === "") {
		errorField.html("Warning: received chat message but it was empty. Your secret key may not match");
		return;
	}
	else {
		errorField.html("");
	}

	// *** TODO: Prevent XSS below by encoding `decrypt` to strip any tags. ***

	// Represents an element that contains all the data inside a chat message.
	var elem = "<div>" + 
					"<b><span class = '" + colorClass + "'>" + data.from +  " </span></b>" + 
					"<span style='color:gray;'>" + data.time + "</span>" + 
					"<br>" + 
					"<div>" + decrypted + "</div>" +  
			   "</div>";

	chatBox.append(elem);
});

// Send over the chat message to the server.
sendBtn.click(function() {

	// Represents the data we will send to the server.
	var data = {};

	if (username.length !== 0) {
		if (chatMessage.val().length !== 0) {

			// Set a max limit on the chat message length.
			if (chatMessage.val().length > 1000) {
				errorField.html("Message too big, please keep it below 1000 characters");
				return;
			}

			// Prevent XSS by filtering the user input.
			var cleanMsg = xssFilters.inHTMLData(chatMessage.val());

			// Get a time-stamp of the chat message.
			var d = new Date();
			var dateString = d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds() + 
				" " + d.getDate() + "/" + d.getMonth() + "/" + d.getFullYear();		

			// Encrypt the chat message with the secret key provided by the user.
			var ciphertext = CryptoJS.AES.encrypt(cleanMsg, secretKey.val(), 
				{ mode: CryptoJS.mode.CTR, padding: CryptoJS.pad.Pkcs7 }).toString();

			data.message = ciphertext;
			data.from = username;
			data.time = dateString;

			// Send the data to the server.
			socket.emit("sendChatMessage", data);
			errorField.html("");
			chatMessage.val("");
		}
	} else {
		errorField.html("Please register for an account first.");
	}
});

