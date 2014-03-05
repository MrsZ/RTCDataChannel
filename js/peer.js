'use strict';

// STUN Servers. There is no TURN in this example.
var server = {
  iceServers: [
    {url: "stun:23.21.150.121"},
    {url: "stun:stun.l.google.com:19302"}
  ]
};

var options = {
  optional: [
    // It's required for Chrome and Firefox to interoperate.
    {DtlsSrtpKeyAgreement: true}, 
    // It's required if we want to make use of the DataChannels API on Firefox.
    {RtpDataChannels: true}
  ]
};

// Cross-browser compatibility
var PeerConnection = window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
var IceCandidate = window.mozRTCIceCandidate || window.RTCIceCandidate;
var SessionDescription = window.mozRTCSessionDescription || window.RTCSessionDescription;
navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia;

// Peer is the object which wrap the WebRTC functionality
// Currently we accept only in options 'datachannel', but more 
// streams will be added.
// As we are 'emulating' as well the network communcation for
// signaling, we have 'onICE' method for handling it.

var Peer = function(isOfferer, options, onICE) {
  this.peer = new PeerConnection(server, options);
  // Is an offerer?
  this.isOfferer = !!isOfferer;

  this.peer.onicecandidate = function(e) {
    onICE.bind(this, e.candidate);
  };
  // Do we need to set a Data channel?
  if (options && options.datachannel && options.datachannel.enabled) {
    if (isOfferer) {
      var localChannel = this.peer.createDataChannel(options.datachannel.name || '', {});
      localChannel.onopen = function() {
        debug && console.log('*** Local channel is opened ***');
        options.datachannel.onChannel = options.datachannel.onChannel || function() {};
        options.datachannel.onChannel(localChannel);
      };

      localChannel.onclose = function() {
        debug && console.log('*** Local channel is closed ***');
      };

      localChannel.onmessage = options.datachannel.onMessage || function() {};
    } else {
      this.peer.ondatachannel = function(event) {
        var remoteChannel = event.channel;
        remoteChannel.onmessage = options.datachannel.onMessage || function() {};
        remoteChannel.onopen = function() {
          debug && console.log('*** Remote channel is opened ***');
        };
        remoteChannel.onclose = function() {
          debug && console.log('*** Remote channel is closed ***');
        };
      };
    }
  }
};

// SDP (Session Description Protocol) is metadata that describes to the other 
// peer the format to expect (video, formats, codecs, encryption, resolution, size, etc).

// An exchange requires an offer from a peer, then the other peer must receive the offer 
// and provide back an answer.

Peer.prototype.getSDP = function(onSDP) {
  if (typeof onSDP !== 'function') {
    console.error('onSDP is *not* a function');
    return;
  }
  if (this.isOfferer) {
    // Create the offer
    this.peer.createOffer(
      function onSuccess(sdp) {
        onSDP(sdp);
      }.bind(this),
      function onError() {
        console.error('createOffer error');
      },
      {
        mandatory: {
          OfferToReceiveAudio: true,
          OfferToReceiveVideo: true
        }
      }
    );
  } else {
    this.peer.createAnswer(
      function onSuccess(sdp) {
        onSDP(sdp);
      },
      function onError() {
        console.error('createAnswer error')
      }, 
      {
        mandatory: {
          OfferToReceiveAudio: true,
          OfferToReceiveVideo: true
        }
      }
    );
  }
};

Peer.prototype.setLocalSDP = function(sdp) {
  this.peer.setLocalDescription(sdp);
};

Peer.prototype.setRemoteSDP = function(sdp) {
  var sesion = new SessionDescription(sdp)
  this.peer.setRemoteDescription(sesion);
};

Peer.prototype.setRemoteICE = function (iceRaw) {
  var ice = new IceCandidate(iceRaw);
  this.peer.addIceCandidate(ice);
}