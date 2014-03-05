'use strict';

var debug = true;

(function(exports) {
  var _input = document.getElementById('dataChannelSend');
  var _output = document.getElementById('dataChannelReceive');
  var _sendButton = document.getElementById('sendButton');

  var localPeer, remotePeer;
  var localChannel;

  function _onMessageCB(message) {
    _output.value = message || '';
  }

  function _sendMessageHandler() {
    var message = _input.value || '';
    localChannel.send(message);
    _input.value = '';
  }


  function _sendThroughServerSDP(localSDP, onAnswer) {
    if (typeof onAnswer !== 'function') {
      console.error('onAnswer is not a function');
    }
    // console.log('Hemos recibido ' + localSDP);
    // var sdp = JSON.parse(localSDP);
    var sdp = JSON.parse(localSDP);
    remotePeer.setRemoteSDP(sdp);
    remotePeer.getSDP(function onRemoteSDP(remoteSDP) {
      remotePeer.setLocalSDP(remoteSDP);
      onAnswer(remoteSDP);
    });
  }

  var App = {
    init: function() {
      // Add listeners
      _sendButton.addEventListener('click', _sendMessageHandler);
      
      // Create both peers. One is the local (the offerer, that's why
      // the param is 'true'), one is the answerer (that's why the param
      // is false).
      localPeer = new Peer(
        true, 
        {
          datachannel: {
            enabled: true,
            name: 'foochannel',
            onMessage: function(e) {
              // TODO Implement if needed
            },
            onChannel: function(channel) {
              localChannel = channel;
            }
          }
        },
        // After creating the PeerConnection and passing in the available STUN and TURN servers,
        // an event will be fired once the ICE framework has found some “candidates” that will
        // allow you to connect with a peer. This is known as an ICE Candidate and will execute
        // a callback function on PeerConnection#onicecandidate.
        function onLocalIce(ice) {
          remotePeer.setRemoteICE(ice);
        }
      );

      remotePeer = new Peer(
        false, 
        {
          datachannel: {
            enabled: true,
            name: 'foochannel',
            onMessage: function(e) {
              _output.value = e.data;
            }
          }
        },
        function onRemoteIce(ice) {
          localPeer.setRemoteICE(ice);
        }
      );

      // As local peer, we need to retrieve the SDP for sending it to
      // the remote peer
      localPeer.getSDP(function(sdp) {
        // Once we get the SDP, we set this info in our peer
        // object and send to the remote peer. 
        localPeer.setLocalSDP(sdp);
        // Send the SDP to remote Peer. This is a 'mock' which emulate
        // how it works. Signaling is not specified in WebRTC (this could
        // be whatever you want to implement, it's only a way to send the
        // info from one to another)

        // We stringify to emulate that we are sending through Internet
        _sendThroughServerSDP(JSON.stringify(sdp), function onAnswer(remoteSDP) {
          // Once we get an answer from the remote, we set as remote SDP
          localPeer.setRemoteSDP(remoteSDP);
          debug && console.log('*** SDP exchanged properly ***');
        });
      });
    }
  };

  exports.App = App;
}(this));

window.onload = function() {
  App.init();
};