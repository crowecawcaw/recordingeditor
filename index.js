var $ = require('jquery')
var WaveformPlaylist = require('waveform-playlist')

var playlist = WaveformPlaylist.init({
  samplesPerPixel: 9000,
  zoomLevels: [1000, 5000, 9000],
  waveHeight: 100,
  container: document.getElementById("playlist"),
  timescale: true,
  state: 'cursor',
  colors: {
    waveOutlineColor: '#E0EFF1',
    timeColor: 'grey',
    fadeColor: 'black'
  },
  controls: {
    show: false //whether or not to include the track controls
  }
});

window.playlist = playlist
var ee = playlist.getEventEmitter();

var $container = $("body");
var downloadUrl = undefined;

function toggleActive(node) {
  var active = node.parentNode.querySelectorAll('.active');
  var i = 0, len = active.length;

  for (; i < len; i++) {
    active[i].classList.remove('active');
  }

  node.classList.toggle('active');
}
function minmax(arr) {
  var max = -Infinity, min = Infinity
  for(var i = arr.length - 1; i >= 0; i--){
    if(arr[i] > max)
      max = arr[i]
    if(arr[i] < min)
      min = arr[i]
  }
  return max
    
}
$container.on("click", ".btn-agc", function() {
  var track = playlist.tracks[0]
  var buffer = track.buffer
  var numBuffers = buffer.numberOfChannels
  track.originalBuffer = buffer
  var datas = []
  for(var i = 0; i < numBuffers; i++)
    datas[i] = buffer.getChannelData(i)

  var nextMax = minmax(datas.map(data => minmax(data.slice(0, i + 5*44100))))
  var currentGain = 1 / nextMax
  var deltaGain = 0
  var nextIndex = 0

  for(var i = 0; i < buffer.length; i++){
    if(i == nextIndex){
      nextMax = minmax(datas.map(data => minmax(data.slice(i + 5*44100, i + 10*44100))))
      if(nextMax > 0) {
        var nextGain = 1 / nextMax
        deltaGain = (nextGain - currentGain) / (5*44100)
        nextIndex = i + 5*44100
        console.log(Math.floor(100*i/buffer.length), nextMax)
      }
    }
    currentGain += deltaGain
    for(var j = 0; j < numBuffers; j++)
      datas[j][i] *= currentGain
  }

  track.buffer = track.originalBuffer
  ee.emit("zoomin")
  ee.emit("zoomout")
  /*  var peaks = playlist.tracks[0].peaks.data[0]
  var length = peaks.length
  var width = 10 * playlist.sampleRate / 256 //10 seconds, 256 samples per peak
  var widthHalf = Math.floor((width - 1) / 2)
  var maxPeaks = []
  for(var i = 0; i < length; i++){
    var slice = peaks.slice( i-widthHalf>=0 ? i-widthHalf : 0, i+widthHalf<length ? i+widthHalf : length-1)
    maxPeaks[i] = Math.max.apply(null, slice)
  }
  var smoothPeaks = []
  for(var i = 0; i < length; i++){
    var slice = maxPeaks.slice( i-widthHalf>=0 ? i-widthHalf : 0, i+widthHalf<length ? i+widthHalf : length-1)
    var sum = 0
    for(var i = 0; i < slice.length; i++)
      sum += slice[i]
    smoothPeaks[i] = sum / slice.length
  }
  playlist.tracks[0].peaks.data[0] = smoothPeaks
  console.log(playlist, peaks, maxPeaks, smoothPeaks)*/
})

$container.on("click", ".btn-play", function() {
  ee.emit("play");
});
  

$container.on("click", ".btn-pause", function() {
  ee.emit("pause");
});

$container.on("click", ".btn-set-start", function() {
  playlist.tracks[0].cueIn = playlist.cursor
  playlist.tracks[0].start = 0
  playlist.tracks[0].end = playlist.tracks[0].cueOut - playlist.tracks[0].cueIn
  playlist.duration = playlist.tracks[0].end
  ee.emit("select", 0, 0)
  ee.emit("zoomin")
  ee.emit("zoomout")
});

$container.on("click", ".btn-set-end", function() {
  playlist.tracks[0].cueOut = playlist.cursor + playlist.tracks[0].cueIn
  playlist.tracks[0].start = 0
  playlist.tracks[0].end = playlist.tracks[0].cueOut - playlist.tracks[0].cueIn
  playlist.duration = playlist.tracks[0].end
  ee.emit("zoomin")
  ee.emit("zoomout")
});

$container.on("click", ".btn-toggle-fade", function() {
  if(playlist.tracks[0].fadeIn && playlist.tracks[0].fadeOut) {
    delete playlist.tracks[0].fadeIn
    delete playlist.tracks[0].fadeOut
  } else {
    playlist.tracks[0].setFadeIn(1)
    playlist.tracks[0].setFadeOut(1)    
  }
    
  ee.emit("zoomin")
  ee.emit("zoomout")
})


//track interaction states

$container.on("click", ".btn-select", function() {
  ee.emit("statechange", "select");
  toggleActive(this);
});


//zoom buttons
$container.on("click", ".btn-zoom-in", function() {
  ee.emit("zoomin");
});

$container.on("click", ".btn-zoom-out", function() {
  ee.emit("zoomout");
});

$container.on("click", ".btn-download", function () {
  ee.emit('startaudiorendering', 'wav');
});

//track drop
$container.on("dragenter", ".track-drop", function(e) {
  e.preventDefault();
  e.target.classList.add("drag-enter");
});

$container.on("dragover", ".track-drop", function(e) {
  e.preventDefault();
});

$container.on("dragleave", ".track-drop", function(e) {
  e.preventDefault();
  e.target.classList.remove("drag-enter");
});

$container.on("drop", ".track-drop", function(e) {
  e.preventDefault();
  e.target.classList.remove("drag-enter");
  $('.track-drop').css('display', 'none')
  $('.controls').css('display', 'block')

  var dropEvent = e.originalEvent;
  for (var i = 0; i < dropEvent.dataTransfer.files.length; i++) {
    ee.emit("newtrack", dropEvent.dataTransfer.files[i]);
  }
});

function displayLoadingData(data) {
  var info = $("<div/>").append(data);
  $(".loading-data").append(info);
}

function displayDownloadLink(link) {
  var dateString = (new Date()).toISOString();
  var $link = $("<a/>", {
    'href': link,
    'download': 'waveformplaylist' + dateString + '.wav',
    'text': 'Download mix ' + dateString,
    'class': 'btn btn-small btn-download-link'
  });

  $('.btn-download-link').remove();
  $('.btn-download').after($link);
}


/*
* Code below receives updates from the playlist.
*/

var audioStates = ["uninitialized", "loading", "decoding", "finished"];

ee.on("audiorequeststatechange", function(state, src) {
  var name = src;

  if (src instanceof File) {
    name = src.name;
  }

  displayLoadingData("Track " + name + " is in state " + audioStates[state]);
});

ee.on("loadprogress", function(percent, src) {
  var name = src;

  if (src instanceof File) {
    name = src.name;
  }

  displayLoadingData("Track " + name + " has loaded " + percent + "%");
});

ee.on('audiorenderingfinished', function (type, data) {
  if (type == 'wav'){
    if (downloadUrl) {
      window.URL.revokeObjectURL(downloadUrl);
    }

    downloadUrl = window.URL.createObjectURL(data);
    displayDownloadLink(downloadUrl);
  }
});

ee.on('finished', function () {
  console.log("The cursor has reached the end of the selection !");
});
