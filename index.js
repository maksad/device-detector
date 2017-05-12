var express = require('express');
var logger = require('morgan');
var parser = require('ua-parser-js');
var _ = require('underscore');
var pug = require('pug');
var Busboy = require('busboy');

var port = process.env.PORT || 3500;
var app = express();

app.use(logger());
app.set('views', __dirname + '/views');
app.set('view engine', 'pug');

app.get('/', function (req, res) {
  res.render('post-user-agent-list')
})

app.post('/', (request, response) => {
  var busboy = new Busboy({ headers: request.headers });
  var uaData = [];

  busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
    file.on('data', function(data) {
      uaData.push(...data.toString().split(/\n/));
    });
  });

  busboy.on('finish', function() {
    var devices = [];
    for (var ua of uaData) {
      devices.push(getDeviceObject(ua));
    }
    devices = mergeItems(devices);
    response.render('index', { devices: getTop10(devices) });
  });
  request.pipe(busboy);
});


function getDeviceObject(ua) {
  var parsedUa = parser(ua);
  var device = {
    model: getComposedModelName(parsedUa.device),
    type: parsedUa.device.type ? parsedUa.device.type : 'Unknown',
    os: parsedUa.os.name
  };
  if (!device.model) {
    device.model = getPossibleDeviceName(ua);
  }
  return device;
}

function getPossibleDeviceName(ua) {
  // ua-parser-js does not recognize Honor devices
  if (ua.toLowerCase().includes('honor')) {
    return ua.split(' ')
      .filter((uaString) => {
        return uaString.toLowerCase().includes('honor')
      })[0];
  } else if (ua.toLowerCase().includes('python')) {
    return 'python-requests';
  }
  return 'Unknown';
}

function mergeItems(devices) {
  var groupByOsModel = _.groupBy(devices, (value) => {return value.model + '#' + value.os})
  return _.map(groupByOsModel, items => (items[0].count = items.length, items[0]))
}

function getTop10(items) {
  return _.sortBy(items, 'count')
    .reverse();
}

function getComposedModelName(device) {
  var name = '';
  if (device.model) {
    name += device.model;
  }

  if (device.vendor) {
    name += '_' + device.vendor;
  }

  return name.trim().split('_').join(', ');
}

app.listen(port)
